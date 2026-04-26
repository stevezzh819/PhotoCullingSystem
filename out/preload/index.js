"use strict";
const electron = require("electron");
const preload = require("@electron-toolkit/preload");
const api = {
  selectFolder: () => electron.ipcRenderer.invoke("dialog:select-folder"),
  getImages: (folderPath) => electron.ipcRenderer.invoke("fs:get-images", folderPath),
  deleteFiles: (paths) => electron.ipcRenderer.invoke("fs:delete-files", paths)
};
if (process.contextIsolated) {
  try {
    electron.contextBridge.exposeInMainWorld("electron", preload.electronAPI);
    electron.contextBridge.exposeInMainWorld("api", api);
  } catch (e) {
    console.error(e);
  }
} else {
  window.electron = preload.electronAPI;
  window.api = api;
}
