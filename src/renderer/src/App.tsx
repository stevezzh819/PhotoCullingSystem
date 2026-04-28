import { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FolderSelector } from './components/FolderSelector'
import { ImageViewer } from './components/ImageViewer'
import { SummaryScreen } from './components/SummaryScreen'
import { LangProvider } from './i18n'
import type { AppScreen } from './types'

interface Session {
  folderPath: string
  images: string[]
}

const screenTransition = {
  initial: { opacity: 0, scale: 0.98, filter: 'blur(4px)' },
  animate: { opacity: 1, scale: 1, filter: 'blur(0px)' },
  exit: { opacity: 0, scale: 1.02, filter: 'blur(4px)' },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
}

export default function App(): JSX.Element {
  const [screen, setScreen] = useState<AppScreen>('welcome')
  const [session, setSession] = useState<Session | null>(null)
  const [toDeletePaths, setToDeletePaths] = useState<string[]>([])
  const [elapsedMs, setElapsedMs] = useState(0)
  const cullingStartRef = useRef<number>(0)

  const handleFolderSelected = (folderPath: string, images: string[]): void => {
    setSession({ folderPath, images })
    setToDeletePaths([])
    cullingStartRef.current = Date.now()
    setScreen('culling')
  }

  const handleCullingDone = (paths: string[]): void => {
    setElapsedMs(Date.now() - cullingStartRef.current)
    setToDeletePaths(paths)
    setScreen('summary')
  }

  const handleConfirmDelete = async (): Promise<void> => {
    await window.api.deleteFiles(toDeletePaths)
  }

  const handleReset = (): void => {
    setSession(null)
    setToDeletePaths([])
    setScreen('welcome')
  }

  const handleBackFromSummary = (): void => {
    // If nothing is marked for deletion there's no reason to re-enter culling
    if (toDeletePaths.length === 0) handleReset()
    else setScreen('culling')
  }

  // ESC quits back to the welcome screen from anywhere
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return
      if (screen === 'culling') handleReset()
      else if (screen === 'summary') handleBackFromSummary()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [screen, toDeletePaths]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <LangProvider>
    <div style={{ width: '100%', height: '100%', background: '#0c0c0e' }}>
      {screen !== 'culling' && (
        <div
          style={{
            position: 'fixed',
            bottom: 10,
            left: 0,
            right: 0,
            textAlign: 'center',
            fontSize: 11,
            color: 'rgba(255,255,255,0.2)',
            letterSpacing: '0.04em',
            pointerEvents: 'none',
            zIndex: 9999,
            userSelect: 'none',
          }}
        >
          © VIART PTE. LTD. 2026
        </div>
      )}
      <AnimatePresence mode="wait">
        {screen === 'welcome' && (
          <motion.div key="welcome" style={{ width: '100%', height: '100%' }} {...screenTransition}>
            <FolderSelector onFolderSelected={handleFolderSelected} />
          </motion.div>
        )}

        {screen === 'culling' && session && (
          <motion.div key="culling" style={{ width: '100%', height: '100%' }} {...screenTransition}>
            <ImageViewer
              key={session.folderPath}
              images={session.images}
              folderPath={session.folderPath}
              onDone={handleCullingDone}
            />
          </motion.div>
        )}

        {screen === 'summary' && session && (
          <motion.div key="summary" style={{ width: '100%', height: '100%' }} {...screenTransition}>
            <SummaryScreen
              totalImages={session.images.length}
              toDeletePaths={toDeletePaths}
              elapsedMs={elapsedMs}
              onConfirmDelete={handleConfirmDelete}
              onBack={handleBackFromSummary}
              onStartOver={handleReset}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </LangProvider>
  )
}
