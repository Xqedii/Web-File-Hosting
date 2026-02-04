import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { path: relativePath, oldName, newName } = body;

  const rootDir = path.resolve('files');

  const targetDir = relativePath 
    ? path.resolve(rootDir, relativePath) 
    : rootDir;

  const finalNewName = path.basename(newName).slice(0, 100);
  const oldPath = path.join(targetDir, oldName);
  const newPath = path.join(targetDir, finalNewName);

  const relOld = path.relative(rootDir, oldPath).replace(/\\/g, '/');
  const relNew = path.relative(rootDir, newPath).replace(/\\/g, '/');

  if (relOld.startsWith('..') || relNew.startsWith('..') || path.isAbsolute(relOld) || path.isAbsolute(relNew)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden: Path traversal detected' });
  }

  if (!fs.existsSync(oldPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Source file/folder not found' });
  }

  if (fs.existsSync(newPath)) {
    if (oldPath.toLowerCase() !== newPath.toLowerCase()) {
      throw createError({ statusCode: 409, statusMessage: 'A file or folder with this name already exists' });
    }
  }

  try {
    fs.renameSync(oldPath, newPath);

    const favDbPath = path.resolve('server/data/favorites.json');
    if (fs.existsSync(favDbPath)) {
      let favs = JSON.parse(fs.readFileSync(favDbPath, 'utf-8'));
      Object.keys(favs).forEach(user => {
        favs[user] = favs[user].map((p: string) => {
          if (p === relOld) return relNew;
          if (p.startsWith(relOld + '/')) return p.replace(relOld + '/', relNew + '/');
          return p;
        });
      });
      fs.writeFileSync(favDbPath, JSON.stringify(favs, null, 2));
    }

    const iconsDbPath = path.resolve('server/data/icons.json');
    if (fs.existsSync(iconsDbPath)) {
      let icons = JSON.parse(fs.readFileSync(iconsDbPath, 'utf-8'));
      const newIcons: Record<string, string> = {};
      Object.keys(icons).forEach(k => {
        if (k === relOld) {
          newIcons[relNew] = icons[k];
        } else if (k.startsWith(relOld + '/')) {
          const newKey = k.replace(relOld + '/', relNew + '/');
          newIcons[newKey] = icons[k];
        } else {
          newIcons[k] = icons[k];
        }
      });
      fs.writeFileSync(iconsDbPath, JSON.stringify(newIcons, null, 2));
    }

    return { success: true };
  } catch (e: any) {
    let statusMessage = 'Rename failed';
    if (e.code === 'EPERM' || e.code === 'EBUSY') {
      statusMessage = 'System locked the folder';
    } else if (e.code === 'ENOTEMPTY') {
      statusMessage = 'Folder is not empty';
    }
    throw createError({
      statusCode: 500,
      statusMessage: statusMessage
    });
  }
});