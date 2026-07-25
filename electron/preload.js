const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onServerInfo: (callback) => ipcRenderer.on('server-info', (event, data) => callback(data)),
  openBrowser: (url) => ipcRenderer.invoke('open-browser', url),
  quit: () => ipcRenderer.invoke('quit-app'),
});
