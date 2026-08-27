import { app, BrowserWindow, Menu, Tray, Notification, ipcMain, nativeImage } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as opcua from './opcuaBridge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const devServerUrl = process.env.VITE_DEV_SERVER_URL;
const iconPath = path.join(__dirname, '../build/icon.ico');

let win = null;
let tray = null;
let quitting = false; // true только когда реально выходим (пункт «Выход» / повторный quit) — иначе закрытие окна прячет его в трей

function navigateTo(hash) {
  if (!win) return;
  win.show();
  win.focus();
  win.webContents.send('navigate', hash);
}

function createWindow() {
  win = new BrowserWindow({
    width: 1360,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    backgroundColor: '#f8fafc',
    icon: iconPath,
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

  // сворачиваем в трей вместо закрытия — приложение продолжает следить за
  // журналом/уведомлениями в фоне, как и обещает иконка в трее
  win.on('close', (e) => {
    if (quitting) return;
    e.preventDefault();
    win.hide();
  });
}

function createTray() {
  const trayIcon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('ПЛК Помощник');

  const menu = Menu.buildFromTemplate([
    { label: 'Открыть приложение', click: () => navigateTo('/dashboard') },
    { type: 'separator' },
    { label: 'Журнал неисправностей', click: () => navigateTo('/') },
    { label: 'Таблица I/O', click: () => navigateTo('/io') },
    { type: 'separator' },
    { label: 'О программе', click: () => navigateTo('/dashboard') },
    { label: 'Выход', click: () => { quitting = true; app.quit(); } },
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => navigateTo('/dashboard'));
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

// Нативные тосты (уведомления Windows) — рендерер не может показывать их сам
// (contextIsolation+sandbox), поэтому просит через этот единственный канал.
ipcMain.handle('notify:show', (_e, { title, body }) => {
  if (!Notification.isSupported()) return;
  new Notification({ title, body, icon: iconPath }).show();
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();
  createTray();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else win.show();
  });
});

app.on('window-all-closed', () => {
  // окно прячется в трей при закрытии (см. createWindow), так что сюда
  // попадаем только когда оно реально уничтожено при выходе — на macOS
  // приложение всё равно принято оставлять живым до явного Cmd+Q
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => { quitting = true; opcua.disconnect(); });
