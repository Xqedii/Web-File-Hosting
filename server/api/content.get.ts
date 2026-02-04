import fs from 'fs';
import path from 'path';
import { defineEventHandler, createError, getQuery, getCookie } from 'h3';
import AdmZip from 'adm-zip';
import { spawnSync } from 'child_process';

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const rawPath = (query.path as string) || '';
  const relativePath = decodeURIComponent(rawPath).replace(/\r/g, '').replace(/\/+$/, '').trim();
  const rootDir = path.resolve('files');

  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;
  const favDbPath = path.resolve('server/data/favorites.json');
  const userFavorites = (user && fs.existsSync(favDbPath)) 
    ? (JSON.parse(fs.readFileSync(favDbPath, 'utf-8'))[user.username] || [])
    : [];
  const isFavorite = userFavorites.includes(relativePath);

  const iconsPath = path.resolve('server/data/icons.json');
  const icons = fs.existsSync(iconsPath) ? JSON.parse(fs.readFileSync(iconsPath, 'utf-8')) : {};
  const icon = icons[relativePath] || '';

  let archiveFile: string | null = null;
  let remainingPath = '';
  const segments = relativePath.split('/').filter(Boolean);
  let currentPathBuilder = '';

  for (let i = 0; i < segments.length; i++) {
    currentPathBuilder = currentPathBuilder ? `${currentPathBuilder}/${segments[i]}` : segments[i];
    const fullCheck = path.join(rootDir, currentPathBuilder);
    if (fs.existsSync(fullCheck) && fs.statSync(fullCheck).isFile()) {
      const low = currentPathBuilder.toLowerCase();
      if (low.endsWith('.zip') || low.endsWith('.tar.gz') || low.endsWith('.tar') || low.endsWith('.tgz')) {
        archiveFile = currentPathBuilder;
        remainingPath = segments.slice(i + 1).join('/');
        break;
      }
    }
  }

  if (archiveFile) {
    const archivePath = path.join(rootDir, archiveFile);
    let zip: AdmZip | null = null;
    let internalTarget = remainingPath;

    try {
      if (archiveFile.toLowerCase().endsWith('.zip')) {
        zip = new AdmZip(archivePath);
      } else {
        const isGz = archiveFile.toLowerCase().endsWith('.gz') || archiveFile.toLowerCase().endsWith('.tgz');
        const internalParts = remainingPath.split('/').filter(Boolean);
        let currentLevelPath = '';
        
        for (let i = 0; i < internalParts.length; i++) {
          const part = internalParts[i];
          if (part.toLowerCase().endsWith('.zip')) {
            const entryToExtract = currentLevelPath ? `${currentLevelPath}/${part}` : part;
            const args = isGz ? ['-zxf', archivePath, '-O', entryToExtract] : ['-xf', archivePath, '-O', entryToExtract];
            const buffer = spawnSync('tar', args, { maxBuffer: 1024 * 1024 * 100 }).stdout;
            zip = new AdmZip(buffer);
            internalTarget = internalParts.slice(i + 1).join('/');
            break;
          }
          currentLevelPath = currentLevelPath ? `${currentLevelPath}/${part}` : part;
        }

        if (!zip) {
          if (!remainingPath) return { isDirectory: true, content: null, readOnly: true, isFavorite };
          if (remainingPath.toLowerCase().endsWith('.zip')) return { isDirectory: true, content: null, readOnly: true, isFavorite };
          
          const listArgs = isGz ? ['-ztf', archivePath] : ['-tf', archivePath];
          const list = spawnSync('tar', listArgs).stdout.toString().split(/\r?\n/).map(l => l.trim());
          const isDir = list.some(line => line.replace(/\\/g, '/').startsWith(remainingPath + '/'));
          
          if (isDir) return { isDirectory: true, content: null, readOnly: true, isFavorite };

          const extractArgs = isGz ? ['-zxf', archivePath, '-O', remainingPath] : ['-xf', archivePath, '-O', remainingPath];
          const result = spawnSync('tar', extractArgs);
          const ext = path.extname(remainingPath).toLowerCase();
          if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
            return { content: `data:image/${ext.slice(1)};base64,${result.stdout.toString('base64')}`, readOnly: true, isFavorite };
          }
          return { content: result.stdout.toString('utf8'), readOnly: true, isFavorite };
        }
      }

      if (zip) {
        const pathParts = internalTarget.split('/').filter(Boolean);
        for (let i = 0; i < pathParts.length; i++) {
          const part = pathParts[i];
          const entries = zip.getEntries();
          const entry = entries.find(e => e.entryName.trim().replace(/\\/g, '/').replace(/\/$/, '') === part);
          if (entry && part.toLowerCase().endsWith('.zip')) {
            zip = new AdmZip(entry.getData());
            internalTarget = pathParts.slice(i + 1).join('/');
          }
        }

        if (!internalTarget) return { isDirectory: true, content: null, readOnly: true, isFavorite };
        
        const entries = zip.getEntries();
        const finalEntry = entries.find(e => e.entryName.trim().replace(/\\/g, '/').replace(/\/$/, '') === internalTarget.replace(/\/$/, ''));
        
        if (!finalEntry) {
          const isDirInZip = entries.some(e => e.entryName.trim().replace(/\\/g, '/').startsWith(internalTarget + '/'));
          if (isDirInZip || internalTarget.toLowerCase().endsWith('.zip')) return { isDirectory: true, content: null, readOnly: true, isFavorite };
          throw new Error();
        }

        if (finalEntry.isDirectory || internalTarget.toLowerCase().endsWith('.zip')) {
          return { isDirectory: true, content: null, readOnly: true, isFavorite };
        }

        const ext = path.extname(internalTarget).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg'].includes(ext)) {
          return { content: `data:image/${ext.slice(1)};base64,${finalEntry.getData().toString('base64')}`, readOnly: true, isFavorite };
        }
        return { content: finalEntry.getData().toString('utf8'), readOnly: true, isFavorite };
      }
    } catch (e) {
      throw createError({ statusCode: 500 });
    }
  }

  const targetPath = path.resolve(rootDir, relativePath);
  if (!targetPath.startsWith(rootDir)) {
    throw createError({ statusCode: 403, statusMessage: 'Unauthorized access' });
  }
  if (!fs.existsSync(targetPath)) throw createError({ statusCode: 404 });
  const stat = fs.statSync(targetPath);
  if (stat.isDirectory()) {
    const getStats = (dir: string) => {
      let size = 0, files = 0, folders = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });
      for (const item of items) {
        const p = path.join(dir, item.name);
        if (item.isDirectory()) {
          folders++;
          const s = getStats(p);
          size += s.size;
          files += s.files;
          folders += s.folders;
        } else {
          files++;
          size += fs.statSync(p).size;
        }
      }
      return { size, files, folders };
    };

    const folderStats = getStats(targetPath);
    const limitsPath = path.resolve('server/data/limits.json');
    let limits: Record<string, number> = {};
    if (fs.existsSync(limitsPath)) {
      limits = JSON.parse(fs.readFileSync(limitsPath, 'utf-8'));
    }

    const folderKey = relativePath || 'root';
    const customLimitGb = limits[folderKey];
    
    let totalBytes = 10 * 1024 * 1024 * 1024;
    if (customLimitGb) {
      totalBytes = customLimitGb * 1024 * 1024 * 1024;
    } else {
      try {
        const sfs = fs.statfsSync(rootDir);
        totalBytes = sfs.bsize * sfs.blocks;
      } catch (e) {}
    }

    return {
      isDirectory: true,
      isFavorite,
      icon,
      limitGb: customLimitGb || 0,
      totalBytes,
      stats: {
        ...folderStats,
        percent: Math.min(100, (folderStats.size / totalBytes) * 100).toFixed(2)
      }
    };
  }

  try {
    const ext = path.extname(targetPath).toLowerCase();
    const media = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.mp4', '.webm', '.ogv', '.mov', '.mkv'];
    if (media.includes(ext)) return { content: `/api/media?path=${encodeURIComponent(relativePath)}`, readOnly: true, isFavorite, icon };
    return { content: fs.readFileSync(targetPath, 'utf-8'), readOnly: false, isFavorite, icon };
  } catch (e) {
    throw createError({ statusCode: 500 });
  }
});