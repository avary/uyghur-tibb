// tests/api.test.js - endpoint security tests for /api/students
//
// Runs against the exported handler directly (no Vercel, no MySQL needed).
// DB calls are skipped when MYSQL_* are unset; auth/CORS/validation logic is
// exercised in full.
//
// Run:  node --test tests/

process.env.ADMIN_PASSWORD = 'uyghurtibb';
process.env.ALLOWED_ORIGIN = 'http://allowed.example';
delete process.env.MYSQL_HOST;
delete process.env.MYSQL_USER;
delete process.env.MYSQL_PASSWORD;
delete process.env.MYSQL_DATABASE;

const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

const handler = require('../api/students.js');

function makeRes() {
  const out = { statusCode: 200, headers: {}, body: undefined };
  const sets = [];
  const res = {
    setHeader(k, v) { out.headers[k] = v; },
    status(code) {
      out.statusCode = code;
      const chain = {
        json(obj) { out.body = obj; return chain; },
        end(s) { out.body = s || ''; return chain; },
      };
      return chain;
    },
    end(s) { out.body = s || ''; },
    __out: out,
  };
  return res;
}

function req({ method = 'GET', url = '/api/students', headers = {}, body } = {}) {
  const r = { method, url, headers, body };
  if (!r.headers['x-forwarded-for']) r.headers['x-forwarded-for'] = '127.0.0.1';
  return r;
}

// Simple helper: run handler and return the res __out.
async function run(r) {
  const res = makeRes();
  await Promise.resolve(handler(r, res));
  return res.__out;
}

function b64(payload) { return Buffer.from(JSON.stringify(payload)).toString('base64url'); }
function forgedToken(exp) {
  return b64({ role: 'super', username: 'admin', exp: exp || Date.now() + 60 * 60 * 1000 }) + '.' + '0'.repeat(64);
}

let ipCounter = 0;
function uniqIp() { return '10.0.0.' + (++ipCounter % 250); }

beforeEach(() => { ipCounter += 1; });

test('login: correct ADMIN_PASSWORD returns 200 + token', async () => {
  const r = req({
    method: 'POST', body: { action: 'login', username: 'admin', password: 'uyghurtibb' },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'ok');
  assert.ok(res.body.token && res.body.token.indexOf('.') > 0);
});

test('login: wrong password returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'login', username: 'admin', password: 'nope' },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('CORS: disallowed cross-origin is rejected with 403 and request not processed', async () => {
  const r = req({
    method: 'GET', url: '/api/students?phone=13800138000',
    headers: { origin: 'http://evil.example', host: 'localhost:8080', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 403);
  assert.equal(res.body.message, 'Origin not allowed');
});

test('CORS: same-origin request is allowed even when ALLOWED_ORIGIN differs', async () => {
  const r = req({
    method: 'GET', url: '/api/students?phone=13800138000',
    headers: { origin: 'http://localhost:8080', host: 'localhost:8080', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  // scoped endpoint runs (public); no auth required
  assert.equal(res.statusCode, 200);
  assert.ok('studentStatus' in res.body);
});

test('CORS: preflight from disallowed origin returns 403', async () => {
  const r = req({
    method: 'OPTIONS',
    headers: { origin: 'http://evil.example', host: 'localhost:8080', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 403);
});

test('CORS: preflight from allowed origin returns 204', async () => {
  const r = req({
    method: 'OPTIONS',
    headers: { origin: 'http://allowed.example', host: 'allowed.example', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 204);
});

test('scoped status: GET ?phone= requires NO token (public)', async () => {
  const r = req({ method: 'GET', url: '/api/students?phone=13800138000', headers: { 'x-forwarded-for': uniqIp() } });
  const res = await run(r);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.phone, '13800138000');
  assert.ok('studentStatus' in res.body);
});

test('full list: GET without token returns 401', async () => {
  const r = req({ method: 'GET', url: '/api/students', headers: { 'x-forwarded-for': uniqIp() } });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('full list: forged token returns 401', async () => {
  const r = req({
    method: 'GET', url: '/api/students',
    headers: { authorization: 'Bearer ' + forgedToken(), 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('full list: expired token returns 401', async () => {
  const r = req({
    method: 'GET', url: '/api/students',
    headers: { authorization: 'Bearer ' + forgedToken(Date.now() - 1000), 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('full list: malformed token (no dot) returns 401', async () => {
  const r = req({
    method: 'GET', url: '/api/students',
    headers: { authorization: 'Bearer abc123', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('privileged action: update_status without token returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'update_status', phone: '13800138000', status: 'approved' },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('privileged action: delete_student with forged token returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'delete_student', phone: '13800138000' },
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + forgedToken(), 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('privileged action: reply_feedback without token returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'reply_feedback', id: 1, reply: 'جاۋاب' },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('privileged action: reply_feedback with forged token returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'reply_feedback', id: 1, reply: 'جاۋاب' },
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + forgedToken(), 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('privileged action: reply_feedback with expired token returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'reply_feedback', id: 1, reply: 'جاۋاب' },
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + forgedToken(Date.now() - 1000), 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('privileged action: admin_update with forged token returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'admin_update', admin: { full_name: 'باشقۇرغۇچى' } },
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + forgedToken(), 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('verify_token: real login token returns 200 (server-side token check)', async () => {
  // Get a genuine token through the login action, then verify it.
  const login = await run(req({
    method: 'POST', body: { action: 'login', username: 'admin', password: 'uyghurtibb' },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  }));
  assert.equal(login.statusCode, 200);
  const r = req({
    method: 'POST', body: { action: 'verify_token' },
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + login.body.token, 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.status, 'ok');
  assert.ok(res.body.user && res.body.user.name);
});

test('verify_token: forged token returns 401 (route guard cannot be opened)', async () => {
  const r = req({
    method: 'POST', body: { action: 'verify_token' },
    headers: { 'content-type': 'application/json', authorization: 'Bearer ' + forgedToken(), 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('verify_token: missing token returns 401', async () => {
  const r = req({
    method: 'POST', body: { action: 'verify_token' },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 401);
});

test('register: valid student returns 200 (public)', async () => {
  const r = req({
    method: 'POST', body: { action: 'register', user: { name: 'سىناق', phone: '13800138000', status: 'pending' } },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 200);
});

test('register: phone shorter than 7 digits returns 400 (server-side validation)', async () => {
  const r = req({
    method: 'POST', body: { action: 'register', user: { name: 'سىناق', phone: '123', status: 'approved' } },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 400);
});

test('feedback: empty text returns 400 (server-side validation)', async () => {
  const r = req({
    method: 'POST', body: { action: 'feedback', feedback: { name: 'ئوقۇغۇچى', phone: '', text: '' } },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 400);
});

test('unknown action returns 400', async () => {
  const r = req({
    method: 'POST', body: { action: 'nonsense' },
    headers: { 'content-type': 'application/json', 'x-forwarded-for': uniqIp() },
  });
  const res = await run(r);
  assert.equal(res.statusCode, 400);
});

test('method not allowed (PUT) returns 405', async () => {
  const r = req({ method: 'PUT', url: '/api/students', headers: { 'x-forwarded-for': uniqIp() } });
  const res = await run(r);
  assert.equal(res.statusCode, 405);
});