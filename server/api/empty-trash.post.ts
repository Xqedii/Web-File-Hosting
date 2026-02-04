import fs from 'fs';
import path from 'path';
import { defineEventHandler, createError, getCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;
  const role = user?.role || 'public';

  const rootDir = path.resolve('files');
  const trashDir = path.join(rootDir, 'Trash');

  if (!fs.existsSync(trashDir)) {
    return { success: true };
  }

  try {
    if (role === 'admin') {
      fs.rmSync(trashDir, { recursive: true, force: true });
      fs.mkdirSync(trashDir);
    } else {
      const files = fs.readdirSync(trashDir);
      for (const file of files) {
        if (file.startsWith('PUBLIC_')) {
          fs.rmSync(path.join(trashDir, file), { recursive: true, force: true });
        }
      }
    }
    return { success: true };
  } catch (e) {
    throw createError({ statusCode: 500, statusMessage: 'Could not empty trash' });
  }
});