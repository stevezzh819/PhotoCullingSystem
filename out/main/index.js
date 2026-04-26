"use strict";
const electron = require("electron");
const path = require("path");
const fs = require("fs");
const promises = require("fs/promises");
const utils = require("@electron-toolkit/utils");
electron.protocol.registerSchemesAsPrivileged([
  {
    scheme: "local-file",
    privileges: { secure: true, standard: true, stream: true, supportFetchAPI: true }
  }
]);
function createWindow() {
  const win = new electron.BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    show: false,
    titleBarStyle: "hiddenInset",
    backgroundColor: "#0c0c0e",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      sandbox: false,
      contextIsolation: true
    }
  });
  win.on("ready-to-show", () => {
    win.show();
  });
  win.webContents.setWindowOpenHandler(({ url }) => {
    electron.shell.openExternal(url);
    return { action: "deny" };
  });
  if (utils.is.dev && process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  return win;
}
const MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  tif: "image/tiff",
  tiff: "image/tiff"
};
electron.app.whenReady().then(() => {
  electron.protocol.handle("local-file", async (request) => {
    const url = new URL(request.url);
    const rawPath = url.searchParams.get("p") ?? "";
    const ext = rawPath.split(".").pop()?.toLowerCase() ?? "";
    const mimeType = MIME[ext] ?? "application/octet-stream";
    try {
      const data = await promises.readFile(rawPath);
      return new Response(data, {
        status: 200,
        headers: {
          "Content-Type": mimeType,
          "Cache-Control": "max-age=31536000, immutable"
        }
      });
    } catch (e) {
      console.error("[local-file] cannot read:", rawPath, e);
      return new Response("Not found", { status: 404 });
    }
  });
  createWindow();
  electron.app.on("activate", () => {
    if (electron.BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") electron.app.quit();
});
electron.ipcMain.handle("dialog:select-folder", async () => {
  const { canceled, filePaths } = await electron.dialog.showOpenDialog({
    properties: ["openDirectory"],
    title: "Select folder with JPEG images",
    buttonLabel: "Select Folder"
  });
  return canceled ? null : filePaths[0];
});
electron.ipcMain.handle("fs:get-images", async (_event, folderPath) => {
  try {
    const entries = fs.readdirSync(folderPath);
    return entries.filter((name) => /\.(jpg|jpeg)$/i.test(name)).sort((a, b) => a.localeCompare(b, void 0, { numeric: true, sensitivity: "base" })).map((name) => path.join(folderPath, name));
  } catch {
    return [];
  }
});
electron.ipcMain.handle("fs:delete-files", async (_event, paths) => {
  const results = [];
  for (const p of paths) {
    try {
      await electron.shell.trashItem(p);
      results.push({ path: p, ok: true });
    } catch (e) {
      results.push({ path: p, ok: false, error: String(e) });
    }
  }
  return results;
});
