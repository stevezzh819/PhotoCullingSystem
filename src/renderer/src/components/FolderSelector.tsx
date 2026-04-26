import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { AsciiGhost } from './AsciiGhost'
import { useLang, useT } from '../i18n'

interface Props {
  onFolderSelected: (folderPath: string, images: string[]) => void
}

export function FolderSelector({ onFolderSelected }: Props): JSX.Element {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { lang, setLang } = useLang()
  const t = useT()

  const loadFolder = useCallback(
    async (folderPath: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const images = await window.api.getImages(folderPath)
        if (images.length === 0) {
          setError(t.noImages)
          setIsLoading(false)
          return
        }
        onFolderSelected(folderPath, images)
      } catch {
        setError(t.failedRead)
        setIsLoading(false)
      }
    },
    [onFolderSelected, t]
  )

  const handleSelectFolder = async (): Promise<void> => {
    if (isLoading) return
    setIsLoading(true)
    const folder = await window.api.selectFolder()
    if (folder) {
      await loadFolder(folder)
    } else {
      setIsLoading(false)
    }
  }

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)
      if (isLoading) return
      const item = e.dataTransfer.items[0]
      if (!item) return
      const entry = item.webkitGetAsEntry()
      if (entry?.isDirectory) {
        // @ts-ignore — webkitGetAsEntry is non-standard but available in Electron
        await loadFolder((item.getAsFile() as File).path)
      }
    },
    [loadFolder]
  )

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background:
          'radial-gradient(ellipse at 25% 15%, rgba(99,102,241,0.10) 0%, transparent 55%), radial-gradient(ellipse at 75% 85%, rgba(236,72,153,0.07) 0%, transparent 55%), #0c0c0e',
        backgroundSize: '100% 100%, 100% 100%, auto',
      }}
      className="dot-grid"
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
      onDragLeave={() => setIsDragging(false)}
    >
      {/* ASCII ghost background animation */}
      <AsciiGhost />

      {/* Title bar */}
      <div className="titlebar-spacer" style={{ width: '100%' }} />

      {/* Language switcher — top right */}
      <div
        className="no-drag"
        style={{
          position: 'absolute',
          top: 8,
          right: 16,
          zIndex: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 8,
          padding: '3px 4px',
        }}
      >
        {(['en', 'zh'] as const).map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            style={{
              padding: '3px 10px',
              borderRadius: 5,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.02em',
              transition: 'background 0.15s, color 0.15s',
              background: lang === l ? 'rgba(99,102,241,0.25)' : 'transparent',
              color: lang === l ? '#a5b4fc' : 'rgba(255,255,255,0.35)',
            }}
          >
            {l === 'en' ? 'EN' : '中文'}
          </button>
        ))}
      </div>

      {/* Center content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 48,
          padding: '0 48px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Logo + title */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center' }}
        >
          <div
            style={{
              fontSize: 56,
              fontWeight: 700,
              letterSpacing: '-2px',
              background: 'linear-gradient(135deg, #f5f5f7 0%, rgba(245,245,247,0.55) 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              lineHeight: 1.05,
              marginBottom: 12,
            }}
          >
            QuickD
          </div>
          <div
            style={{
              fontSize: 16,
              color: 'rgba(245,245,247,0.4)',
              fontWeight: 400,
              letterSpacing: '0.01em',
            }}
          >
            {t.tagline}
          </div>
        </motion.div>

        {/* Drop zone */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            width: '100%',
            maxWidth: 480,
            aspectRatio: '16 / 9',
            borderRadius: 20,
            border: `1.5px dashed ${isDragging ? 'rgba(99,102,241,0.7)' : 'rgba(255,255,255,0.12)'}`,
            background: isDragging ? 'rgba(99,102,241,0.08)' : 'rgba(255,255,255,0.025)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 16,
            transition: 'border-color 0.2s, background 0.2s',
            cursor: 'pointer',
            boxShadow: isDragging
              ? '0 0 0 4px rgba(99,102,241,0.12), 0 20px 60px rgba(0,0,0,0.4)'
              : '0 20px 60px rgba(0,0,0,0.3)',
          }}
          onClick={handleSelectFolder}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              style={{
                width: 32,
                height: 32,
                border: '2.5px solid rgba(255,255,255,0.1)',
                borderTopColor: 'rgba(255,255,255,0.7)',
                borderRadius: '50%',
              }}
            />
          ) : (
            <>
              <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                <path
                  d="M6 12C6 10.343 7.343 9 9 9H17.172C17.702 9 18.211 9.211 18.586 9.586L20.414 11.414C20.789 11.789 21.298 12 21.828 12H31C32.657 12 34 13.343 34 15V29C34 30.657 32.657 32 31 32H9C7.343 32 6 30.657 6 29V12Z"
                  fill="rgba(255,255,255,0.07)"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="1.5"
                />
              </svg>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: 'rgba(255,255,255,0.7)', marginBottom: 4 }}>
                  {isDragging ? t.dropHere : t.selectFolder}
                </div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>
                  {t.dragDrop}
                </div>
              </div>
            </>
          )}
        </motion.div>

        {/* Error message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              color: '#ff453a',
              fontSize: 13,
              padding: '8px 16px',
              borderRadius: 8,
              background: 'rgba(255,69,58,0.1)',
              border: '1px solid rgba(255,69,58,0.2)',
            }}
          >
            {error}
          </motion.div>
        )}

        {/* Keyboard hints */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35 }}
          style={{
            display: 'flex',
            gap: 20,
            alignItems: 'center',
            color: 'rgba(255,255,255,0.22)',
            fontSize: 12,
          }}
        >
          {([
            { key: 'J', label: t.del },
            { key: 'K', label: t.keep },
            { key: 'U', label: t.undo },
          ] as const).map(({ key, label }) => (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="key-badge">{key}</span>
              <span>{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </div>
  )
}
