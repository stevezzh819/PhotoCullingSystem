/// <reference types="vite/client" />

interface Window {
  api: {
    selectFolder: () => Promise<string | null>
    getImages: (folderPath: string) => Promise<string[]>
    deleteFiles: (
      paths: string[]
    ) => Promise<Array<{ path: string; ok: boolean; error?: string }>>
  }
}
