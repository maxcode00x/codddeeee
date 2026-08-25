const { contextBridge, ipcRenderer } = require('electron');

// Единственный мост между рендерером (React-приложением) и Node — только
// эти пять операций, ни прямого доступа к fs/net/child_process, ни к
// произвольным IPC-каналам. Раздельное существование electronAPI — это то,
// как React-код узнаёт, что он вообще запущен в Electron (в браузере/PWA
// window.electronAPI просто не существует).
contextBridge.exposeInMainWorld('electronAPI', {
  codesys: {
    connect: (url) => ipcRenderer.invoke('codesys:connect', url),
    disconnect: () => ipcRenderer.invoke('codesys:disconnect'),
    status: () => ipcRenderer.invoke('codesys:status'),
    read: (nodeIds) => ipcRenderer.invoke('codesys:read', nodeIds),
    write: (writes) => ipcRenderer.invoke('codesys:write', writes),
  },
});
