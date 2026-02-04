import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, createError, getCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { path: relativePath, name, type, forceRoot } = body;
  const rootDir = path.resolve('files');

  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;

  if (user?.role === 'public' && forceRoot) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  let targetDir;
  if (relativePath) {
    const normalized = path.normalize(relativePath).replace(/^(\.\.(\/|\\|$))+/, '');
    const resolved = path.resolve(rootDir, normalized);
    targetDir = resolved.startsWith(rootDir) ? resolved : path.join(rootDir, user?.role === 'public' ? 'Public' : 'General');
  } else {
    if (forceRoot) {
      targetDir = rootDir;
    } else {
      const defaultFolder = user?.role === 'public' ? 'Public' : 'General';
      targetDir = path.join(rootDir, defaultFolder);
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });
    }
  }

  if (!targetDir.startsWith(rootDir)) throw createError({ statusCode: 403 });

  const finalName = name.slice(0, 100);
  const targetPath = path.join(targetDir, finalName);
  if (fs.existsSync(targetPath)) throw createError({ statusCode: 409, statusMessage: 'Item already exists' });

  if (type === 'folder') fs.mkdirSync(targetPath);
  else fs.writeFileSync(targetPath, '', 'utf-8');
  
  return { success: true };
});