import { defineEventHandler, readBody, createError } from 'h3';
import AdmZip from 'adm-zip';
import path from 'path';
import fs from 'fs';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { names } = body;
  const rootDir = path.resolve('files');

  if (!names || !Array.isArray(names)) {
    throw createError({ statusCode: 400, statusMessage: 'No files selected' });
  }

  const zip = new AdmZip();
  for (const name of names) {
    const fullPath = path.join(rootDir, name);
    if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      if (stats.isDirectory()) {
        zip.addLocalFolder(fullPath, path.basename(name));
      } else {
        zip.addLocalFile(fullPath);
      }
    }
  }

  const buffer = zip.toBuffer();
  setResponseHeader(event, 'Content-Type', 'application/zip');
  setResponseHeader(event, 'Content-Disposition', `attachment; filename="Archive_${Date.now()}.zip"`);
  return buffer;
});