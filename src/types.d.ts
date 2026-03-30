export interface ElectronAPI {
  getGameStatus: () => Promise<{ installed: boolean; multibotEnabled: boolean }>;
  installGame: () => Promise<boolean>;
  updateRealmlist: () => Promise<boolean>;
  toggleAddon: (enabled: boolean) => Promise<boolean>;
  launchGame: () => Promise<void>;
  onDownloadProgress: (callback: (percent: number) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
