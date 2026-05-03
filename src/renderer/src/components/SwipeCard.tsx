import { useEffect, useRef, useState } from 'react'
import { motion, useAnimation } from 'framer-motion'
import type { EnterFrom } from '../types'

export function toLocalSrc(filePath: string): string {
  return `local-file://img?p=${encodeURIComponent(filePath)}`
}

// RAW extensions — loading spinner shown only for these
const RAW_EXTS = new Set([
  'cr2','cr3','nef','nrw','arw','srf','sr2','raf','rwl','raw',
  '3fr','fff','rw2','pef','ptx','orf','srw','iiq','dng','x3f','erf','mef','mos',
])

const cardStyle: React.CSSProperties = {
  position: 'relative',
  borderRadius: 18,
  overflow: 'hidden',
  boxShadow:
    '0 48px 100px rgba(0,0,0,0.65), 0 16px 40px rgba(0,0,0,0.4), 0 0 0 0.5px rgba(255,255,255,0.07)',
  background: '#111113',
  lineHeight: 0,
}

const imgStyle: React.CSSProperties = {
  maxHeight: '72vh',
  maxWidth: '84vw',
  display: 'block',
  objectFit: 'contain',
}

const PLACEHOLDER_W = 'min(84vw, 900px)'
const PLACEHOLDER_H = 'min(72vh, 600px)'

interface Props {
  imageSrc: string
  enterFrom: EnterFrom
  swipeDirection: 'left' | 'right' | null
  onExitComplete: () => void
}

export function SwipeCard({ imageSrc, enterFrom, swipeDirection, onExitComplete }: Props): JSX.Element {
  const controls = useAnimation()
  const exitCalledRef = useRef(false)
  const onExitRef = useRef(onExitComplete)
  onExitRef.current = onExitComplete

  const [imgState, setImgState] = useState<'loading' | 'loaded' | 'error'>('loading')

  const ext = imageSrc.split('.').pop()?.toLowerCase() ?? ''
  const isRaw = RAW_EXTS.has(ext)

  // Reset to loading when image source changes
  useEffect(() => { setImgState('loading') }, [imageSrc])

  // Enter animation on mount
  useEffect(() => {
    exitCalledRef.current = false
    const x0 =
      enterFrom === 'nav-left' || enterFrom === 'undo-left' ? -60
      : enterFrom === 'nav-right' || enterFrom === 'undo-right' ? 60
      : 0
    controls.set({ x: x0, scale: enterFrom === 'scale' ? 0.96 : 0.99, opacity: 0, rotate: 0 })
    controls.start({
      x: 0, scale: 1, opacity: 1, rotate: 0,
      transition: { duration: 0.08, ease: [0.22, 1, 0.36, 1] },
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Exit animation — slowed down from 0.1 → 0.22s
  useEffect(() => {
    if (!swipeDirection || exitCalledRef.current) return
    exitCalledRef.current = true
    controls
      .start({
        x: swipeDirection === 'left' ? '-130vw' : '130vw',
        rotate: swipeDirection === 'left' ? -12 : 12,
        opacity: 0, scale: 0.9,
        transition: { duration: 0.1, ease: [0.4, 0, 1, 1] },
      })
      .then(() => onExitRef.current())
  }, [swipeDirection]) // eslint-disable-line react-hooks/exhaustive-deps

  const stamp = swipeDirection === 'left' ? 'DELETE' : swipeDirection === 'right' ? 'KEEP' : null
  const stampColor = swipeDirection === 'left' ? '#ff453a' : '#30d158'
  const tintColor = swipeDirection === 'left' ? 'rgba(255,69,58,0.28)' : 'rgba(48,209,88,0.2)'

  const showPlaceholder = isRaw && imgState === 'loading'
  const showError = imgState === 'error'

  return (
    <motion.div
      animate={controls}
      style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          ...cardStyle,
          // Reserve space only while a RAW file is converting — not for JPEG
          minWidth: showPlaceholder ? PLACEHOLDER_W : undefined,
          minHeight: showPlaceholder ? PLACEHOLDER_H : undefined,
          width:     showPlaceholder ? PLACEHOLDER_W : undefined,
          height:    showPlaceholder ? PLACEHOLDER_H : undefined,
        }}
      >
        {/* RAW loading spinner */}
        {showPlaceholder && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 14,
          }}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 30, height: 30,
                border: '2.5px solid rgba(255,255,255,0.08)',
                borderTopColor: 'rgba(255,255,255,0.55)',
                borderRadius: '50%',
              }}
            />
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
              Converting RAW…
            </span>
          </div>
        )}

        {/* Error state */}
        {showError && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 36, opacity: 0.25 }}>⚠</span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>
              Cannot decode file
            </span>
          </div>
        )}

        {/* Image — always rendered so browser loads in background */}
        <img
          src={toLocalSrc(imageSrc)}
          draggable={false}
          decoding="async"
          style={{ ...imgStyle, display: imgState === 'loaded' ? 'block' : 'none' }}
          onLoad={() => setImgState('loaded')}
          onError={() => setImgState('error')}
        />

        {/* Swipe stamp */}
        {stamp && imgState === 'loaded' && (
          <>
            <div style={{ position: 'absolute', inset: 0, background: tintColor, pointerEvents: 'none' }} />
            <motion.div
              initial={{ opacity: 0, scale: 0.65, rotate: swipeDirection === 'left' ? 12 : -12 }}
              animate={{ opacity: 1, scale: 1, rotate: swipeDirection === 'left' ? 8 : -8 }}
              transition={{ duration: 0.07 }}
              style={{
                position: 'absolute', top: 24,
                ...(swipeDirection === 'left' ? { right: 24 } : { left: 24 }),
                padding: '7px 14px', borderRadius: 8,
                border: `2.5px solid ${stampColor}`, color: stampColor,
                fontSize: 17, fontWeight: 800, letterSpacing: '0.12em',
                background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)', lineHeight: 1,
              }}
            >
              {stamp}
            </motion.div>
          </>
        )}
      </div>
    </motion.div>
  )
}
