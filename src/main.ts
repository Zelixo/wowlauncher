import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import { updateRealmlist } from './main/realmlistManager';
import { downloadFile, extractZip } from './main/fileManager';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const CLIENT_URL = 'https://btground.tk/chmi/ChromieCraft_3.3.5a.zip';
const MULTIBOT_URL = 'https://github.com/Macx-Lio/MultiBot/archive/refs/heads/master.zip';
const TARGET_REALMLIST = 'wow.zelixo.net';

const GAME_DIR = path.join(app.getPath('userData'), 'game');
const CLIENT_ZIP = path.join(app.getPath('userData'), 'client.zip');
const ADDON_ZIP = path.join(app.getPath('userData'), 'multibot.zip');

if (require('electron-squirrel-startup')) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;

const createWindow = (): void => {
  mainWindow = new BrowserWindow({
    height: 600,
    width: 800,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  // mainWindow.webContents.openDevTools();
};

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// IPC Handlers
ipcMain.handle('get-game-status', async () => {
  const wowExe = path.join(GAME_DIR, 'Wow.exe');
  const installed = await fs.pathExists(wowExe);
  
  let multibotEnabled = false;
  const addonDir = path.join(GAME_DIR, 'Interface', 'AddOns', 'MultiBot-master');
  if (installed) {
    multibotEnabled = await fs.pathExists(addonDir);
  }

  return { installed, multibotEnabled };
});

ipcMain.handle('install-game', async () => {
  await fs.ensureDir(GAME_DIR);
  
  if (mainWindow) {
    mainWindow.webContents.send('download-progress', 0);
  }

  await downloadFile(CLIENT_URL, CLIENT_ZIP, (percent) => {
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', percent);
    }
  });

  await extractZip(CLIENT_ZIP, GAME_DIR);
  await fs.remove(CLIENT_ZIP);
  
  // ChromieCraft zip might have a subfolder. Let's move contents if needed.
  const subfolders = await fs.readdir(GAME_DIR);
  if (subfolders.length === 1 && (await fs.stat(path.join(GAME_DIR, subfolders[0]))).isDirectory()) {
    const subfolderPath = path.join(GAME_DIR, subfolders[0]);
    const files = await fs.readdir(subfolderPath);
    for (const file of files) {
      await fs.move(path.join(subfolderPath, file), path.join(GAME_DIR, file));
    }
    await fs.remove(subfolderPath);
  }

  return true;
});

ipcMain.handle('update-realmlist', async () => {
  await updateRealmlist(GAME_DIR, TARGET_REALMLIST);
  return true;
});

ipcMain.handle('toggle-addon', async (_event, enabled: boolean) => {
  const addonsDir = path.join(GAME_DIR, 'Interface', 'AddOns');
  const multibotDir = path.join(addonsDir, 'MultiBot-master');

  if (enabled) {
    await fs.ensureDir(addonsDir);
    await downloadFile(MULTIBOT_URL, ADDON_ZIP);
    await extractZip(ADDON_ZIP, addonsDir);
    await fs.remove(ADDON_ZIP);
  } else {
    if (await fs.pathExists(multibotDir)) {
      await fs.remove(multibotDir);
    }
  }
  return true;
});

ipcMain.handle('launch-game', async () => {
  // Ensure realmlist is updated before launch
  await updateRealmlist(GAME_DIR, TARGET_REALMLIST);
  
  const wowExe = path.join(GAME_DIR, 'Wow.exe');
  spawn(wowExe, [], {
    detached: true,
    stdio: 'ignore',
    cwd: GAME_DIR,
  }).unref();
  
  // Optionally close launcher or stay open
  // app.quit();
});
