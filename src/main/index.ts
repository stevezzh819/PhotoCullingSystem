import { app, shell, BrowserWindow, ipcMain, dialog, protocol } from 'electron'
import { join } from 'path'
import { readdirSync } from 'fs'
import { readFile } from 'fs/promises'
import { is } from '@electron-toolkit/utils'

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
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0c0c0e',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  win.on('ready-to-show', () => {
    win.show()
  })

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

const MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
}

app.whenReady().then(() => {
  // Path is passed as query param ?p= to avoid Chromium lowercasing
  // the "hostname" portion of the URL (which would corrupt /Users/... paths)
  protocol.handle('local-file', async (request) => {
    const url = new URL(request.url)
    const rawPath = url.searchParams.get('p') ?? ''
    const ext = rawPath.split('.').pop()?.toLowerCase() ?? ''
    const mimeType = MIME[ext] ?? 'application/octet-stream'
    try {
      const data = await readFile(rawPath)
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Cache-Control': 'max-age=31536000, immutable',
        },
      })
    } catch (e) {
      console.error('[local-file] cannot read:', rawPath, e)
      return new Response('Not found', { status: 404 })
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  app.quit()
})

// ── IPC Handlers ──────────────────────────────────────────────────────────────

ipcMain.handle('dialog:select-folder', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ['openDirectory'],
    title: 'Select folder with JPEG images',
    buttonLabel: 'Select Folder'
  })
  return canceled ? null : filePaths[0]
})

ipcMain.handle('fs:get-images', async (_event, folderPath: string) => {
  try {
    const entries = readdirSync(folderPath)
    return entries
      .filter((name) => /\.(jpg|jpeg)$/i.test(name))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }))
      .map((name) => join(folderPath, name))
  } catch {
    return []
  }
})

ipcMain.handle('fs:delete-files', async (_event, paths: string[]) => {
  const results: Array<{ path: string; ok: boolean; error?: string }> = []
  for (const p of paths) {
    try {
      await shell.trashItem(p)
      results.push({ path: p, ok: true })
    } catch (e) {
      results.push({ path: p, ok: false, error: String(e) })
    }
  }
  return results
})
