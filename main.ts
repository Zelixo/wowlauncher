import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';
import { updateRealmlist } from './realmlistManager';
import { downloadFile, extractZip } from './fileManager';
import { getDefaultGamesDir } from './SteamManager';

declare const MAIN_WINDOW_WEBPACK_ENTRY: string;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

const CLIENT_URL = 'https://btground.tk/chmi/ChromieCraft_3.3.5a.zip';
const MULTIBOT_URL = 'https://github.com/Macx-Lio/MultiBot/archive/refs/heads/master.zip';
const TARGET_REALMLIST = 'wow.zelixo.net';

const CONFIG_FILE = path.join(app.getPath('userData'), 'config.json');

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.disableHardwareAcceleration();

let mainWindow: BrowserWindow | null = null;
let currentConfig: { gameDir: string } = { gameDir: '' };

const loadConfig = async () => {
  if (await fs.pathExists(CONFIG_FILE)) {
    currentConfig = await fs.readJson(CONFIG_FILE);
  } else {
    currentConfig.gameDir = path.join(await getDefaultGamesDir(), 'ZelixoWoW');
    await fs.writeJson(CONFIG_FILE, currentConfig);
  }
};

const createWindow = (): void => {
  console.log('Creating window...');
  mainWindow = new BrowserWindow({
    height: 820,
    width: 1000,
    webPreferences: {
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
      contextIsolation: true,
      nodeIntegration: false,
    },
    frame: false,
    autoHideMenuBar: true,
    backgroundColor: '#050505',
    resizable: false,
  });

  mainWindow.loadURL(MAIN_WINDOW_WEBPACK_ENTRY);
  
  console.log('Window loaded.');
};

app.on('ready', async () => {
  console.log('App ready. Loading config...');
  try {
    await loadConfig();
    console.log('Config loaded:', currentConfig);
    createWindow();
  } catch (error) {
    console.error('Error during startup:', error);
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handlers
ipcMain.handle('get-config', () => currentConfig);

ipcMain.handle('select-directory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (!result.canceled && result.filePaths.length > 0) {
    currentConfig.gameDir = result.filePaths[0]; // Let users pick exactly where they want it
    if (!currentConfig.gameDir.endsWith('ZelixoWoW') && !await fs.pathExists(path.join(currentConfig.gameDir, 'Wow.exe'))) {
       currentConfig.gameDir = path.join(currentConfig.gameDir, 'ZelixoWoW');
    }
    await fs.writeJson(CONFIG_FILE, currentConfig);
    return currentConfig.gameDir;
  }
  return null;
});

ipcMain.handle('get-game-status', async () => {
  const wowExe = path.join(currentConfig.gameDir, 'Wow.exe');
  const installed = await fs.pathExists(wowExe);
  
  let multibotEnabled = false;
  const addonDir = path.join(currentConfig.gameDir, 'Interface', 'AddOns', 'MultiBot-master');
  if (installed) {
    multibotEnabled = await fs.pathExists(addonDir);
  }

  return { installed, multibotEnabled, gameDir: currentConfig.gameDir };
});

ipcMain.handle('install-game', async () => {
  const gameDir = currentConfig.gameDir;
  await fs.ensureDir(gameDir);
  
  const clientZip = path.join(app.getPath('userData'), 'client.zip');

  if (mainWindow) {
    mainWindow.webContents.send('download-progress', { percent: 0, downloaded: 0, total: 0, speed: 0 });
  }

  await downloadFile(CLIENT_URL, clientZip, (data) => {
    if (mainWindow) {
      mainWindow.webContents.send('download-progress', data);
    }
  });

  if (mainWindow) mainWindow.webContents.send('status-update', 'Extracting files (This may take a moment)...');
  await extractZip(clientZip, gameDir);
  await fs.remove(clientZip);
  
  const subfolders = await fs.readdir(gameDir);
  if (subfolders.length === 1 && (await fs.stat(path.join(gameDir, subfolders[0]))).isDirectory()) {
    const subfolderPath = path.join(gameDir, subfolders[0]);
    const files = await fs.readdir(subfolderPath);
    for (const file of files) {
      await fs.move(path.join(subfolderPath, file), path.join(gameDir, file));
    }
    await fs.remove(subfolderPath);
  }

  return true;
});

ipcMain.handle('toggle-addon', async (_event, enabled: boolean) => {
  const addonsDir = path.join(currentConfig.gameDir, 'Interface', 'AddOns');
  const multibotDir = path.join(addonsDir, 'MultiBot-master');
  const addonZip = path.join(app.getPath('userData'), 'multibot.zip');

  if (enabled) {
    await fs.ensureDir(addonsDir);
    await downloadFile(MULTIBOT_URL, addonZip);
    await extractZip(addonZip, addonsDir);
    await fs.remove(addonZip);
  } else {
    if (await fs.pathExists(multibotDir)) {
      await fs.remove(multibotDir);
    }
  }
  return true;
});

ipcMain.handle('launch-game', async () => {
  await updateRealmlist(currentConfig.gameDir, TARGET_REALMLIST);
  
  const wowExe = path.join(currentConfig.gameDir, 'Wow.exe');
  
  if (process.platform === 'linux') {
     // Check if user has wine installed
     try {
       spawn('wine', ['--version']);
       spawn('wine', [wowExe], { detached: true, stdio: 'ignore', cwd: currentConfig.gameDir }).unref();
     } catch (e) {
       // Just try launching normally, maybe they have binfmt_misc
       spawn(wowExe, [], { detached: true, stdio: 'ignore', cwd: currentConfig.gameDir }).unref();
     }
  } else {
    spawn(wowExe, [], {
      detached: true,
      stdio: 'ignore',
      cwd: currentConfig.gameDir,
    }).unref();
  }
});

ipcMain.handle('open-game-folder', async () => {
  if (await fs.pathExists(currentConfig.gameDir)) {
    shell.openPath(currentConfig.gameDir);
  }
});

ipcMain.on('close-app', () => app.quit());
ipcMain.on('minimize-app', () => mainWindow?.minimize());
