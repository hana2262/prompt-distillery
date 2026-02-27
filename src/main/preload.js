const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    getMode: () => ipcRenderer.invoke('window:get-mode'),
    switchMode: (mode) => ipcRenderer.invoke('window:switch-mode', mode),
    onModeChanged: (callback) => {
      ipcRenderer.on('window:mode-changed', (event, mode) => callback(mode));
    }
  },

  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (newSettings) => ipcRenderer.invoke('settings:set', newSettings)
  },

  clipboard: {
    read: () => ipcRenderer.invoke('clipboard:read'),
    write: (text) => ipcRenderer.invoke('clipboard:write', text),
    startMonitor: () => ipcRenderer.invoke('clipboard:start-monitor'),
    stopMonitor: () => ipcRenderer.invoke('clipboard:stop-monitor'),
    getStatus: () => ipcRenderer.invoke('clipboard:get-status'),
    onChanged: (callback) => {
      ipcRenderer.on('clipboard:changed', (event, text) => callback(text));
    }
  },

  background: {
    save: (base64Data) => ipcRenderer.invoke('background:save', base64Data)
  }
});
