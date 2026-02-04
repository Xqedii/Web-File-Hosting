import fs from 'fs';
import path from 'path';
import { defineEventHandler, readBody, getCookie, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const userCookie = getCookie(event, 'user_session');
  if (!userCookie) throw createError({ statusCode: 401 });

  const user = JSON.parse(userCookie);
  const dbPath = path.resolve('server/data/favorites.json');
  
  if (!fs.existsSync(path.dirname(dbPath))) fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  let favorites = fs.existsSync(dbPath) ? JSON.parse(fs.readFileSync(dbPath, 'utf-8')) : {};
  
  if (!favorites[user.username]) favorites[user.username] = [];
  
  const index = favorites[user.username].indexOf(body.path);
  if (index > -1) favorites[user.username].splice(index, 1);
  else favorites[user.username].push(body.path);
  
  fs.writeFileSync(dbPath, JSON.stringify(favorites, null, 2));
  return { success: true };
});