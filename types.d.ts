declare module "*.css" {
  const content: { [className: string]: string };
  export default content;
}

export interface DownloadData {
  percent: number;
  downloaded: number;
  total: number;
  speed: number;
}

export interface ElectronAPI {
  getGameStatus: () => Promise<{ installed: boolean; multibotEnabled: boolean; gameDir: string }>;
  installGame: () => Promise<boolean>;
  updateRealmlist: () => Promise<boolean>;
  toggleAddon: (enabled: boolean) => Promise<boolean>;
  launchGame: () => Promise<void>;
  selectDirectory: () => Promise<string | null>;
  getConfig: () => Promise<{ gameDir: string }>;
  openGameFolder: () => Promise<void>;
  closeApp: () => void;
  minimizeApp: () => void;
  onDownloadProgress: (callback: (data: DownloadData) => void) => void;
  onStatusUpdate: (callback: (status: string) => void) => void;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
