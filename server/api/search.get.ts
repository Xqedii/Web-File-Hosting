import fs from 'fs';
import path from 'path';
import { defineEventHandler, getQuery } from 'h3';

const getAllFiles = (dirPath: string, rootPath: string, arrayOfFiles: any[] = [], query: string) => {
  if (!fs.existsSync(dirPath)) return arrayOfFiles;
  
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (file.startsWith('.') || file === 'Trash') return;
    
    let stat;
    try { 
      stat = fs.statSync(fullPath); 
    } catch (e) { 
      return; 
    }

    if (file.toLowerCase().includes(query.toLowerCase())) {
      const relativePath = fullPath.replace(rootPath, '').replace(/^[\/\\]/, '').replace(/\\/g, '/');
      const isZip = file.toLowerCase().endsWith('.zip');
      arrayOfFiles.push({
        name: file,
        path: relativePath,
        isDirectory: stat.isDirectory() || isZip,
        isArchive: isZip,
        size: stat.isDirectory() ? '' : (stat.size / (1024 * 1024)).toFixed(2) + ' MB',
        modified: stat.mtime.toISOString(),
        owner: relativePath.split('/')[0] || 'General',
        type: (stat.isDirectory() || isZip) ? 'folder' : file.split('.').pop()
      });
    }
    
    if (stat.isDirectory()) {
      getAllFiles(fullPath, rootPath, arrayOfFiles, query);
    }
  });
  return arrayOfFiles;
};

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const q = (query.q as string) || '';
  if (!q) return [];
  
  const rootDir = path.resolve('files');
  return getAllFiles(rootDir, rootDir, [], q).slice(0, 100);
});