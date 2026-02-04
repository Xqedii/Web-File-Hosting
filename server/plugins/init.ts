import fs from 'node:fs';
import path from 'node:path';

export default defineNitroPlugin(() => {
  const rootDir = path.resolve('files');
  const publicDir = path.join(rootDir, 'Public');

  if (!fs.existsSync(rootDir)) {
    fs.mkdirSync(rootDir, { recursive: true });
  }

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
    fs.writeFileSync(path.join(publicDir, 'Xqedii.txt'), 'https://xqedii.dev', 'utf-8');
  }

  ['Trash', 'General'].forEach((folder) => {
    const fullPath = path.join(rootDir, folder);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
  });
});