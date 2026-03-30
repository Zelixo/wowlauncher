import * as fs from 'fs-extra';
import * as path from 'path';
const WebTorrent = require('webtorrent');
const extract = require('extract-zip');

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
  speed: number; // bytes per second
}

// A list of high-quality public trackers to help discovery
const EXTRA_TRACKERS = [
    'udp://tracker.leechers-paradise.org:6969/announce',
    'udp://tracker.coppersurfer.tk:6969/announce',
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://explodie.org:6969/announce',
    'udp://9.rarbg.com:2810/announce',
    'wss://tracker.btorrent.xyz',
    'wss://tracker.openwebtorrent.com',
];

export const downloadTorrent = async (torrentId: string, destDir: string, onProgress?: (data: DownloadProgress) => void): Promise<string> => {
  const client = new WebTorrent({
    dht: true,
    tracker: true,
    lsd: true,
  });
  
  console.log('Starting Aggressive WebTorrent 1.x client...');

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
        if (client.torrents.length === 0 || !client.torrents[0].ready) {
            client.destroy();
            reject(new Error('Failed to fetch torrent metadata. The swarm might be empty or trackers are blocked.'));
        }
    }, 60000); // 1 minute to find peers/metadata

    client.on('error', (err: any) => {
        console.error('WebTorrent Client Global Error:', err);
        client.destroy();
        reject(err);
    });

    client.add(torrentId, { 
        path: destDir,
        announce: EXTRA_TRACKERS 
    }, (torrent: any) => {
      clearTimeout(timeout);
      console.log('Successfully connected to swarm.');
      console.log('Files in torrent:', torrent.files.map((f: any) => f.name));
      
      const file = torrent.files.find((f: any) => f.name.endsWith('.zip'));
      if (!file) {
        client.destroy();
        return reject(new Error('No zip file found in torrent.'));
      }

      const statusInterval = setInterval(() => {
        const progress = Math.round(torrent.progress * 100);
        const peers = torrent.numPeers;
        const speed = (torrent.downloadSpeed / 1024 / 1024).toFixed(2);
        
        console.log(`[Torrent] Progress: ${progress}% | Peers: ${peers} | Speed: ${speed} MB/s`);
      }, 3000);

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
        console.log('Torrent download complete!');
        clearInterval(statusInterval);
        const filePath = path.join(destDir, file.path);
        // Important: We don't destroy immediately to let others leech if needed for a moment
        setTimeout(() => client.destroy(), 5000); 
        resolve(filePath);
      });

      torrent.on('error', (err: any) => {
        console.error('Torrent-specific error:', err);
        clearInterval(statusInterval);
        client.destroy();
        reject(err);
      });
    });
  });
};

export const extractZip = async (zipPath: string, extractTo: string) => {
  console.log(`Extracting large file: ${zipPath} to ${extractTo}`);
  // Use extract-zip for large files (handles > 2GB)
  await extract(zipPath, { dir: extractTo });
};
