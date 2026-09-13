import test from 'node:test';
import assert from 'node:assert/strict';
import { Auth, hashPassword, passwordHashFromEnv } from '../lib/auth.js';

const PASSWORD = 'correct horse battery staple';
const hash = hashPassword(PASSWORD);

function withAuth() {
  const auth = new Auth({ passwordHash: hash });
  return auth;
}

function reqWith(cookie = '') {
  return { headers: cookie ? { cookie } : {}, socket: { remoteAddress: '1.2.3.4' } };
}

test('a hash does not contain the password and differs each time', () => {
  assert.doesNotMatch(hash, /correct horse/);
  assert.notEqual(hashPassword(PASSWORD), hashPassword(PASSWORD), 'salt must be random');
  assert.match(hash, /^scrypt:/);
});

test('the right password signs in, the wrong one does not', () => {
  const auth = withAuth();
  assert.equal(auth.login('wrong', 'ip1').ok, false);
  const good = auth.login(PASSWORD, 'ip1');
  assert.equal(good.ok, true);
  assert.ok(good.token.length >= 32);
});

test('non-string passwords are rejected rather than crashing', () => {
  const auth = withAuth();
  for (const value of [undefined, null, 42, {}, []]) {
    assert.equal(auth.login(value, 'ip1').ok, false, String(value));
  }
});

test('a session cookie authenticates and a bogus one does not', () => {
  const auth = withAuth();
  const { token } = auth.login(PASSWORD, 'ip1');
  assert.equal(auth.isAuthenticated(reqWith(`studio_session=${token}`)), true);
  assert.equal(auth.isAuthenticated(reqWith('studio_session=made-up')), false);
  assert.equal(auth.isAuthenticated(reqWith()), false);
});

test('signing out invalidates the session immediately', () => {
  const auth = withAuth();
  const { token } = auth.login(PASSWORD, 'ip1');
  const req = reqWith(`studio_session=${token}`);
  assert.equal(auth.isAuthenticated(req), true);
  auth.logout(req);
  assert.equal(auth.isAuthenticated(req), false);
});

test('an expired session stops working', () => {
  const auth = withAuth();
  const { token } = auth.login(PASSWORD, 'ip1');
  auth.sessions.get(token).expires = Date.now() - 1;
  assert.equal(auth.isAuthenticated(reqWith(`studio_session=${token}`)), false);
  assert.equal(auth.sessions.has(token), false, 'the dead session should be dropped');
});

test('repeated guessing locks the address out', () => {
  const auth = withAuth();
  for (let i = 0; i < 8; i++) auth.login('nope', 'attacker');
  const blocked = auth.login(PASSWORD, 'attacker');
  assert.equal(blocked.ok, false, 'even the right password is refused while locked out');
  assert.ok(blocked.retryAfter > 0);
  // Another address is unaffected.
  assert.equal(auth.login(PASSWORD, 'someone-else').ok, true);
});

test('a successful sign-in clears the failure count', () => {
  const auth = withAuth();
  for (let i = 0; i < 5; i++) auth.login('nope', 'ip1');
  assert.equal(auth.login(PASSWORD, 'ip1').ok, true);
  assert.equal(auth.attempts.has('ip1'), false);
});

test('cookies are HttpOnly and SameSite, and Secure only over https', () => {
  const auth = withAuth();
  const plain = auth.cookieHeader('tok', { headers: {}, socket: {} });
  assert.match(plain, /HttpOnly/);
  assert.match(plain, /SameSite=Lax/);
  assert.doesNotMatch(plain, /Secure/, 'Secure over plain http would drop the cookie');

  const behindProxy = auth.cookieHeader('tok', { headers: { 'x-forwarded-proto': 'https' }, socket: {} });
  assert.match(behindProxy, /Secure/);
  assert.match(auth.cookieHeader('tok', { headers: {}, socket: { encrypted: true } }), /Secure/);
});

test('with no password configured, auth is off and everything is allowed', () => {
  const open = new Auth({ passwordHash: '' });
  assert.equal(open.enabled, false);
  assert.equal(open.isAuthenticated(reqWith()), true);
});

test('X-Forwarded-For is only believed when the operator opts in', () => {
  const auth = withAuth();
  const req = { headers: { 'x-forwarded-for': '9.9.9.9, 10.0.0.1' }, socket: { remoteAddress: '10.0.0.1' } };
  assert.equal(auth.clientIp(req), '10.0.0.1', 'spoofable header ignored by default');
  auth.trustProxy = true;
  assert.equal(auth.clientIp(req), '9.9.9.9');
});

test('environment configuration is validated, not silently ignored', () => {
  assert.equal(passwordHashFromEnv({}), '', 'no password means auth stays off');
  assert.match(passwordHashFromEnv({ STUDIO_PASSWORD: 'longenough' }), /^scrypt:/);
  assert.throws(() => passwordHashFromEnv({ STUDIO_PASSWORD: 'short' }), /at least 8/);
  assert.throws(() => passwordHashFromEnv({ STUDIO_PASSWORD_HASH: 'garbage' }), /not a valid hash/);
  assert.equal(passwordHashFromEnv({ STUDIO_PASSWORD_HASH: hash }), hash);
  assert.equal(
    passwordHashFromEnv({ STUDIO_PASSWORD_HASH: hash, STUDIO_PASSWORD: 'ignored-one' }),
    hash,
    'the explicit hash wins over a plaintext password',
  );
});
