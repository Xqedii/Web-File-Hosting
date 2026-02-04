import fs from 'fs';
import path from 'path';
import { defineEventHandler, createError, readBody } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { path: relativePath, content } = body;
  
  const rootDir = path.resolve('files');
  const targetPath = path.resolve(rootDir, relativePath);

  if (!targetPath.startsWith(rootDir)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

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

  const pathSegments = relativePath.split('/').filter(Boolean);
  const folderKey = pathSegments.length > 1 ? pathSegments[0] : 'root';
  const limitsPath = path.resolve('server/data/limits.json');

  if (fs.existsSync(limitsPath)) {
    const limits = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));
    if (limits[folderKey]) {
      const limitBytes = limits[folderKey] * 1024 * 1024 * 1024;
      const targetDir = path.join(rootDir, pathSegments[0]);
      const currentDirSize = getDirSize(targetDir);
      const oldFileSize = fs.existsSync(targetPath) ? fs.statSync(targetPath).size : 0;
      const newFileSize = Buffer.byteLength(content, 'utf-8');

      if (currentDirSize - oldFileSize + newFileSize > limitBytes) {
        throw createError({ statusCode: 413, statusMessage: 'Storage limit exceeded for this folder' });
      }
    }
  }

  try {
    fs.writeFileSync(targetPath, content, 'utf-8');
    return { success: true };
  } catch (e) {
    throw createError({ statusCode: 500, statusMessage: 'Could not save file' });
  }
});