import { useEffect, useRef } from 'react'

type KeyMap = Partial<Record<string, () => void>>

export function useKeyboard(keyMap: KeyMap, enabled = true): void {
  const mapRef = useRef<KeyMap>(keyMap)
  mapRef.current = keyMap

  useEffect(() => {
    if (!enabled) return

    const handler = (e: KeyboardEvent): void => {
      if (e.repeat) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      mapRef.current[e.key]?.()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [enabled])
}
