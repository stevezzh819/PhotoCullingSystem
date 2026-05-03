import { useState, useRef, useCallback, useEffect } from 'react'
import { motion } from 'framer-motion'
import { SwipeCard, toLocalSrc } from './SwipeCard'
import { useImageCuller } from '../hooks/useImageCuller'
import { useKeyboard } from '../hooks/useKeyboard'
import { useT } from '../i18n'
import type { EnterFrom } from '../types'

const PAN_STEP = 160

interface Props {
  images: string[]
  folderPath: string
  onDone: (toDeletePaths: string[]) => void
}

function basename(p: string): string {
  return p.split(/[\\/]/).pop() ?? p
}

// ── Main component ────────────────────────────────────────────────────────────
export function ImageViewer({ images, folderPath, onDone }: Props): JSX.Element {
  const culler = useImageCuller(images)
  const t = useT()

  const [cardKey, setCardKey] = useState(0)
  const [enterFrom, setEnterFrom] = useState<EnterFrom>('scale')
  const [swipeDirection, setSwipeDirection] = useState<'left' | 'right' | null>(null)
  const isAnimatingRef = useRef(false)
  const [isZoomed, setIsZoomed] = useState(false)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [zoomScale, setZoomScale] = useState(0.6)

  // ── Decision ───────────────────────────────────────────────────────────────
  const handleDecide = (type: 'keep' | 'delete'): void => {
    if (isAnimatingRef.current || culler.isDone) return
    isAnimatingRef.current = true
    setSwipeDirection(type === 'delete' ? 'left' : 'right')
  }

  // ── Exit complete — advance culler state, remount card with next image ──────
  const handleExitComplete = useCallback((): void => {
    if (swipeDirection === 'right') culler.keep()
    else if (swipeDirection === 'left') culler.markDelete()
    setSwipeDirection(null)
    setEnterFrom('scale')
    setCardKey((k) => k + 1)
    requestAnimationFrame(() => {
      isAnimatingRef.current = false
    })
  }, [swipeDirection, culler])

  // ── Navigation (h / l) — no state change at boundaries ────────────────────
  const nav = (delta: -1 | 1): void => {
    const next = culler.viewIndex + delta
    if (next < 0 || next >= culler.totalCount) return
    if (isAnimatingRef.current) return
    const from = culler.navigate(delta)
    setEnterFrom(from)
    setCardKey((k) => k + 1)
  }

  // ── Undo ───────────────────────────────────────────────────────────────────
  const undo = (): void => {
    if (!culler.canUndo || isAnimatingRef.current) return
    const from = culler.undo()
    setEnterFrom(from)
    setCardKey((k) => k + 1)
  }

  const exitZoom = useCallback((): void => {
    setIsZoomed(false)
    setPanOffset({ x: 0, y: 0 })
    setZoomScale(0.6)
  }, [])

  // Zoom keyboard — capture phase to intercept ESC before App.tsx global handler
  useEffect(() => {
    if (!isZoomed) return
    const handler = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopImmediatePropagation()
      switch (e.key) {
        case 'h': setPanOffset(p => ({ ...p, x: p.x + PAN_STEP })); break
        case 'l': setPanOffset(p => ({ ...p, x: p.x - PAN_STEP })); break
        case 'k': setPanOffset(p => ({ ...p, y: p.y + PAN_STEP })); break
        case 'j': setPanOffset(p => ({ ...p, y: p.y - PAN_STEP })); break
        case 'K': setZoomScale(s => Math.min(3.0, parseFloat((s + 0.1).toFixed(1)))); break  // Shift+K
        case 'J': setZoomScale(s => Math.max(0.1, parseFloat((s - 0.1).toFixed(1)))); break  // Shift+J
        case ' ':
        case 'Escape': exitZoom(); break
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [isZoomed, exitZoom])

  // Normal culling keyboard — disabled while zoomed or on done screen
  useKeyboard({
    j: () => handleDecide('delete'),
    ArrowLeft: () => handleDecide('delete'),
    k: () => handleDecide('keep'),
    ArrowRight: () => handleDecide('keep'),
    h: () => nav(-1),
    l: () => nav(1),
    u: undo,
    ' ': () => { setIsZoomed(true); setPanOffset({ x: 0, y: 0 }); setZoomScale(0.6) },
  }, !isZoomed && !culler.isDone)

  const progress = culler.totalCount > 0 ? culler.processedCount / culler.totalCount : 0
  const folderName = basename(folderPath)

  // Format badge — shown for non-JPEG files
  const currentExt = (culler.currentImage ?? '').split('.').pop()?.toUpperCase() ?? ''
  const isRawFormat = currentExt !== '' && !['JPG', 'JPEG'].includes(currentExt)

  // ── Done screen ────────────────────────────────────────────────────────────
  if (culler.isDone) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background:
            'radial-gradient(ellipse at 25% 15%, rgba(99,102,241,0.08) 0%, transparent 55%), #0c0c0e',
        }}
        className="dot-grid"
      >
        <div className="titlebar-spacer" />
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 32,
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            style={{ textAlign: 'center' }}
          >
            <div style={{ fontSize: 48, marginBottom: 16 }}>✓</div>
            <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-0.5px', marginBottom: 8 }}>
              {t.allDone}
            </div>
            <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 15 }}>
              {t.keptAndDeleted(culler.keptCount, culler.deletedCount)}
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            style={{ display: 'flex', gap: 12 }}
          >
            {culler.canUndo && (
              <button onClick={undo} style={ghostBtn} className="no-drag">
                {t.undoLast}
              </button>
            )}
            <button
              onClick={() => onDone(culler.toDeletePaths)}
              style={primaryBtn}
              className="no-drag"
            >
              {t.reviewDelete}
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  // ── Culling screen ─────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#0c0c0e',
        overflow: 'hidden',
      }}
    >
      {/* Top bar */}
      <div
        className="draggable"
        style={{
          height: 52,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            fontSize: 13,
            color: 'rgba(255,255,255,0.35)',
            fontWeight: 500,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 300,
            paddingLeft: 80,
          }}
          className="no-drag"
        >
          {folderName}
        </div>

        <div className="no-drag" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* RAW format badge */}
          {isRawFormat && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                padding: '2px 7px',
                borderRadius: 5,
                background: 'rgba(251,191,36,0.12)',
                color: '#fbbf24',
                border: '1px solid rgba(251,191,36,0.28)',
              }}
            >
              {currentExt}
            </span>
          )}
          {culler.currentDecision && (
            <motion.span
              key={culler.viewIndex}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                padding: '3px 8px',
                borderRadius: 5,
                background:
                  culler.currentDecision === 'keep'
                    ? 'rgba(48,209,88,0.15)'
                    : 'rgba(255,69,58,0.15)',
                color: culler.currentDecision === 'keep' ? '#30d158' : '#ff453a',
                border: `1px solid ${culler.currentDecision === 'keep' ? 'rgba(48,209,88,0.3)' : 'rgba(255,69,58,0.3)'}`,
              }}
            >
              {culler.currentDecision === 'keep' ? t.badgeKept : t.badgeDelete}
            </motion.span>
          )}
          <span
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: 'rgba(255,255,255,0.5)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.02em',
            }}
          >
            <span style={{ color: 'rgba(255,255,255,0.85)' }}>{culler.viewIndex + 1}</span>
            <span style={{ margin: '0 4px' }}>/</span>
            {culler.totalCount}
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 2, background: 'rgba(255,255,255,0.05)', flexShrink: 0 }}>
        <motion.div
          style={{ height: '100%', background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 120, damping: 20 }}
        />
      </div>

      {/* Image area */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        {culler.currentImage && (
          <SwipeCard
            key={cardKey}
            imageSrc={culler.currentImage}
            enterFrom={enterFrom}
            swipeDirection={swipeDirection}
            onExitComplete={handleExitComplete}
          />
        )}

        {/* Zoom overlay */}
        {isZoomed && culler.currentImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0,0,0,0.96)',
              overflow: 'hidden',
              cursor: 'crosshair',
            }}
            onClick={exitZoom}
          >
            {/* Hint bar */}
            <div
              style={{
                position: 'absolute',
                top: 12,
                left: 0,
                right: 0,
                display: 'flex',
                justifyContent: 'center',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: 16,
                  alignItems: 'center',
                  background: 'rgba(255,255,255,0.06)',
                  backdropFilter: 'blur(12px)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 8,
                  padding: '5px 14px',
                  fontSize: 11,
                  color: 'rgba(255,255,255,0.4)',
                  letterSpacing: '0.04em',
                }}
              >
                <span><span className="key-badge" style={{ fontSize: 10 }}>H</span> <span className="key-badge" style={{ fontSize: 10 }}>J</span> <span className="key-badge" style={{ fontSize: 10 }}>K</span> <span className="key-badge" style={{ fontSize: 10 }}>L</span> Pan</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span><span className="key-badge" style={{ fontSize: 10 }}>⇧J</span> <span className="key-badge" style={{ fontSize: 10 }}>⇧K</span> Zoom</span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span
                  style={{
                    fontVariantNumeric: 'tabular-nums',
                    color: 'rgba(255,255,255,0.65)',
                    fontWeight: 600,
                    minWidth: 36,
                    textAlign: 'center',
                  }}
                >
                  {Math.round(zoomScale * 100)}%
                </span>
                <span style={{ opacity: 0.4 }}>·</span>
                <span><span className="key-badge" style={{ fontSize: 10 }}>SPACE</span> Exit</span>
              </div>
            </div>

            {/* Image at 100% */}
            <img
              src={toLocalSrc(culler.currentImage)}
              draggable={false}
              decoding="async"
              onClick={e => e.stopPropagation()}
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: `translate(calc(-50% + ${panOffset.x}px), calc(-50% + ${panOffset.y}px)) scale(${zoomScale})`,
                maxWidth: 'none',
                maxHeight: 'none',
                width: 'auto',
                height: 'auto',
                userSelect: 'none',
                transition: 'transform 0.08s ease-out',
              }}
            />
          </motion.div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          height: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 20,
          flexShrink: 0,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}
      >
        <Hint
          k="H"
          label={t.prev}
          color="rgba(255,255,255,0.6)"
          dim="rgba(255,255,255,0.22)"
          active={false}
          disabled={culler.viewIndex === 0}
          onClick={() => nav(-1)}
        />
        <Sep />
        <Hint
          k="J"
          label={t.del}
          color="#ff453a"
          dim="rgba(255,69,58,0.45)"
          active={false}
          disabled={false}
          onClick={() => handleDecide('delete')}
        />
        <Sep />
        <Hint
          k="K"
          label={t.keep}
          color="#30d158"
          dim="rgba(48,209,88,0.45)"
          active={false}
          disabled={false}
          onClick={() => handleDecide('keep')}
        />
        <Sep />
        <Hint
          k="L"
          label={t.next}
          color="rgba(255,255,255,0.6)"
          dim="rgba(255,255,255,0.22)"
          active={false}
          disabled={culler.viewIndex === culler.totalCount - 1}
          onClick={() => nav(1)}
        />
        <Sep />
        <Hint
          k="U"
          label={t.undo}
          color="rgba(255,255,255,0.6)"
          dim="rgba(255,255,255,0.22)"
          active={false}
          disabled={!culler.canUndo}
          onClick={undo}
        />
        <Sep />
        <Hint
          k="SPC"
          label="Zoom"
          color="rgba(255,255,255,0.6)"
          dim="rgba(255,255,255,0.22)"
          active={isZoomed}
          disabled={false}
          onClick={() => { setIsZoomed(true); setPanOffset({ x: 0, y: 0 }) }}
        />
      </div>
    </div>
  )
}

function Sep(): JSX.Element {
  return <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />
}

function Hint({
  k,
  label,
  color,
  dim,
  active,
  disabled,
  onClick,
}: {
  k: string
  label: string
  color: string
  dim: string
  active: boolean
  disabled: boolean
  onClick: () => void
}): JSX.Element {
  return (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className="no-drag"
      animate={{ opacity: disabled ? 0.3 : 1 }}
      whileHover={{ scale: disabled ? 1 : 1.06 }}
      whileTap={{ scale: disabled ? 1 : 0.94 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        background: 'none',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        padding: '4px 8px',
        borderRadius: 8,
      }}
    >
      <span className="key-badge" style={active ? { background: color, color: '#fff', borderColor: color } : {}}>
        {k}
      </span>
      <span style={{ fontSize: 12, fontWeight: 500, color: active ? color : dim }}>{label}</span>
    </motion.button>
  )
}

const ghostBtn: React.CSSProperties = {
  padding: '11px 22px',
  borderRadius: 10,
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.7)',
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
}

const primaryBtn: React.CSSProperties = {
  padding: '11px 28px',
  borderRadius: 10,
  border: 'none',
  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: '#fff',
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 24px rgba(99,102,241,0.4)',
}
