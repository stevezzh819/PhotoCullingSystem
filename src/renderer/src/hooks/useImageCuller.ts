import { useState, useCallback, useEffect, useRef } from 'react'
import type { ActionType, EnterFrom } from '../types'

// decisions map: imageIndex → ActionType  (allows re-deciding any image)
// history: ordered list of decided indices (newest last, for undo)
// viewIndex: which image is currently on screen (decoupled from decisions)

export function useImageCuller(images: string[]) {
  const [viewIndex, setViewIndex] = useState(0)
  const [decisions, setDecisions] = useState<Map<number, ActionType>>(new Map())
  const [history, setHistory] = useState<number[]>([])
  const preloadCacheRef = useRef<Map<number, HTMLImageElement>>(new Map())

  useEffect(() => {
    setViewIndex(0)
    setDecisions(new Map())
    setHistory([])
    preloadCacheRef.current.clear()
  }, [images])

  const isDone = images.length > 0 && decisions.size >= images.length
  const canUndo = history.length > 0

  // ── Decide current image ──────────────────────────────────────────────────
  const act = useCallback(
    (type: ActionType) => {
      const idx = viewIndex

      // Compute updated decisions synchronously to find next undecided
      const updated = new Map(decisions)
      updated.set(idx, type)

      // Find next undecided: scan forward first, then wrap to start
      let next = idx + 1
      while (next < images.length && updated.has(next)) next++
      if (next >= images.length) {
        // Try from beginning
        next = 0
        while (next < idx && updated.has(next)) next++
        if (next === idx) next = idx // all decided; stay put
      }

      setDecisions(updated)
      setHistory((h) => [...h.filter((i) => i !== idx), idx]) // dedupe then append
      setViewIndex(next)
    },
    [viewIndex, decisions, images.length]
  )

  // ── Undo ─────────────────────────────────────────────────────────────────
  const undo = useCallback((): EnterFrom => {
    if (history.length === 0) return 'scale'
    const lastIdx = history[history.length - 1]
    const lastType = decisions.get(lastIdx)

    setDecisions((d) => {
      const next = new Map(d)
      next.delete(lastIdx)
      return next
    })
    setHistory((h) => h.slice(0, -1))
    setViewIndex(lastIdx)

    return lastType === 'delete' ? 'undo-left' : 'undo-right'
  }, [history, decisions])

  // ── Pure navigation ───────────────────────────────────────────────────────
  const navigate = useCallback(
    (delta: -1 | 1): EnterFrom => {
      const next = Math.max(0, Math.min(images.length - 1, viewIndex + delta))
      setViewIndex(next)
      return delta < 0 ? 'nav-left' : 'nav-right'
    },
    [viewIndex, images.length]
  )

  // ── Sliding-window preload ────────────────────────────────────────────────
  useEffect(() => {
    const BACK = 5
    const AHEAD = 10
    const cache = preloadCacheRef.current

    // Evict entries outside the window
    for (const idx of cache.keys()) {
      if (idx < viewIndex - BACK || idx > viewIndex + AHEAD) cache.delete(idx)
    }

    // Load any missing entries inside the window
    for (let idx = viewIndex - BACK; idx <= viewIndex + AHEAD; idx++) {
      if (idx >= 0 && idx < images.length && !cache.has(idx)) {
        const img = new Image()
        img.src = `local-file://img?p=${encodeURIComponent(images[idx])}`
        img.decode().catch(() => {}) // eager decode, fire-and-forget
        cache.set(idx, img)
      }
    }
  }, [viewIndex, images])

  const toDeletePaths = images.filter((_, i) => decisions.get(i) === 'delete')

  return {
    viewIndex,
    currentImage: images[viewIndex] ?? null,
    nextImage: images[viewIndex + 1] ?? null,
    totalCount: images.length,
    processedCount: decisions.size,
    keptCount: [...decisions.values()].filter((v) => v === 'keep').length,
    deletedCount: [...decisions.values()].filter((v) => v === 'delete').length,
    toDeletePaths,
    isDone,
    canUndo,
    currentDecision: decisions.get(viewIndex) ?? null,
    keep: () => act('keep'),
    markDelete: () => act('delete'),
    undo,
    navigate,
  }
}
