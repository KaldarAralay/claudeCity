const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window-minimize'),
  maximizeWindow: () => ipcRenderer.send('window-maximize'),
  closeWindow: () => ipcRenderer.send('window-close'),
  isMaximized: () => ipcRenderer.invoke('window-is-maximized'),

  // File operations
  showSaveDialog: () => ipcRenderer.invoke('show-save-dialog'),
  showOpenDialog: () => ipcRenderer.invoke('show-open-dialog'),
  saveFile: (filePath, data) => ipcRenderer.invoke('save-file', { filePath, data }),
  loadFile: (filePath) => ipcRenderer.invoke('load-file', filePath),
  getCurrentSavePath: () => ipcRenderer.invoke('get-current-save-path'),
  quickSave: (data) => ipcRenderer.invoke('quick-save', data)
});
