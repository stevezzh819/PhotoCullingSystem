import { useState } from 'react'
import { motion } from 'framer-motion'
import { useT } from '../i18n'
import bmcLogo from '../assets/bmc-logo.png'
import { toLocalSrc } from './SwipeCard'

interface Props {
  totalImages: number
  toDeletePaths: string[]
  elapsedMs: number
  onConfirmDelete: () => Promise<void>
  onBack: () => void
  onStartOver: () => void
}

function formatElapsed(ms: number): string {
  const s = Math.floor(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m < 60) return `${m}m ${rem}s`
  return `${Math.floor(m / 60)}h ${m % 60}m`
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

export function SummaryScreen({
  totalImages,
  toDeletePaths,
  elapsedMs,
  onConfirmDelete,
  onBack,
  onStartOver,
}: Props): JSX.Element {
  const [isDeleting, setIsDeleting] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const t = useT()

  const keptCount = totalImages - toDeletePaths.length

  const handleConfirm = async (): Promise<void> => {
    setIsDeleting(true)
    await onConfirmDelete()
    setIsDone(true)
  }

  if (isDone) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0c0c0e',
          gap: 20,
        }}
        className="dot-grid"
      >
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          style={{ textAlign: 'center' }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: 'rgba(48,209,88,0.15)',
              border: '1.5px solid rgba(48,209,88,0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              fontSize: 28,
            }}
          >
            ✓
          </div>
          <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>
            {t.movedToTrash(toDeletePaths.length)}
          </div>
          <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, marginBottom: 32 }}>
            {t.imagesKept(keptCount)}
          </div>
          <button
            onClick={onStartOver}

            style={{
              padding: '11px 28px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontWeight: 500,
              cursor: 'pointer',
            }}
            className="no-drag"
          >
            {t.startOver}
          </button>
        </motion.div>
      </div>
    )
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(ellipse at 20% 10%, rgba(239,68,68,0.06) 0%, transparent 50%), #0c0c0e',
      }}
      className="dot-grid"
    >
      {/* Title bar drag region */}
      <div className="titlebar-spacer" />

      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 48px 32px',
          overflow: 'hidden',
          gap: 28,
        }}
      >
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                letterSpacing: '-0.5px',
              }}
            >
              {t.reviewDeletions}
            </div>
            {elapsedMs > 0 && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: 'rgba(255,255,255,0.25)',
                  letterSpacing: '0.03em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                  <circle cx="6" cy="6" r="5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2"/>
                  <path d="M6 3.5V6L7.5 7.5" stroke="rgba(255,255,255,0.3)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                {formatElapsed(elapsedMs)}
              </div>
            )}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', marginTop: 6 }}>
            {t.keptWillDelete(keptCount, toDeletePaths.length)}
          </div>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.07, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: 'flex', gap: 12 }}
        >
          <StatCard value={keptCount} label={t.statKept} color="#30d158" />
          <StatCard value={toDeletePaths.length} label={t.statDeleting} color="#ff453a" />
          <StatCard value={totalImages} label={t.statTotal} color="rgba(255,255,255,0.5)" />
        </motion.div>

        {/* Image grid */}
        {toDeletePaths.length > 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.12 }}
            style={{
              flex: 1,
              overflow: 'hidden',
              borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(255,69,58,0.04)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Grid header */}
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                flexShrink: 0,
              }}
            >
              {t.filesToDelete}
            </div>

            {/* Scrollable grid */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                padding: 12,
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                gap: 10,
                alignContent: 'start',
              }}
            >
              {toDeletePaths.map((filePath, i) => (
                <motion.div
                  key={filePath}
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 + i * 0.02, duration: 0.2 }}
                  style={{
                    borderRadius: 8,
                    overflow: 'hidden',
                    border: '1px solid rgba(255,69,58,0.3)',
                    background: 'rgba(255,69,58,0.06)',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  {/* Thumbnail */}
                  <div style={{ position: 'relative', width: '100%', paddingBottom: '70%', flexShrink: 0 }}>
                    <img
                      src={toLocalSrc(filePath)}
                      draggable={false}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                    />
                    {/* Red tint overlay */}
                    <div
                      style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255,69,58,0.12)',
                      }}
                    />
                    {/* Delete badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 5,
                        right: 5,
                        background: 'rgba(255,69,58,0.85)',
                        borderRadius: 4,
                        padding: '1px 5px',
                        fontSize: 9,
                        fontWeight: 700,
                        color: '#fff',
                        letterSpacing: '0.06em',
                      }}
                    >
                      ✕
                    </div>
                  </div>
                  {/* Filename */}
                  <div
                    style={{
                      padding: '5px 7px',
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.5)',
                      fontFamily: "'SF Mono', 'Menlo', monospace",
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                    title={basename(filePath)}
                  >
                    {basename(filePath)}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : (
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'rgba(255,255,255,0.3)',
              fontSize: 15,
            }}
          >
            {t.nothingToDelete}
          </div>
        )}

        {/* Action buttons */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', alignItems: 'center' }}
        >
          {/* BMC link — liquid glass */}
          <button
            onClick={() => window.api.openExternal('https://buymeacoffee.com/stevezzh')}
            className="no-drag"
            title="Buy me a coffee"
            style={{
              marginRight: 'auto',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.15)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.25)',
              cursor: 'pointer',
              padding: '9px 16px',
              borderRadius: 12,
              transition: 'background 0.2s, box-shadow 0.2s, border-color 0.2s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.12)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)'
              e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.18), 0 6px 24px rgba(0,0,0,0.3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.07)'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'
              e.currentTarget.style.boxShadow = 'inset 0 1px 0 rgba(255,255,255,0.12), 0 4px 20px rgba(0,0,0,0.25)'
            }}
          >
            <img src={bmcLogo} alt="Buy me a coffee" style={{ width: 22, height: 22, objectFit: 'contain' }} />
            <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontWeight: 500, letterSpacing: '0.02em', whiteSpace: 'nowrap' }}>
              Buy me a coffee
            </span>
          </button>

          <button
            onClick={onBack}
            disabled={isDeleting}
            className="no-drag"
            style={{
              padding: '11px 22px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.05)',
              color: isDeleting ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
              fontSize: 14,
              fontWeight: 500,
              cursor: isDeleting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {t.back}
          </button>

          {toDeletePaths.length > 0 && (
            <button
              onClick={handleConfirm}
              disabled={isDeleting}
              className="no-drag"
              style={{
                padding: '11px 28px',
                borderRadius: 10,
                border: 'none',
                background: isDeleting
                  ? 'rgba(255,69,58,0.4)'
                  : 'linear-gradient(135deg, #ff453a 0%, #ff2d55 100%)',
                color: '#fff',
                fontSize: 14,
                fontWeight: 600,
                cursor: isDeleting ? 'not-allowed' : 'pointer',
                boxShadow: isDeleting ? 'none' : '0 4px 20px rgba(255,69,58,0.4)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'transform 0.15s, box-shadow 0.15s',
              }}
            >
              {isDeleting ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                    style={{
                      width: 14,
                      height: 14,
                      border: '2px solid rgba(255,255,255,0.3)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                    }}
                  />
                  {t.movingToTrash}
                </>
              ) : (
                t.moveToTrash(toDeletePaths.length)
              )}
            </button>
          )}
        </motion.div>
      </div>
    </div>
  )
}

interface StatCardProps {
  value: number
  label: string
  color: string
}

function StatCard({ value, label, color }: StatCardProps): JSX.Element {
  return (
    <div
      style={{
        flex: 1,
        padding: '14px 16px',
        borderRadius: 12,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          color,
          letterSpacing: '-0.5px',
          lineHeight: 1.1,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 4, fontWeight: 500 }}>
        {label}
      </div>
    </div>
  )
}
