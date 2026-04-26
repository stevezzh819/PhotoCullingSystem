import { useState } from 'react'
import { motion } from 'framer-motion'
import { useT } from '../i18n'

interface Props {
  totalImages: number
  toDeletePaths: string[]
  onConfirmDelete: () => Promise<void>
  onBack: () => void
  onStartOver: () => void
}

function basename(filePath: string): string {
  return filePath.split(/[\\/]/).pop() ?? filePath
}

export function SummaryScreen({
  totalImages,
  toDeletePaths,
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
          <div
            style={{
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: '-0.5px',
              marginBottom: 6,
            }}
          >
            {t.reviewDeletions}
          </div>
          <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)' }}>
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

        {/* File list */}
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
            }}
          >
            <div
              style={{
                padding: '10px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                fontSize: 11,
                fontWeight: 600,
                color: 'rgba(255,255,255,0.3)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {t.filesToDelete}
            </div>
            <div style={{ overflowY: 'auto', maxHeight: 'calc(100% - 36px)', padding: '4px 0' }}>
              {toDeletePaths.map((filePath, i) => (
                <motion.div
                  key={filePath}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.14 + i * 0.015, duration: 0.25 }}
                  style={{
                    padding: '7px 16px',
                    fontSize: 13,
                    color: 'rgba(255,255,255,0.55)',
                    fontFamily: "'SF Mono', 'Menlo', monospace",
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    borderBottom:
                      i < toDeletePaths.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: '#ff453a',
                      flexShrink: 0,
                      opacity: 0.7,
                    }}
                  />
                  {basename(filePath)}
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
          style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}
        >
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
