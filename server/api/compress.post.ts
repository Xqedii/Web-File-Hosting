import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, createError, getCookie } from 'h3';
import AdmZip from 'adm-zip';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { path: relativePath, names } = body;
  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;

  const rootDir = path.resolve('files');
  let outputDir;

  if (relativePath) {
    outputDir = path.join(rootDir, relativePath);
  } else {
    const defaultFolder = user?.role === 'public' ? 'Public' : 'General';
    outputDir = path.join(rootDir, defaultFolder);
  }
  
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  if (!names || !Array.isArray(names) || names.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No items selected' });
  }

  const zip = new AdmZip();
  
  try {
    for (const name of names) {
      const fullPath = path.join(rootDir, name);
      if (!fs.existsSync(fullPath)) continue;
      
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        zip.addLocalFolder(fullPath, path.basename(name));
      } else {
        zip.addLocalFile(fullPath);
      }
    }

    const archiveName = `Archive_${Date.now()}.zip`;
    const outputPath = path.join(outputDir, archiveName);
    
    zip.writeZip(outputPath);
    return { success: true };
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: 'Compression failed' });
  }
});