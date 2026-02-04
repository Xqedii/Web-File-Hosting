import fs from 'node:fs';
import path from 'node:path';
import { defineEventHandler, readBody, getCookie, setCookie, createError } from 'h3';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const userCookie = getCookie(event, 'user_session');

  if (!userCookie) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }

  let sessionUser;
  try {
    sessionUser = JSON.parse(decodeURIComponent(userCookie));
  } catch (e) {
    sessionUser = {};
  }

  const dbPath = path.resolve(process.cwd(), 'server/data/users.json');
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  const userKey = Object.keys(db).find(k => db[k].username === sessionUser.username);
  
  if (!userKey) throw createError({ statusCode: 404, statusMessage: 'User not found' });

  const user = db[userKey];
  const safeUsername = user.username.replace(/[^a-z0-9]/gi, '_').toLowerCase();
  const publicDir = path.resolve(process.cwd(), 'public');
  const bgDir = path.join(publicDir, 'uploads', 'backgrounds');
  const avatarDir = path.join(publicDir, 'uploads', 'avatars');

  if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });
  if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

  if (body.avatar && body.avatar.startsWith('data:image')) {
    const base64Data = body.avatar.replace(/^data:image\/\w+;base64,/, "");
    const fileName = `${safeUsername}_avatar.png`;
    fs.writeFileSync(path.join(avatarDir, fileName), base64Data, 'base64');
    user.avatar = `/uploads/avatars/${fileName}?t=${Date.now()}`;
  }

  if (body.background === null) {
    user.background = null;
  } else if (body.background && body.background.startsWith('data:image')) {
    const base64Data = body.background.replace(/^data:image\/\w+;base64,/, "");
    const fileName = `${safeUsername}.png`;
    const fullPath = path.join(bgDir, fileName);
    fs.writeFileSync(fullPath, base64Data, 'base64');
    user.background = `/uploads/backgrounds/${fileName}?t=${Date.now()}`;
  }

  user.username = (body.username || user.username).replace(/[/<>]/g, "").slice(0, 20);
  user.backgroundBlur = body.backgroundBlur !== undefined ? Number(body.backgroundBlur) : user.backgroundBlur;
  user.backgroundBrightness = body.backgroundBrightness !== undefined ? Number(body.backgroundBrightness) : user.backgroundBrightness;
  user.color = body.color || user.color;

  db[userKey] = user;
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

  const { password, ...sessionData } = user;
  setCookie(event, 'user_session', JSON.stringify(sessionData), {
    httpOnly: false,
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
    sameSite: 'lax'
  });

  return { success: true, user: sessionData };
});