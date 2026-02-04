import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { defineEventHandler, readBody, createError, setCookie } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const hash = createHash('sha256').update(body.password).digest('hex');
  const dbPath = path.resolve(process.cwd(), 'server/data/users.json');

  if (!fs.existsSync(dbPath)) {
    throw createError({ statusCode: 500, statusMessage: 'Database error' });
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const userEntry = Object.values(db).find((u: any) => u.username === body.username && u.password === hash);

  if (!userEntry) {
    throw createError({ statusCode: 401, statusMessage: 'Invalid credentials' });
  }

  const { password, ...sessionData } = userEntry as any;

  setCookie(event, 'user_session', JSON.stringify(sessionData), {
    httpOnly: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 7
  });

  return { success: true };
});