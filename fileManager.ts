import axios from 'axios';
import * as fs from 'fs-extra';
import AdmZip from 'adm-zip';
import * as path from 'path';

export const downloadFile = async (url: string, dest: string, onProgress?: (percent: number) => void) => {
  const { data, headers } = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
  });

  const totalLength = parseInt(headers['content-length'], 10);
  let downloadedLength = 0;

  const writer = fs.createWriteStream(dest);
  data.on('data', (chunk: Buffer) => {
    downloadedLength += chunk.length;
    if (onProgress) {
      onProgress(Math.round((downloadedLength / totalLength) * 100));
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
