// Single-user authentication, for when this runs somewhere public.
//
// Deliberately small: one password, server-side sessions, an HttpOnly cookie.
// No user table, no registration, no password reset — there is exactly one
// person who is allowed in, and anything more would be surface area for no gain.
//
// The password is never stored in plaintext. Either hand over a scrypt hash via
// STUDIO_PASSWORD_HASH, or a plaintext STUDIO_PASSWORD that is hashed at boot
// and never written down.

import crypto from 'node:crypto';

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const COOKIE = 'studio_session';

// Brute-force limits. Generous enough that a real person mistyping their own
// password never notices, tight enough that guessing is hopeless.
const MAX_ATTEMPTS = 8;
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const LOCKOUT_MS = 15 * 60 * 1000;

const SCRYPT = { N: 16384, r: 8, p: 1, keylen: 64 };

export function hashPassword(password, salt = crypto.randomBytes(16)) {
  const derived = crypto.scryptSync(password, salt, SCRYPT.keylen, SCRYPT);
  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`;
}

function verifyPassword(password, stored) {
  const [scheme, salt, expected] = String(stored).split(':');
  if (scheme !== 'scrypt' || !salt || !expected) return false;
  let derived;
  try {
    derived = crypto.scryptSync(password, Buffer.from(salt, 'base64'), SCRYPT.keylen, SCRYPT);
  } catch {
    return false;
  }
  const expectedBuffer = Buffer.from(expected, 'base64');
  // Compare in constant time, and only when the lengths already match —
  // timingSafeEqual throws on a length mismatch, which would itself leak.
  if (derived.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuffer);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const index = part.indexOf('=');
    if (index === -1) continue;
    out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

export class Auth {
  /**
   * @param {object} options
   * @param {string} options.passwordHash  scrypt hash, or '' to disable auth entirely
   */
  constructor({ passwordHash = '' } = {}) {
    this.passwordHash = passwordHash;
    this.sessions = new Map();  // token -> { expires }
    this.attempts = new Map();  // ip -> { count, first, lockedUntil }
  }

  get enabled() {
    return !!this.passwordHash;
  }

  /** True when the request is already signed in (or auth is switched off). */
  isAuthenticated(req) {
    if (!this.enabled) return true;
    const token = parseCookies(req.headers.cookie).studio_session;
    if (!token) return false;
    const session = this.sessions.get(token);
    if (!session) return false;
    if (session.expires < Date.now()) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }

  clientIp(req) {
    // Behind a host's proxy the socket address is the proxy, so the first entry
    // of X-Forwarded-For is the real client. Only trusted when the operator has
    // opted in, since the header is otherwise trivially spoofed.
    if (this.trustProxy) {
      const forwarded = req.headers['x-forwarded-for'];
      if (forwarded) return String(forwarded).split(',')[0].trim();
    }
    return req.socket?.remoteAddress || 'unknown';
  }

  /** Returns null when the caller may try, or the seconds left on a lockout. */
  lockoutRemaining(ip) {
    const record = this.attempts.get(ip);
    if (!record?.lockedUntil) return null;
    if (record.lockedUntil < Date.now()) {
      this.attempts.delete(ip);
      return null;
    }
    return Math.ceil((record.lockedUntil - Date.now()) / 1000);
  }

  #recordFailure(ip) {
    const now = Date.now();
    const record = this.attempts.get(ip) || { count: 0, first: now };
    if (now - record.first > ATTEMPT_WINDOW_MS) {
      record.count = 0;
      record.first = now;
    }
    record.count++;
    if (record.count >= MAX_ATTEMPTS) record.lockedUntil = now + LOCKOUT_MS;
    this.attempts.set(ip, record);
  }

  /**
   * @returns {{ ok: true, token: string } | { ok: false, reason: string, retryAfter?: number }}
   */
  login(password, ip) {
    const locked = this.lockoutRemaining(ip);
    if (locked !== null) {
      return { ok: false, reason: 'too many attempts', retryAfter: locked };
    }
    if (typeof password !== 'string' || !verifyPassword(password, this.passwordHash)) {
      this.#recordFailure(ip);
      return { ok: false, reason: 'wrong password' };
    }

    this.attempts.delete(ip);
    const token = crypto.randomBytes(32).toString('base64url');
    this.sessions.set(token, { expires: Date.now() + SESSION_TTL_MS });
    this.#sweep();
    return { ok: true, token };
  }

  logout(req) {
    const token = parseCookies(req.headers.cookie).studio_session;
    if (token) this.sessions.delete(token);
  }

  #sweep() {
    const now = Date.now();
    for (const [token, session] of this.sessions) {
      if (session.expires < now) this.sessions.delete(token);
    }
  }

  /** Secure only over HTTPS, or the browser silently drops the cookie on plain HTTP. */
  cookieHeader(token, req) {
    const https = req.headers['x-forwarded-proto'] === 'https' || req.socket?.encrypted;
    const parts = [
      `${COOKIE}=${token}`,
      'HttpOnly',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
    ];
    if (https) parts.push('Secure');
    return parts.join('; ');
  }

  clearCookieHeader() {
    return `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`;
  }
}

/**
 * Work out the password hash from the environment.
 * Throws when the configuration is contradictory, so a deploy fails loudly
 * rather than coming up unprotected.
 */
export function passwordHashFromEnv(env = process.env) {
  if (env.STUDIO_PASSWORD_HASH) {
    if (!/^scrypt:[^:]+:[^:]+$/.test(env.STUDIO_PASSWORD_HASH)) {
      throw new Error('STUDIO_PASSWORD_HASH is not a valid hash. Generate one with: node server.js --hash "your password"');
    }
    return env.STUDIO_PASSWORD_HASH;
  }
  if (env.STUDIO_PASSWORD) {
    if (env.STUDIO_PASSWORD.length < 8) {
      throw new Error('STUDIO_PASSWORD must be at least 8 characters.');
    }
    return hashPassword(env.STUDIO_PASSWORD);
  }
  return '';
}
