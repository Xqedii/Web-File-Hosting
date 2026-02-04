import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, createError } from 'h3';
import AdmZip from 'adm-zip';
import { execSync } from 'child_process';
import { spawnSync } from 'child_process';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { path: relativePath } = body;

  const rootDir = path.resolve('files');
  const targetPath = path.join(rootDir, relativePath);

  if (!fs.existsSync(targetPath)) {
    throw createError({ statusCode: 404, statusMessage: 'Archive not found' });
  }

  const getUniquePath = (targetDir: string, name: string) => {
    const ext = path.extname(name);
    const base = path.basename(name, ext);
    let finalPath = path.join(targetDir, name);
    let counter = 1;
    while (fs.existsSync(finalPath)) {
      finalPath = path.join(targetDir, `${base} (${counter})${ext}`);
      counter++;
    }
    return finalPath;
  };

  const fileName = relativePath.toLowerCase();
  const extractPath = path.dirname(targetPath);

try {
if (fileName.endsWith('.zip')) {
      const zip = new AdmZip(targetPath);
      const entries = zip.getEntries();
      
      for (const entry of entries) {
        const entryName = entry.entryName;
        const fullDestPath = path.resolve(extractPath, entryName);
        
        if (!fullDestPath.startsWith(rootDir)) {
          continue;
        }

        if (entry.isDirectory) {
          if (!fs.existsSync(fullDestPath)) {
            fs.mkdirSync(fullDestPath, { recursive: true });
          }
        } else {
          const dirOfFile = path.dirname(fullDestPath);
          if (!fs.existsSync(dirOfFile)) {
            fs.mkdirSync(dirOfFile, { recursive: true });
          }
          const finalFilePath = getUniquePath(dirOfFile, path.basename(entryName));
          fs.writeFileSync(finalFilePath, entry.getData());
        }
      }
    } else if (fileName.endsWith('.tar.gz') || fileName.endsWith('.tgz')) {
      spawnSync('tar', ['-xzf', targetPath, '-C', extractPath, '--strip-components=0']);
    } else if (fileName.endsWith('.tar')) {
      spawnSync('tar', ['-xf', targetPath, '-C', extractPath, '--strip-components=0']);
    } else {
      throw new Error('Unsupported archive format');
    }
    return { success: true };
  } catch (e: any) {
    throw createError({ statusCode: 500, statusMessage: 'Extraction failed: ' + e.message });
  }
});