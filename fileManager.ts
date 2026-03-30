import * as fs from 'fs-extra';
import AdmZip from 'adm-zip';
import * as path from 'path';

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
  speed: number; // bytes per second
}

export const downloadTorrent = async (magnet: string, destDir: string, onProgress?: (data: DownloadProgress) => void): Promise<string> => {
  // Dynamic import to handle ESM module in CJS/Webpack environment
  const WebTorrentModule = await import('webtorrent');
  const WebTorrent = (WebTorrentModule as any).default || WebTorrentModule;
  const client = new WebTorrent();
  
  console.log('Starting WebTorrent client...');

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        client.destroy();
        reject(new Error('Torrent metadata timed out. Is your internet blocking P2P/Torrents?'));
    }, 30000); // 30 second timeout for metadata

    client.on('error', (err: any) => {
        console.error('WebTorrent Client Error:', err);
        clearTimeout(timeout);
        client.destroy();
        reject(err);
    });

    client.add(magnet, { path: destDir }, (torrent) => {
      clearTimeout(timeout);
      console.log('Torrent metadata received. Files:', torrent.files.map(f => f.name));
      // Find the main zip file in the torrent
      const file = torrent.files.find(f => f.name.endsWith('.zip'));
      if (!file) {
        console.error('No zip file found in torrent.');
        client.destroy();
        return reject(new Error('No zip file found in torrent.'));
      }
      console.log('Found target file:', file.name);

      torrent.on('download', () => {
        if (onProgress) {
          onProgress({
            percent: Math.round(torrent.progress * 100),
            downloaded: torrent.downloaded,
            total: torrent.length,
            speed: torrent.downloadSpeed
          });
        }
      });

      torrent.on('done', () => {
        const filePath = path.join(destDir, file.path);
        client.destroy();
        resolve(filePath);
      });
    });
  });
};

export const extractZip = async (zipPath: string, extractTo: string) => {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractTo, true);
};
