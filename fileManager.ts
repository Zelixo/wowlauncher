import * as fs from 'fs-extra';
import AdmZip from 'adm-zip';
import WebTorrent from 'webtorrent';
import * as path from 'path';

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
  speed: number; // bytes per second
}

export const downloadTorrent = async (magnet: string, destDir: string, onProgress?: (data: DownloadProgress) => void): Promise<string> => {
  const client = new WebTorrent();

  return new Promise((resolve, reject) => {
    client.add(magnet, { path: destDir }, (torrent) => {
      // Find the main zip file in the torrent
      const file = torrent.files.find(f => f.name.endsWith('.zip'));
      if (!file) {
        client.destroy();
        return reject(new Error('No zip file found in torrent.'));
      }

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

      client.on('error', (err) => {
        client.destroy();
        reject(err);
      });
    });
  });
};

export const extractZip = async (zipPath: string, extractTo: string) => {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractTo, true);
};
