import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { defineEventHandler, getCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const rootDir = path.resolve('files');
  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;
  const iconsPath = path.resolve('server/data/icons.json');
  const icons = fsSync.existsSync(iconsPath) ? JSON.parse(fsSync.readFileSync(iconsPath, 'utf-8')) : {};

  try {
    const entries = await fs.readdir(rootDir, { withFileTypes: true });
    let categories = entries
      .filter(entry => entry.isDirectory() && !['General', 'Trash', 'Recent', 'Favorites'].includes(entry.name))
      .map(entry => ({ 
        name: entry.name, 
        path: entry.name,
        icon: icons[entry.name] || ''
      }));

    if (user?.role === 'public') {
      return categories.filter(c => c.name === 'Public');
    }
    return categories;
  } catch (e) {
    return [];
  }
});