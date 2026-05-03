import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join } from 'path'
import { readdirSync } from 'fs'
import { readFile, unlink } from 'fs/promises'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { tmpdir } from 'os'
import { is } from '@electron-toolkit/utils'

const execFileAsync = promisify(execFile)
const isMac = process.platform === 'darwin'

// Must be called before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'local-file',
    privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true }
  }
])

function createWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: isMac ? 'hiddenInset' : 'hidden',
    backgroundColor: '#0c0c0e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => { win.show() })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  if (is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return win
}

// ── MIME types for standard image formats ──────────────────────────────────────

const MIME: Record<string, string> = {
  jpg: 'image/jpeg', jpeg: 'image/jpeg',
  png: 'image/png', gif: 'image/gif',
  webp: 'image/webp', tif: 'image/tiff', tiff: 'image/tiff',
}

// ── JPEG memory cache ─────────────────────────────────────────────────────────
// Avoids re-reading the same file from disk on every request (preload + display
// both hit the same path). 20 entries ≈ up to ~400 MB for typical camera JPEGs.

const JPEG_CACHE = new Map<string, Buffer>()
const JPEG_CACHE_MAX = 20

async function getJpegBuffer(filePath: string): Promise<Buffer> {
  const cached = JPEG_CACHE.get(filePath)
  if (cached) return cached
  const buf = await readFile(filePath)
  if (JPEG_CACHE.size >= JPEG_CACHE_MAX) {
    JPEG_CACHE.delete(JPEG_CACHE.keys().next().value as string)
  }
  JPEG_CACHE.set(filePath, buf)
  return buf
}

// ── RAW format support ─────────────────────────────────────────────────────────

const RAW_EXTENSIONS = new Set([
  'cr2', 'cr3',           // Canon
  'nef', 'nrw',           // Nikon
  'arw', 'srf', 'sr2',   // Sony
  'raf',                  // Fujifilm
  'rwl', 'raw',           // Leica
  '3fr', 'fff',           // Hasselblad
  'rw2',                  // Lumix / Panasonic
  'pef', 'ptx',           // Ricoh / Pentax
  'orf',                  // Olympus / OM System
  'srw',                  // Samsung
  'iiq',                  // Phase One
  'dng',                  // Adobe DNG (universal — Leica Q, Ricoh GR, etc.)
  'x3f',                  // Sigma
  'erf',                  // Epson
  'mef',                  // Mamiya
  'mos',                  // Leaf / Capture One
])

// LRU cache — max 40 converted JPEGs (~60–120 MB RAM)
const RAW_CACHE = new Map<string, Buffer>()
const RAW_CACHE_MAX = 40

function rawCacheSet(key: string, val: Buffer): void {
  if (RAW_CACHE.size >= RAW_CACHE_MAX) {
    // Evict oldest entry (Maps preserve insertion order)
    RAW_CACHE.delete(RAW_CACHE.keys().next().value as string)
  }
  RAW_CACHE.set(key, val)
}

// Concurrency limiter — max 2 simultaneous sips processes
let activeConversions = 0
const MAX_CONCURRENT = 2
const conversionQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeConversions < MAX_CONCURRENT) {
    activeConversions++
    return Promise.resolve()
  }
  return new Promise<void>(resolve => conversionQueue.push(resolve))
}

function releaseSlot(): void {
  const next = conversionQueue.shift()
  if (next) { next() } else { activeConversions-- }
}

// In-flight conversion promises — multiple requests for the same file share one conversion
const rawInFlight = new Map<string, Promise<Buffer>>()

async function convertRawWithSips(filePath: string): Promise<Buffer> {
  const tmpPath = join(tmpdir(), `quickd-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`)
  try {
    // -Z 2560: resize longest edge to 2560px during decode (shrink-on-load = much faster)
    // -s formatOptions 88: JPEG quality 88
    await execFileAsync('/usr/bin/sips', [
      '-s', 'format', 'jpeg',
      '-s', 'formatOptions', '88',
      '-Z', '2560',
      filePath,
      '--out', tmpPath,
    ])
    return await readFile(tmpPath)
  } finally {
    unlink(tmpPath).catch(() => {})
  }
}

async function getOrConvertRaw(filePath: string): Promise<Buffer> {
  // 1. Completed cache hit
  const cached = RAW_CACHE.get(filePath)
  if (cached) return cached

  // 2. Conversion already in-flight — share the promise
  const pending = rawInFlight.get(filePath)
  if (pending) return pending

  // 3. Start a new conversion
  const promise = (async (): Promise<Buffer> => {
    await acquireSlot()
    try {
      // Re-check cache after acquiring slot (another request may have finished)
      const cached2 = RAW_CACHE.get(filePath)
      if (cached2) return cached2
      const buffer = await convertRawWithSips(filePath)
      rawCacheSet(filePath, buffer)
      return buffer
    } finally {
      releaseSlot()
      rawInFlight.delete(filePath)
    }
  })()

  rawInFlight.set(filePath, promise)
  return promise
}

// ── App bootstrap ──────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  protocol.handle('local-file', async (request) => {
    const url = new URL(request.url)
    const filePath = url.searchParams.get('p') ?? ''
    const ext = filePath.split('.').pop()?.toLowerCase() ?? ''

    // RAW file — convert with sips (macOS only)
    if (RAW_EXTENSIONS.has(ext)) {
      if (!isMac) {
        return new Response('RAW conversion requires macOS (sips not available on this platform)', { status: 415 })
      }
      try {
        const buffer = await getOrConvertRaw(filePath)
        return new Response(buffer, {
          status: 200,
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'no-store' },
        })
      } catch (e) {
        console.error('[local-file] RAW conversion failed:', filePath, e)
        return new Response('Conversion failed', { status: 500 })
      }
    }

    // Standard image file — serve from memory cache so preload and
    // display requests for the same file return instantly on second hit
    const mimeType = MIME[ext] ?? 'application/octet-stream'
    try {
      const data = await getJpegBuffer(filePath)
      return new Response(data, {
        status: 200,
        headers: { 'Content-Type': mimeType, 'Cache-Control': 'max-age=31536000, immutable' },
      })
    } catch (e) {
      console.error('[local-file] cannot read:', filePath, e)
      return new Response('Not found', { status: 404 })
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => { app.quit() })

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('shell:open-external', (_event, url: string) => {
  shell.openExternal(url)
})

ipcMain.handle('dialog:select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select folder with images',
    buttonLabel: 'Select Folder'
  })
  return canceled ? null : filePaths[0]
})

ipcMain.handle('fs:get-images', async (_event, folderPath: string) => {
  try {
    const entries = readdirSync(folderPath)
    const paths = entries
      .filter((name) =>
        /\.(jpg|jpeg|cr2|cr3|nef|nrw|arw|srf|sr2|raf|rwl|raw|3fr|fff|rw2|pef|ptx|orf|srw|iiq|dng|x3f|erf|mef|mos)$/i.test(name)
      )
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((name) => join(folderPath, name))

    // Background-warm the first 12 JPEG images while the user sees the
    // transition animation — by the time they reach image 0 everything
    // is already in the memory cache
    const WARMUP = 12
    const jpegExts = new Set(['jpg', 'jpeg'])
    const toWarm = paths
      .filter(p => jpegExts.has(p.split('.').pop()?.toLowerCase() ?? ''))
      .slice(0, WARMUP)
    // Fire-and-forget — don't block the IPC response
    Promise.all(toWarm.map(p => getJpegBuffer(p))).catch(() => {})

    return paths
  } catch {
    return []
  }
})

ipcMain.handle('fs:delete-files', async (_event, paths: string[]) => {
  const results: Array<{ path: string; ok: boolean; error?: string }> = []
  for (const p of paths) {
    try {
      await shell.trashItem(p)
      // Evict from both caches
      RAW_CACHE.delete(p)
      JPEG_CACHE.delete(p)
      results.push({ path: p, ok: true })
    } catch (e) {
      results.push({ path: p, ok: false, error: String(e) })
    }
  }
  return results
})
