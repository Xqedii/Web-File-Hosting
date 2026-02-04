import fs from 'fs';
import path from 'path';
import { defineEventHandler, createError, getQuery, getCookie } from 'h3';
import AdmZip from 'adm-zip';
import { spawnSync } from 'child_process';

const formatFileSize = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
};

const getIcons = () => {
  const p = path.resolve('server/data/icons.json');
  return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf-8')) : {};
};

const getRecentFiles = (dirPath: string, rootPath: string, user: any, userFavorites: string[], icons: any, arrayOfFiles: any[] = []) => {
  const files = fs.readdirSync(dirPath);
  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    if (file.startsWith('.') || file === 'Trash') return;
    
    let stat;
    try { stat = fs.statSync(fullPath); } catch (e) { return; }
    
    const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
    if (stat.mtimeMs > oneWeekAgo) {
      const isZip = file.toLowerCase().endsWith('.zip');
      const relativePath = fullPath.replace(rootPath, '').replace(/^[\/\\]/, '').replace(/\\/g, '/');
      
      if (user?.role === 'public' && !relativePath.startsWith('Public')) return;

      const isRootFolder = stat.isDirectory() && !relativePath.includes('/');
      if (!isRootFolder) {
        const pathParts = relativePath.split('/');
        let ownerName = pathParts.length > 1 ? pathParts[0] : 'Me';
        if (ownerName === 'General') ownerName = 'Me';

        arrayOfFiles.push({
          name: file,
          path: relativePath,
          isDirectory: stat.isDirectory() || isZip,
          isArchive: isZip,
          isFavorite: userFavorites.includes(relativePath),
          icon: icons[relativePath] || '',
          size: stat.isDirectory() ? '' : formatFileSize(stat.size),
          modified: stat.mtime.toISOString(),
          owner: ownerName,
          type: (stat.isDirectory() || isZip) ? 'folder' : file.split('.').pop(),
          mtimeMs: stat.mtimeMs
        });
      }
    }
    if (stat.isDirectory()) getRecentFiles(fullPath, rootPath, user, userFavorites, icons, arrayOfFiles);
  });
  return arrayOfFiles;
};

export default defineEventHandler((event) => {
  const query = getQuery(event);
  const rawPath = (query.path as string) || '';
  const page = parseInt(query.page as string) || 1;
  const limit = parseInt(query.limit as string) || 50;
  const skip = (page - 1) * limit;
  const icons = getIcons();

  const fullRelativePath = decodeURIComponent(rawPath).replace(/\r/g, '').replace(/\/+$/, '').trim();
  const rootDir = path.resolve('files');

  const userCookie = getCookie(event, 'user_session');
  const user = userCookie ? JSON.parse(userCookie) : null;
  const role = user?.role || 'public';

  const favDbPath = path.resolve('server/data/favorites.json');
  const userFavorites = (user && fs.existsSync(favDbPath)) 
    ? (JSON.parse(fs.readFileSync(favDbPath, 'utf-8'))[user.username] || [])
    : [];

  if (fullRelativePath === 'Recent') {
    const recentFiles = getRecentFiles(rootDir, rootDir, user, userFavorites, icons, []);
    const sorted = recentFiles.sort((a, b) => b.mtimeMs - a.mtimeMs);
    return sorted.slice(skip, skip + limit);
  }

  if (fullRelativePath === 'Favorites') {
    if (!fs.existsSync(favDbPath)) return [];
    const favoritesData = JSON.parse(fs.readFileSync(favDbPath, 'utf-8'));
    const currentFavorites = favoritesData[user?.username] || [];
    const pagedFavs = currentFavorites.slice(skip, skip + limit);
    
    return pagedFavs.map((favPath: string) => {
      const fullPath = path.join(rootDir, favPath);
      if (!fs.existsSync(fullPath)) return null;
      const s = fs.statSync(fullPath);
      const isZip = favPath.toLowerCase().endsWith('.zip');
      const parts = favPath.split('/');
      return {
        name: parts.pop(),
        path: favPath,
        isDirectory: s.isDirectory() || isZip,
        isArchive: isZip,
        isFavorite: true,
        icon: icons[favPath] || '',
        size: s.isDirectory() ? '' : formatFileSize(s.size),
        modified: s.mtime.toISOString(),
        owner: parts[0] === 'General' ? 'Me' : (parts[0] || 'Me'),
        type: (s.isDirectory() || isZip) ? 'folder' : favPath.split('.').pop()
      };
    }).filter(Boolean);
  }

  let archiveFile: string | null = null;
  let remainingPath = '';
  const segments = fullRelativePath.split('/').filter(Boolean);
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
    const items = new Map();
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
          const listArgs = isGz ? ['-ztf', archivePath] : ['-tf', archivePath];
          const output = spawnSync('tar', listArgs).stdout.toString();
          const allEntries = output.split(/\r?\n/).filter(Boolean);
          const filtered = allEntries.filter(entryName => {
             const entryPath = entryName.trim().replace(/\\/g, '/').replace(/\/+$/, '');
             return remainingPath === '' || entryPath.startsWith(remainingPath + '/');
          });

          filtered.slice(skip, skip + limit).forEach(entryName => {
            const entryPath = entryName.trim().replace(/\\/g, '/').replace(/\/+$/, '');
            const rel = remainingPath === '' ? entryPath : entryPath.substring(remainingPath.length + 1);
            if (!rel) return;
            const name = rel.split('/')[0];
            const isArchive = name.toLowerCase().endsWith('.zip');
            const isDir = rel.includes('/') || entryName.endsWith('/') || isArchive;
            if (!items.has(name)) {
              items.set(name, {
                name,
                isDirectory: isDir,
                isArchive,
                isFavorite: false,
                size: '',
                modified: new Date().toISOString(),
                owner: 'Archive',
                path: `${archiveFile}/${remainingPath ? remainingPath + '/' : ''}${name}`.replace(/\/+$/, ''),
                type: isDir ? 'folder' : name.split('.').pop()
              });
            }
          });
          return Array.from(items.values());
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

        const entries = zip.getEntries().filter(entry => {
          const entryPath = entry.entryName.trim().replace(/\\/g, '/').replace(/\/+$/, '');
          return internalTarget === '' || entryPath.startsWith(internalTarget + '/');
        });

        entries.slice(skip, skip + limit).forEach(entry => {
          const entryPath = entry.entryName.trim().replace(/\\/g, '/').replace(/\/+$/, '');
          const rel = internalTarget === '' ? entryPath : entryPath.substring(internalTarget.length + 1);
          if (!rel) return;
          const name = rel.split('/')[0];
          const isArchive = name.toLowerCase().endsWith('.zip');
          const isDir = rel.includes('/') || entry.isDirectory || isArchive;
          if (!items.has(name)) {
            items.set(name, {
              name,
              isDirectory: isDir,
              isArchive,
              isFavorite: false,
              size: isDir ? '' : formatFileSize(entry.header.size),
              modified: entry.header.time ? new Date(entry.header.time).toISOString() : new Date().toISOString(),
              owner: 'Archive',
              path: `${archiveFile}/${remainingPath ? remainingPath + '/' : ''}${name}`.replace(/\/+$/, ''),
              type: isDir ? 'folder' : name.split('.').pop()
            });
          }
        });
        return Array.from(items.values());
      }
    } catch (e) {
      return [];
    }
  }

  if (!fullRelativePath) {
    const categories = fs.readdirSync(rootDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && d.name !== 'Trash');
    const filteredCategories = role === 'public' ? categories.filter(c => c.name === 'Public') : categories;
    
    let allEntries: any[] = [];
    filteredCategories.forEach(cat => {
      const catPath = path.join(rootDir, cat.name);
      try {
        const files = fs.readdirSync(catPath);
        files.forEach(f => allEntries.push({ cat: cat.name, name: f }));
      } catch (e) {}
    });

    const pagedEntries = allEntries.slice(skip, skip + limit);
    return pagedEntries.map(entry => {
      const p = path.join(rootDir, entry.cat, entry.name);
      const s = fs.statSync(p);
      const isZip = entry.name.toLowerCase().endsWith('.zip');
      const itemPath = `${entry.cat}/${entry.name}`;
      const isDir = s.isDirectory();
      return {
        name: entry.name,
        path: itemPath,
        isDirectory: isDir || isZip,
        isArchive: isZip,
        isFavorite: userFavorites.includes(itemPath),
        size: isDir ? '' : formatFileSize(s.size),
        modified: s.mtime.toISOString(),
        owner: (entry.cat === 'General' && role === 'admin') ? (user?.username || 'Me') : entry.cat,
        type: (isDir || isZip) ? 'folder' : entry.name.split('.').pop()
      };
    });
  }

if (!fullRelativePath || fullRelativePath === 'root') {
    const categories = fs.readdirSync(rootDir, { withFileTypes: true })
      .filter(d => d.isDirectory() && !['General', 'Trash', 'Recent', 'Favorites'].includes(d.name));
    const filteredCategories = role === 'public' ? categories.filter(c => c.name === 'Public') : categories;
    
    let allEntries: any[] = [];
    filteredCategories.forEach(cat => {
      const catPath = path.join(rootDir, cat.name);
      try {
        const files = fs.readdirSync(catPath);
        files.forEach(f => allEntries.push({ cat: cat.name, name: f }));
      } catch (e) {}
    });

    const pagedEntries = allEntries.slice(skip, skip + limit);
    return pagedEntries.map(entry => {
      const p = path.join(rootDir, entry.cat, entry.name);
      if (!fs.existsSync(p)) return null;
      const s = fs.statSync(p);
      const isZip = entry.name.toLowerCase().endsWith('.zip');
      const itemPath = `${entry.cat}/${entry.name}`;
      const isDir = s.isDirectory();
      return {
        name: entry.name,
        path: itemPath,
        isDirectory: isDir || isZip,
        isArchive: isZip,
        isFavorite: userFavorites.includes(itemPath),
        size: isDir ? '' : formatFileSize(s.size),
        modified: s.mtime.toISOString(),
        owner: (entry.cat === 'General' && role === 'admin') ? (user?.username || 'Me') : entry.cat,
        type: (isDir || isZip) ? 'folder' : entry.name.split('.').pop()
      };
    }).filter(Boolean);
  }

const targetPath = path.join(rootDir, fullRelativePath);
  if (!fs.existsSync(targetPath)) return [];
  const stat = fs.statSync(targetPath);
  let dirToRead = stat.isDirectory() ? targetPath : path.dirname(targetPath);
  let clientRel = stat.isDirectory() ? fullRelativePath : path.dirname(fullRelativePath).replace(/\\/g, '/');
  if (clientRel === '.') clientRel = '';

  try {
    const typeMapping: Record<string, string[]> = {
      doc: ['txt', 'doc', 'docx', 'pdf', 'rtf', 'odt', 'md'],
      img: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'],
      audio: ['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a'],
      video: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm'],
      logs: ['log'],
      sheet: ['xls', 'xlsx', 'csv', 'ods'],
      pres: ['ppt', 'pptx', 'key', 'odp'],
      archive: ['zip', 'rar', '7z', 'tar', 'gz']
    };

    const sortOrder = (query.sortOrder as string) || 'desc';
    const filterTypes = query.types ? (Array.isArray(query.types) ? query.types : [query.types]) : [];
    const filterOwner = (query.owner as string) || 'All';
    const filterDateFrom = (query.dateFrom as string) || '';
    const filterDateTo = (query.dateTo as string) || '';

    const allFileObjects = fs.readdirSync(dirToRead).filter(name => {
      if (fullRelativePath === 'Trash' && role === 'public') return name.startsWith('PUBLIC_');
      return true;
    }).map(itemName => {
      const p = path.join(dirToRead, itemName);
      const s = fs.statSync(p);
      const isZip = itemName.toLowerCase().endsWith('.zip');
      const isDir = s.isDirectory();
      const displayName = (fullRelativePath === 'Trash' && itemName.startsWith('PUBLIC_')) ? itemName.replace('PUBLIC_', '') : itemName;
      const itemPath = clientRel ? `${clientRel}/${itemName}` : itemName;
      const extension = itemName.split('.').pop()?.toLowerCase() || '';

      let containedExtensions: string[] = [];
      if (isDir && !isZip) {
        try {
          const exts = new Set<string>();
          fs.readdirSync(p, { withFileTypes: true }).slice(0, 10).forEach(sub => { if (sub.isFile()) { const e = sub.name.split('.').pop()?.toLowerCase(); if (e) exts.add(e); } });
          containedExtensions = Array.from(exts);
        } catch (e) {}
      }

      const ownerName = (fullRelativePath === 'Trash' && itemName.startsWith('PUBLIC_')) ? 'Public' : (role === 'admin' ? (user?.username || 'Me') : 'Me');

      return {
        name: displayName,
        path: itemPath,
        isDirectory: isDir || isZip,
        isArchive: isZip,
        isFavorite: userFavorites.includes(itemPath),
        icon: icons[itemPath] || '',
        size: isDir ? '' : formatFileSize(s.size),
        modified: s.mtime.toISOString(),
        mtimeMs: s.mtimeMs,
        owner: ownerName,
        type: (isDir || isZip) ? 'folder' : extension,
        containedExtensions
      };
    });

    const filtered = allFileObjects.filter(file => {
      if (filterOwner !== 'All') {
        if (filterOwner === 'Me' && file.owner !== (user?.username || 'Me')) return false;
      }
      if (filterDateFrom && new Date(file.modified).setHours(0,0,0,0) < new Date(filterDateFrom).setHours(0,0,0,0)) return false;
      if (filterDateTo && new Date(file.modified).setHours(0,0,0,0) > new Date(filterDateTo).setHours(23,59,59,999)) return false;
      if (filterTypes.length > 0) {
        if (file.isDirectory && !file.isArchive) {
          return filterTypes.some((t: string) => {
            if (t === 'other') {
              const allKnown = Object.values(typeMapping).flat();
              return file.containedExtensions.some(ext => !allKnown.includes(ext));
            }
            return typeMapping[t]?.some(ext => file.containedExtensions.includes(ext));
          });
        }
        const ext = file.path.split('.').pop()?.toLowerCase() || '';
        return filterTypes.some((t: string) => {
          if (t === 'other') {
            const allKnown = Object.values(typeMapping).flat();
            return !allKnown.includes(ext);
          }
          return typeMapping[t]?.includes(ext);
        });
      }
      return true;
    });

    filtered.sort((a, b) => sortOrder === 'desc' ? b.mtimeMs - a.mtimeMs : a.mtimeMs - b.mtimeMs);
    return filtered.slice(skip, skip + limit);
  } catch (e) {
    throw createError({ statusCode: 500 });
  }
});