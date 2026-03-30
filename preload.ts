import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getGameStatus: () => ipcRenderer.invoke('get-game-status'),
  installGame: () => ipcRenderer.invoke('install-game'),
  updateRealmlist: () => ipcRenderer.invoke('update-realmlist'),
  toggleAddon: (enabled: boolean) => ipcRenderer.invoke('toggle-addon', enabled),
  launchGame: () => ipcRenderer.invoke('launch-game'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  getConfig: () => ipcRenderer.invoke('get-config'),
  openGameFolder: () => ipcRenderer.invoke('open-game-folder'),
  closeApp: () => ipcRenderer.send('close-app'),
  minimizeApp: () => ipcRenderer.send('minimize-app'),
  onDownloadProgress: (callback: (data: any) => void) => {
    ipcRenderer.on('download-progress', (_event, data) => callback(data));
  },
  onStatusUpdate: (callback: (status: string) => void) => {
    ipcRenderer.on('status-update', (_event, status) => callback(status));
  },
});
