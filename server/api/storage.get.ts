import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { defineEventHandler } from 'h3';

async function getDirSize(dir: string): Promise<number> {
  let size = 0;
  try {
    const files = await fs.readdir(dir, { withFileTypes: true });
    const promises = files.map(async (file) => {
      const filePath = path.join(dir, file.name);
      if (file.name === 'Trash') return 0;
      try {
        if (file.isDirectory()) {
          return await getDirSize(filePath);
        } else {
          const stats = await fs.stat(filePath);
          return stats.size;
        }
      } catch (e) {
        return 0;
      }
    });
    const sizes = await Promise.all(promises);
    size = sizes.reduce((acc, curr) => acc + curr, 0);
  } catch (e) {
    return 0;
  }
  return size;
}

export default defineEventHandler(async () => {
  const rootDir = path.resolve(process.cwd(), 'files');
  
  if (!fsSync.existsSync(rootDir)) {
    return { used: 0, total: 10737418240, percent: 0 };
  }

  try {
    const usedBytes = await getDirSize(rootDir);
    let totalBytes = 10 * 1024 * 1024 * 1024;

    try {
      const stats = await fs.statfs(rootDir);
      if (stats && stats.bsize && stats.blocks) {
        totalBytes = Number(stats.bsize) * Number(stats.blocks);
      }
    } catch (e) {}

    const percent = Math.min(100, Math.round((usedBytes / totalBytes) * 100));
    
    return {
      used: usedBytes,
      total: totalBytes,
      percent
    };
  } catch (err) {
    return {
      used: 0,
      total: 10737418240,
      percent: 0
    };
  }
});