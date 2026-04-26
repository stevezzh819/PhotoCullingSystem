import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

const ART = [
  ' ██████╗ ██╗   ██╗██╗  ██████╗██╗  ██╗██████╗ ',
  '██╔═══██╗██║   ██║██║ ██╔════╝██║ ██╔╝██╔══██╗',
  '██║   ██║██║   ██║██║ ██║     █████╔╝ ██║  ██║',
  '██║▄▄ ██║██║   ██║██║ ██║     ██╔═██╗ ██║  ██║',
  '╚██████╔╝╚██████╔╝██║ ╚██████╗██║  ██╗██████╔╝',
  ' ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═════╝╚═╝  ╚═╝╚═════╝',
].join('\n')

const WISPS = '╲  ╱  ╲  ╱  ╲  ╱  ╲  ╱  ╲  ╱'
const RAIN_CHARS = '!"#$%&\'()*+,-./:;<=>?@[]^{|}~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'

interface Drop { x: number; y: number; speed: number; char: string; alpha: number }

export function AsciiGhost(): JSX.Element {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const wrapperRef   = useRef<HTMLDivElement>(null)
  const artRef       = useRef<HTMLPreElement>(null)
  const scaleRef     = useRef<HTMLDivElement>(null) // direct DOM scale target

  // ── Scale: direct DOM write, zero React re-renders ───────────────────────
  useEffect(() => {
    const compute = () => {
      const sw = scaleRef.current
      const art = artRef.current
      const wrap = wrapperRef.current
      if (!sw || !art || !wrap) return
      const nw = art.scrollWidth   // natural (layout) width — unaffected by transform
      const nh = art.scrollHeight
      if (!nw || !nh) return
      const s = Math.min((wrap.offsetWidth * 0.8) / nw, (wrap.offsetHeight * 0.8) / nh)
      sw.style.transform = `scale(${s})`
    }

    compute()

    // RAF-throttle so at most one recompute per animation frame during drag-resize
    let rafId = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(compute)
    })
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => { ro.disconnect(); cancelAnimationFrame(rafId) }
  }, [])

  // ── Canvas rain ───────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const FS = 11
    const TARGET_DENSITY = 4000 // px² per drop

    let drops: Drop[] = []

    const mkDrop = (w: number, h: number, randomY = true): Drop => ({
      x: Math.floor(Math.random() * (w / FS)) * FS,
      y: randomY ? Math.random() * h : -FS * (2 + Math.random() * 6),
      speed: 0.25 + Math.random() * 0.4,
      char: RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
      alpha: 0.025 + Math.random() * 0.04,
    })

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const target = Math.max(15, Math.floor((canvas.width * canvas.height) / TARGET_DENSITY))
      // Incrementally adjust — no full array recreation
      while (drops.length > target) drops.pop()
      while (drops.length < target) drops.push(mkDrop(canvas.width, canvas.height, true))
    }
    resize()

    // RAF-throttle canvas resize
    let resizeRaf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(resize)
    })
    ro.observe(canvas)

    // Cap animation at 30 fps — halves GPU load vs 60 fps for a background effect
    const FPS = 30
    const FRAME_MS = 1000 / FPS
    let lastDraw = 0
    let lastTime = performance.now()
    let id: number

    const tick = (now: number) => {
      id = requestAnimationFrame(tick)
      if (now - lastDraw < FRAME_MS) return   // skip frame — not time yet
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastDraw = now
      lastTime = now

      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)
      ctx.font = `${FS}px "SF Mono", Menlo, monospace`

      for (const d of drops) {
        ctx.fillStyle = `rgba(99,102,241,${d.alpha})`
        ctx.fillText(d.char, d.x, d.y)
        d.y += d.speed * FS * dt * 60
        if (Math.random() < 0.015) d.char = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]
        if (d.y > h + FS) Object.assign(d, mkDrop(w, h, false))
      }
    }

    id = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(id); cancelAnimationFrame(resizeRaf); ro.disconnect() }
  }, [])

  return (
    <div
      ref={wrapperRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      <motion.div
        animate={{ y: [0, -20, 0] }}
        transition={{ duration: 4, ease: [0.45, 0, 0.55, 1], repeat: Infinity }}
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Direct-DOM scale wrapper — no React state, no re-renders */}
        <div ref={scaleRef} style={{ transformOrigin: 'center center' }}>
          <pre
            ref={artRef}
            style={{
              fontFamily: '"SF Mono", Menlo, monospace',
              fontSize: 12,
              lineHeight: 1.3,
              color: 'rgba(139,92,246,0.11)',
              textShadow: '0 0 30px rgba(139,92,246,0.22), 0 0 80px rgba(99,102,241,0.08)',
              margin: 0,
              userSelect: 'none',
              letterSpacing: 0,
              whiteSpace: 'pre',
            }}
          >
            {ART}
          </pre>

          <motion.div
            animate={{ scaleX: [1, 0.96, 1.02, 1], opacity: [0.55, 1, 0.55] }}
            transition={{ duration: 4, ease: [0.45, 0, 0.55, 1], repeat: Infinity, delay: 0.3 }}
            style={{
              fontFamily: '"SF Mono", Menlo, monospace',
              fontSize: 11,
              color: 'rgba(139,92,246,0.06)',
              textAlign: 'center',
              userSelect: 'none',
              marginTop: 2,
              letterSpacing: '0.05em',
            }}
          >
            {WISPS}
          </motion.div>
        </div>
      </motion.div>
    </div>
  )
}
