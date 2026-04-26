import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

const api = {
  selectFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:select-folder'),

  getImages: (folderPath: string): Promise<string[]> =>
    ipcRenderer.invoke('fs:get-images', folderPath),

  deleteFiles: (
    paths: string[]
  ): Promise<Array<{ path: string; ok: boolean; error?: string }>> =>
    ipcRenderer.invoke('fs:delete-files', paths)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (e) {
    console.error(e)
  }
} else {
  // @ts-ignore
  window.electron = electronAPI
  // @ts-ignore
  window.api = api
}
