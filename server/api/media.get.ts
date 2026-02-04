import fs from 'node:fs';
import path from 'node:path';
import { defineEventHandler, getQuery, createError, sendStream, setResponseHeader, setResponseStatus } from 'h3';

export default defineEventHandler(async (event) => {
  const query = getQuery(event);
  const relativePath = (query.path as string) || '';
  const rootDir = path.resolve('files');
  const targetPath = path.join(rootDir, relativePath);

  if (!targetPath.startsWith(rootDir)) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }

  if (!fs.existsSync(targetPath)) {
    throw createError({ statusCode: 404, statusMessage: 'File not found' });
  }

  const stat = fs.statSync(targetPath);
  const fileSize = stat.size;
  const range = event.node.req.headers.range;

  const ext = path.extname(targetPath).toLowerCase();
  let mimeType = 'application/octet-stream';

  const mimeMap: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.m4a': 'audio/mp4',
    '.flac': 'audio/flac',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogv': 'video/ogg',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska'
  };

  if (mimeMap[ext]) {
    mimeType = mimeMap[ext];
  }

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;

    if (start >= fileSize || end >= fileSize) {
        setResponseStatus(event, 416);
        setResponseHeader(event, 'Content-Range', `bytes */${fileSize}`);
        return;
    }

    const file = fs.createReadStream(targetPath, { start, end });
    
    setResponseStatus(event, 206);
    setResponseHeader(event, 'Content-Range', `bytes ${start}-${end}/${fileSize}`);
    setResponseHeader(event, 'Accept-Ranges', 'bytes');
    setResponseHeader(event, 'Content-Length', chunksize);
    setResponseHeader(event, 'Content-Type', mimeType);

    file.on('error', (err) => {
    });
    return sendStream(event, file);
  } else {
    setResponseHeader(event, 'Content-Length', fileSize);
    setResponseHeader(event, 'Content-Type', 'application/octet-stream');
    setResponseHeader(event, 'Content-Disposition', `attachment; filename="${path.basename(targetPath)}"`);
    return sendStream(event, fs.createReadStream(targetPath));
  }
});