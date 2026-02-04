import fs from 'node:fs';
import path from 'node:path';
import { defineEventHandler, getCookie, createError } from 'h3';
import Busboy from 'busboy';

export default defineEventHandler(async (event) => {
  const rootDir = path.resolve('files');

  const getUniquePath = (targetDir: string, filename: string) => {
    const safeName = path.basename(filename);
    const ext = path.extname(safeName);
    const base = path.basename(safeName, ext).slice(0, 100);
    let finalPath = path.join(targetDir, `${base}${ext}`);
    let counter = 1;
    while (fs.existsSync(finalPath)) {
      const suffix = ` (${counter})`;
      const adjustedBase = base.slice(0, 100 - suffix.length);
      finalPath = path.join(targetDir, `${adjustedBase}${suffix}${ext}`);
      counter++;
    }
    return finalPath;
  };

  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: event.node.req.headers });
    let targetRelativePath = 'General';

    const getDirSize = (dir: string): number => {
      let size = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const p = path.join(dir, item.name);
        if (item.name === 'Trash') continue;
        if (item.isDirectory()) size += getDirSize(p);
        else size += fs.statSync(p).size;
      }
      return size;
    };

    bb.on('field', (name, val) => {
      if (name === 'path' && val) {
          const normalized = path.normalize(val).replace(/^(\.\.(\/|\\|$))+/, '');
          const resolved = path.resolve(rootDir, normalized);
          targetRelativePath = resolved.startsWith(rootDir) ? normalized : 'General';
      }
    });

    bb.on('file', (name, file, info) => {
      const { filename } = info;
      const targetDir = path.resolve(rootDir, targetRelativePath);
      
      if (!targetDir.startsWith(rootDir)) {
        file.resume();
        return reject(createError({ statusCode: 403, statusMessage: 'Forbidden path' }));
      }

      const limitsPath = path.resolve('server/data/limits.json');
      const folderKey = targetRelativePath.replace(/^\/|\/$/g, '') || 'root';
      
      if (fs.existsSync(limitsPath)) {
        const limits = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));
        if (limits[folderKey]) {
          const limitBytes = limits[folderKey] * 1024 * 1024 * 1024;
          const currentSize = getDirSize(targetDir);
          let bytesWritten = 0;

          file.on('data', (data) => {
            bytesWritten += data.length;
            if (currentSize + bytesWritten > limitBytes) {
              file.resume();
              writeStream.destroy();
              fs.unlinkSync(saveTo);
              return reject(createError({ statusCode: 413, statusMessage: 'Folder storage limit exceeded' }));
            }
          });
        }
      }

      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const saveTo = getUniquePath(targetDir, filename);
      const writeStream = fs.createWriteStream(saveTo);
      file.pipe(writeStream);

      writeStream.on('error', (err) => {
        reject(createError({ statusCode: 500, statusMessage: 'Write error: ' + err.message }));
      });
    });

    bb.on('finish', () => resolve({ success: true }));
    bb.on('error', (err) => reject(createError({ statusCode: 500, statusMessage: err.message })));
    event.node.req.pipe(bb);
  });
});