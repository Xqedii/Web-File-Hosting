import fs from 'node:fs';
import path from 'node:path';
import { defineEventHandler, getCookie, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const userCookie = getCookie(event, 'user_session');
  if (!userCookie) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  const user = JSON.parse(userCookie);
  const role = user.role;
  const dbPath = path.join(process.cwd(), 'server/data/users.json');

  if (!fs.existsSync(dbPath)) {
    throw createError({ statusCode: 500, statusMessage: 'Database error' });
  }

  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  if (!db[role]) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' });
  }

  const { password, ...profile } = db[role];
  return profile;
});