import { app, BrowserWindow, Menu, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as opcua from './opcuaBridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.VITE_DEV_SERVER_URL;

function createWindow() {
  const win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (devServerUrl) {
    win.loadURL(devServerUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist-electron/index.html'));
  }
}

// Мост к CODESYS по OPC UA: raw TCP-соединение доступно только тут, в
// Node-процессе main — рендерер (и тем более iframe тренажёра) до него
// добраться не может (contextIsolation+sandbox), поэтому вся работа с
// node-opcua-client идёт здесь, а наружу торчат только эти четыре IPC-ручки.
ipcMain.handle('codesys:connect', (_e, url) => opcua.connect(url));
ipcMain.handle('codesys:disconnect', () => opcua.disconnect());
ipcMain.handle('codesys:status', () => opcua.getStatus());
ipcMain.handle('codesys:read', (_e, nodeIds) => opcua.readMany(nodeIds));
ipcMain.handle('codesys:write', (_e, writes) => opcua.writeMany(writes));

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { opcua.disconnect(); });
