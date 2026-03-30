import * as path from 'path';
import * as fs from 'fs-extra';
import * as os from 'os';

export const detectSteamLibrary = async (): Promise<string | null> => {
  const homeDir = os.homedir();
  let steamPath = '';

  if (process.platform === 'linux') {
    const possiblePaths = [
      path.join(homeDir, '.local/share/Steam'),
      path.join(homeDir, '.steam/steam'),
      path.join(homeDir, '.var/app/com.valvesoftware.Steam/data/Steam'), // Flatpak
    ];

    for (const p of possiblePaths) {
      if (await fs.pathExists(p)) {
        steamPath = p;
        break;
      }
    }
  } else if (process.platform === 'win32') {
    steamPath = 'C:\\Program Files (x86)\\Steam';
    if (!(await fs.pathExists(steamPath))) {
      steamPath = 'C:\\Program Files\\Steam';
    }
  }

  if (steamPath && await fs.pathExists(path.join(steamPath, 'steamapps', 'libraryfolders.vdf'))) {
    return path.join(steamPath, 'steamapps', 'common');
  }

  return null;
};

export const getDefaultGamesDir = async (): Promise<string> => {
  const steamDir = await detectSteamLibrary();
  if (steamDir) return steamDir;

  // Fallback to a "Games" folder in home directory
  const homeDir = os.homedir();
  const gamesDir = path.join(homeDir, 'Games');
  await fs.ensureDir(gamesDir);
  return gamesDir;
};
