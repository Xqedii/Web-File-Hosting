import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { path: relativePath, icon } = body;

  const dbPath = path.resolve('server/data/icons.json');
  const dataDir = path.dirname(dbPath);
  
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  let icons: Record<string, string> = {};
  if (fs.existsSync(dbPath)) {
    icons = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  }

  const key = (relativePath || '').replace(/^\/|\/$/g, '');
  if (!icon) {
    delete icons[key];
  } else {
    icons[key] = icon;
  }

  fs.writeFileSync(dbPath, JSON.stringify(icons, null, 2));
  return { success: true };
});