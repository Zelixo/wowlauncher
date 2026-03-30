import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getGameStatus: () => ipcRenderer.invoke('get-game-status'),
  installGame: () => ipcRenderer.invoke('install-game'),
  updateRealmlist: () => ipcRenderer.invoke('update-realmlist'),
  toggleAddon: (enabled: boolean) => ipcRenderer.invoke('toggle-addon', enabled),
  launchGame: () => ipcRenderer.invoke('launch-game'),
  onDownloadProgress: (callback: (percent: number) => void) => {
    ipcRenderer.on('download-progress', (_event, percent) => callback(percent));
  },
});
