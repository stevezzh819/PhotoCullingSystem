import { useEffect, useRef } from 'react'

const ART = [
  ' ██████╗ ██╗   ██╗██╗  ██████╗██╗  ██╗██████╗ ',
  '██╔═══██╗██║   ██║██║ ██╔════╝██║ ██╔╝██╔══██╗',
  '██║   ██║██║   ██║██║ ██║     █████╔╝ ██║  ██║',
  '██║▄▄ ██║██║   ██║██║ ██║     ██╔═██╗ ██║  ██║',
  '╚██████╔╝╚██████╔╝██║ ╚██████╗██║  ██╗██████╔╝',
  ' ╚══▀▀═╝  ╚═════╝ ╚═╝  ╚═════╝╚═╝  ╚═╝╚═════╝',
].join('\n')

const RAIN_CHARS = '!"#$%&()*+-./:;<=>?@[]^{|}~0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdef'

interface Drop { x: number; y: number; speed: number; char: string; alpha: number }

// Inject CSS float keyframe once
const STYLE_ID = 'ascii-ghost-style'
if (!document.getElementById(STYLE_ID)) {
  const s = document.createElement('style')
  s.id = STYLE_ID
  s.textContent = `
    @keyframes ghostFloat {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-18px); }
    }
    .ascii-ghost-float {
      animation: ghostFloat 4s ease-in-out infinite;
      will-change: transform;
    }
  `
  document.head.appendChild(s)
}

export function AsciiGhost(): JSX.Element {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const artRef     = useRef<HTMLPreElement>(null)
  const scaleRef   = useRef<HTMLDivElement>(null)

  // Direct-DOM scale — zero React re-renders
  useEffect(() => {
    const compute = (): void => {
      const sw = scaleRef.current
      const art = artRef.current
      const wrap = wrapperRef.current
      if (!sw || !art || !wrap) return
      const nw = art.scrollWidth
      const nh = art.scrollHeight
      if (!nw || !nh) return
      const s = Math.min((wrap.offsetWidth * 0.8) / nw, (wrap.offsetHeight * 0.8) / nh)
      sw.style.transform = `scale(${s})`
    }

    compute()
    let rafId = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(compute)
    })
    if (wrapperRef.current) ro.observe(wrapperRef.current)
    return () => { ro.disconnect(); cancelAnimationFrame(rafId) }
  }, [])

  // Canvas rain — single RAF loop, capped at 20fps
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const FS = 11
    const TARGET_DENSITY = 8000 // px² per drop — half the previous density

    let drops: Drop[] = []

    const mkDrop = (w: number, h: number, randomY = true): Drop => ({
      x: Math.floor(Math.random() * (w / FS)) * FS,
      y: randomY ? Math.random() * h : -FS * (2 + Math.random() * 6),
      speed: 0.2 + Math.random() * 0.35,
      char: RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)],
      alpha: 0.025 + Math.random() * 0.035,
    })

    const resize = (): void => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      const target = Math.max(10, Math.floor((canvas.width * canvas.height) / TARGET_DENSITY))
      while (drops.length > target) drops.pop()
      while (drops.length < target) drops.push(mkDrop(canvas.width, canvas.height, true))
    }
    resize()

    let resizeRaf = 0
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(resizeRaf)
      resizeRaf = requestAnimationFrame(resize)
    })
    ro.observe(canvas)

    const FPS = 20
    const FRAME_MS = 1000 / FPS
    let lastDraw = 0
    let lastTime = performance.now()
    let id: number

    const tick = (now: number): void => {
      id = requestAnimationFrame(tick)
      if (now - lastDraw < FRAME_MS) return
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
        if (Math.random() < 0.01) d.char = RAIN_CHARS[Math.floor(Math.random() * RAIN_CHARS.length)]
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
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <div className="ascii-ghost-float" style={{ position: 'relative', zIndex: 1 }}>
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
        </div>
      </div>
    </div>
  )
}
