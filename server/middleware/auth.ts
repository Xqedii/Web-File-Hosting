import fs from 'node:fs';
import path from 'node:path';

export default defineEventHandler((event) => {
  const url = event.node.req.url || '';
  const isApi = url.startsWith('/api/');
  const isPublicApi = url === '/api/login' || url.startsWith('/api/media');

  if (isApi && !isPublicApi) {
    const userCookie = getCookie(event, 'user_session');
    if (!userCookie) {
      throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
    }

    try {
      const userData = JSON.parse(userCookie);
      const dbPath = path.resolve(process.cwd(), 'server/data/users.json');
      const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
      const userExists = Object.values(db).find((u: any) => u.username === userData.username && u.role === userData.role);
      
      if (!userExists) {
        throw new Error();
      }
    } catch (e) {
      throw createError({ statusCode: 401, statusMessage: 'Invalid Session' });
    }
  }
});