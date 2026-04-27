import { createContext, useContext, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'zh'

// ── Translation strings ───────────────────────────────────────────────────────

interface Strings {
  // FolderSelector
  appName: string
  tagline: string
  selectFolder: string
  dragDrop: string
  dropHere: string
  noImages: string
  failedRead: string
  // ImageViewer — badges
  badgeKept: string
  badgeDelete: string
  // ImageViewer — buttons
  prev: string
  next: string
  keep: string
  del: string
  undo: string
  // ImageViewer — done screen
  allDone: string
  keptAndDeleted: (kept: number, deleted: number) => string
  undoLast: string
  reviewDelete: string
  // SummaryScreen
  reviewDeletions: string
  keptWillDelete: (kept: number, deleted: number) => string
  statKept: string
  statDeleting: string
  statTotal: string
  filesToDelete: string
  nothingToDelete: string
  back: string
  moveToTrash: (n: number) => string
  movingToTrash: string
  movedToTrash: (n: number) => string
  imagesKept: (n: number) => string
  startOver: string
}

const T: Record<Lang, Strings> = {
  en: {
    appName: 'QuickD',
    tagline: 'Fast image culling for photographers',
    selectFolder: 'Select a folder',
    dragDrop: 'or drag & drop a folder',
    dropHere: 'Drop folder here',
    noImages: 'No JPEG images found in this folder.',
    failedRead: 'Failed to read folder.',
    badgeKept: '✓ KEPT',
    badgeDelete: '✕ DELETE',
    prev: 'Prev',
    next: 'Next',
    keep: 'Keep',
    del: 'Delete',
    undo: 'Undo',
    allDone: 'All done',
    keptAndDeleted: (k, d) => `${k} kept · ${d} marked for deletion`,
    undoLast: '← Undo last',
    reviewDelete: 'Review & Delete →',
    reviewDeletions: 'Review deletions',
    keptWillDelete: (k, d) => `${k} kept · ${d} will be moved to Trash`,
    statKept: 'Kept',
    statDeleting: 'Deleting',
    statTotal: 'Total',
    filesToDelete: 'Files to delete',
    nothingToDelete: 'Nothing to delete — all images kept',
    back: '← Back',
    moveToTrash: (n) => `Move ${n} file${n !== 1 ? 's' : ''} to Trash`,
    movingToTrash: 'Moving to Trash…',
    movedToTrash: (n) => `${n} file${n !== 1 ? 's' : ''} moved to Trash`,
    imagesKept: (n) => `${n} image${n !== 1 ? 's' : ''} kept`,
    startOver: '← Start over',
  },
  zh: {
    appName: '快点儿',
    tagline: '摄影师快速筛图工具',
    selectFolder: '选择文件夹',
    dragDrop: '或将文件夹拖放至此',
    dropHere: '松开以加载文件夹',
    noImages: '该文件夹中未找到 JPEG 图片',
    failedRead: '无法读取文件夹',
    badgeKept: '✓ 保留',
    badgeDelete: '✕ 删除',
    prev: '上一张',
    next: '下一张',
    keep: '保留',
    del: '删除',
    undo: '撤销',
    allDone: '全部完成',
    keptAndDeleted: (k, d) => `已保留 ${k} 张 · 标记删除 ${d} 张`,
    undoLast: '← 撤销',
    reviewDelete: '确认删除 →',
    reviewDeletions: '确认删除',
    keptWillDelete: (k, d) => `${k} 张保留 · ${d} 张将移入废纸篓`,
    statKept: '保留',
    statDeleting: '删除',
    statTotal: '总计',
    filesToDelete: '待删除文件',
    nothingToDelete: '无需删除 — 所有图片均已保留',
    back: '← 返回',
    moveToTrash: (n) => `将 ${n} 个文件移入废纸篓`,
    movingToTrash: '正在移入废纸篓…',
    movedToTrash: (n) => `${n} 个文件已移入废纸篓`,
    imagesKept: (n) => `已保留 ${n} 张图片`,
    startOver: '← 重新开始',
  },
}

// ── Context ───────────────────────────────────────────────────────────────────

interface LangCtx {
  lang: Lang
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangCtx>({ lang: 'en', setLang: () => {} })

export function LangProvider({ children }: { children: ReactNode }): JSX.Element {
  const [lang, setLangState] = useState<Lang>(
    () => (localStorage.getItem('quickd-lang') as Lang) || 'en'
  )
  const setLang = (l: Lang): void => {
    setLangState(l)
    localStorage.setItem('quickd-lang', l)
  }
  return <LangContext.Provider value={{ lang, setLang }}>{children}</LangContext.Provider>
}

export function useLang(): LangCtx {
  return useContext(LangContext)
}

export function useT(): Strings {
  const { lang } = useLang()
  return T[lang]
}
