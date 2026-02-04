import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, createError, getCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;

  if (user?.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  const body = await readBody(event);
  const { path: relativePath, limitGb } = body;

  const limitsPath = path.resolve('server/data/limits.json');
  const dataDir = path.dirname(limitsPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let limits: Record<string, number> = {};
  if (fs.existsSync(limitsPath)) {
    limits = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));
  }

  const folderKey = relativePath || 'root';
  if (limitGb <= 0) {
    delete limits[folderKey];
  } else {
    limits[folderKey] = limitGb;
  }

  fs.writeFileSync(limitsPath, JSON.stringify(limits, null, 2));
  return { success: true };
});