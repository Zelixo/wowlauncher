declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

export interface ElectronAPI {
  getGameStatus: () => Promise<{ installed: boolean; multibotEnabled: boolean; gameDir: string }>;
  installGame: () => Promise<boolean>;
  updateRealmlist: () => Promise<boolean>;
  toggleAddon: (enabled: boolean) => Promise<boolean>;
  launchGame: () => Promise<void>;
  selectDirectory: () => Promise<string | null>;
  getConfig: () => Promise<{ gameDir: string }>;
  closeApp: () => void;
  minimizeApp: () => void;
  onDownloadProgress: (callback: (percent: number) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
