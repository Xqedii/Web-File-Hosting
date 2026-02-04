import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, createError, getCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { path: relativePath, name, names } = body;

  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;
  const role = user?.role || 'public';

  const rootDir = path.resolve('files');
  const trashDir = path.join(rootDir, 'Trash');
  const dirPath = relativePath ? path.join(rootDir, relativePath) : rootDir;
  
  const itemsToDelete = names || [name];

  for (const itemName of itemsToDelete) {
    const targetPath = path.join(dirPath, itemName);

    if (!targetPath.startsWith(rootDir)) {
      throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
    }

    if (!fs.existsSync(targetPath)) continue;

    const isInTrash = targetPath.startsWith(trashDir);

    try {
      if (isInTrash) {
        fs.rmSync(targetPath, { recursive: true, force: true });
      } else {
        if (!fs.existsSync(trashDir)) {
          fs.mkdirSync(trashDir);
        }
        const timestamp = Date.now();
        const prefix = (role === 'public' || targetPath.includes('/Public/') || targetPath.includes('\\Public\\')) ? 'PUBLIC_' : '';
        const baseName = path.basename(itemName);
        const trashName = `${prefix}${path.parse(baseName).name}_${timestamp}${path.parse(baseName).ext}`;
        const destPath = path.join(trashDir, trashName);
        fs.renameSync(targetPath, destPath);
      }
    } catch (e: any) {
      console.error('[DELETE ERROR]:', e);
      throw createError({ 
        statusCode: 500, 
        statusMessage: `Delete failed: ${e.message || 'Unknown error'}` 
      });
    }
  }

  const favDbPath = path.resolve('server/data/favorites.json');
  if (fs.existsSync(favDbPath)) {
    let favs = JSON.parse(fs.readFileSync(favDbPath, 'utf-8'));
    Object.keys(favs).forEach(u => {
      favs[u] = favs[u].filter((p: string) => !itemsToDelete.some(itemName => {
        const itemPath = relativePath ? `${relativePath}/${itemName}` : itemName;
        return p === itemPath || p.startsWith(itemPath + '/');
      }));
    });
    fs.writeFileSync(favDbPath, JSON.stringify(favs, null, 2));
  }

  const limitsPath = path.resolve('server/data/limits.json');
  if (fs.existsSync(limitsPath)) {
    let limits = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));
    itemsToDelete.forEach(itemName => {
      const targetPath = path.join(dirPath, itemName);
      const rel = path.relative(rootDir, targetPath).replace(/\\/g, '/');
      const folderKey = rel || 'root';
      Object.keys(limits).forEach(k => {
        if (k === folderKey || k.startsWith(folderKey + '/')) {
          delete limits[k];
        }
      });
    });
    fs.writeFileSync(limitsPath, JSON.stringify(limits, null, 2));
  }

  return { success: true };
});