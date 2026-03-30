import axios from 'axios';
import * as fs from 'fs-extra';
import AdmZip from 'adm-zip';
import * as path from 'path';

export interface DownloadProgress {
  percent: number;
  downloaded: number;
  total: number;
  speed: number; // bytes per second
}

export const downloadFile = async (url: string, dest: string, onProgress?: (data: DownloadProgress) => void) => {
  const { data, headers } = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const totalLength = parseInt(headers['content-length'], 10);
  let downloadedLength = 0;
  let lastTime = Date.now();
  let lastDownloaded = 0;

  const writer = fs.createWriteStream(dest);
  data.on('data', (chunk: Buffer) => {
    downloadedLength += chunk.length;
    const currentTime = Date.now();
    const timeDiff = (currentTime - lastTime) / 1000;
    
    if (timeDiff >= 0.5) { // Update every 500ms
      const speed = (downloadedLength - lastDownloaded) / timeDiff;
      if (onProgress) {
        onProgress({
          percent: Math.round((downloadedLength / totalLength) * 100),
          downloaded: downloadedLength,
          total: totalLength,
          speed: speed
        });
      }
      lastTime = currentTime;
      lastDownloaded = downloadedLength;
    }
  });

  data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};

export const extractZip = async (zipPath: string, extractTo: string) => {
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(extractTo, true);
};
