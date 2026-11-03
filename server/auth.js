'use strict';
const crypto = require('crypto');

const SESSION_TTL = 7 * 24 * 3600 * 1000;
const sessions = new Map();
const attempts = new Map();

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { salt, hash };
}

function verifyPassword(password, stored) {
  if (!stored || !stored.salt || !stored.hash) return false;
  const hash = crypto.scryptSync(String(password), stored.salt, 64);
  const expected = Buffer.from(stored.hash, 'hex');
  return hash.length === expected.length && crypto.timingSafeEqual(hash, expected);
}

function createSession() {
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, Date.now() + SESSION_TTL);
  return token;
}

function checkSession(token) {
  if (!token) return false;
  const exp = sessions.get(token);
  if (!exp) return false;
  if (Date.now() > exp) {
    sessions.delete(token);
    return false;
  }
  return true;
}

function destroySession(token) {
  sessions.delete(token);
}

function destroyAllSessions() {
  sessions.clear();
}

/** حد بسيط لمحاولات الدخول: 10 محاولات لكل IP خلال 15 دقيقة */
function allowAttempt(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const rec = attempts.get(ip) || { count: 0, reset: now + windowMs };
  if (now > rec.reset) {
    rec.count = 0;
    rec.reset = now + windowMs;
  }
  rec.count += 1;
  attempts.set(ip, rec);
  return rec.count <= 10;
}

function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (checkSession(token)) return next();
  res.status(401).json({ error: 'غير مصرّح — سجّل الدخول أولاً' });
}

module.exports = {
  hashPassword,
  verifyPassword,
  createSession,
  checkSession,
  destroySession,
  destroyAllSessions,
  allowAttempt,
  requireAuth
};
