// tests/supabase-driver.test.js - unit tests for the Supabase backend driver
// (api/lib/db-supabase.js) using an injected mock fetch. No network or real
// Supabase project is needed.
//
// Run: node --test tests/

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { createDriver } = require('../api/lib/db-supabase');

function mockFetch(){
  const calls = [];
  const fn = async (url, opts = {}) => {
    calls.push({ url, opts });
    if (url.includes('/rest/v1/students?select=status')) {
      return { ok: true, status: 200, text: async () => JSON.stringify([{ status: 'pending' }]) };
    }
    if (url.includes('/rest/v1/students?select=*')) {
      return { ok: true, status: 200, text: async () => JSON.stringify([{ name: 'ئاخىرەت', phone: '13812345678', status: 'pending', registered_at: '2026-09-01T00:00:00Z', notes: null }]) };
    }
    if (url.includes('/rest/v1/feedback?select=*')) {
      return { ok: true, status: 200, text: async () => JSON.stringify([{ id: 'abc-1', student_name: 'ئاخىرەت', student_phone: '13812345678', question: 'سۇئال', reply: null, reply_at: null, replied_by: null, created_at: '2026-09-01T00:00:00Z' }]) };
    }
    if (url.includes('/rest/v1/exam_logs?select=*')) {
      return { ok: true, status: 200, text: async () => JSON.stringify([{ student_phone: '13812345678', scope: 'ئومۇمىي', score: 80, total_questions: 20, duration_seconds: 600, passed: true, taken_at: '2026-09-01T00:00:00Z' }]) };
    }
    if (opts.method === 'DELETE') return { ok: true, status: 204, text: async () => '' };
    if (opts.method === 'POST' || opts.method === 'PATCH') return { ok: true, status: 201, text: async () => '[]' };
    return { ok: true, status: 200, text: async () => '[]' };
  };
  return { fn, calls };
}

function withEnv(vars, body){
  const prev = {};
  const set = {};
  Object.keys(vars).forEach(k => {
    prev[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
    set[k] = true;
  });
  try { return body(); }
  finally { Object.keys(vars).forEach(k => { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; }); }
}

test('supabase driver: not connected when URL/key are missing', () => {
  withEnv({ SUPABASE_URL: undefined, SUPABASE_SERVICE_ROLE_KEY: undefined }, () => {
    const d = createDriver({ fetchFn: async () => { throw new Error('should not fetch'); } });
    assert.equal(d.connected, false);
  });
});

test('supabase driver: getStudentStatus queries by phone and returns status', async () => {
  const m = mockFetch();
  await withEnv({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'sb_service_key',
  }, async () => {
    const d = createDriver({ fetchFn: m.fn });
    const status = await d.getStudentStatus('13812345678');
    assert.equal(status, 'pending');
    assert.ok(m.calls[0].url.includes('phone=eq.13812345678'));
    assert.equal(m.calls[0].opts.headers['apikey'], 'sb_service_key');
    assert.equal(m.calls[0].opts.headers['Authorization'], 'Bearer sb_service_key');
  });
});

test('supabase driver: getAdminData maps rows to the shared API shapes', async () => {
  const m = mockFetch();
  await withEnv({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
  }, async () => {
    const d = createDriver({ fetchFn: m.fn });
    const { students, feedback, exams } = await d.getAdminData();
    assert.equal(students.length, 1);
    assert.equal(students[0].phone, '13812345678');
    assert.equal(students[0].when, '2026-09-01T00:00:00.000Z');
    assert.equal(feedback[0].n, 'ئاخىرەت');
    assert.equal(feedback[0].t, 'سۇئال');
    assert.equal(exams[0].passed, true);
    assert.equal(exams[0].score, 80);
  });
});

test('supabase driver: registerStudent upserts with merge-duplicates', async () => {
  const m = mockFetch();
  await withEnv({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
  }, async () => {
    const d = createDriver({ fetchFn: m.fn });
    await d.registerStudent({ name: 'يېڭى ئوقۇغۇچى', phone: '13900000000', status: 'pending' });
    const call = m.calls[0];
    assert.equal(call.opts.method, 'POST');
    assert.ok(call.opts.headers['Prefer'].includes('resolution=merge-duplicates'));
    const body = JSON.parse(call.opts.body);
    assert.equal(body.phone, '13900000000');
    assert.equal(body.status, 'pending');
    assert.ok(body.last_active);
  });
});

test('supabase driver: deleteStudent removes exam_logs then students', async () => {
  const m = mockFetch();
  await withEnv({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
  }, async () => {
    const d = createDriver({ fetchFn: m.fn });
    await d.deleteStudent('13811112222');
    assert.equal(m.calls.length, 2);
    assert.ok(m.calls[0].url.includes('/rest/v1/exam_logs?student_phone=eq.13811112222'));
    assert.ok(m.calls[1].url.includes('/rest/v1/students?phone=eq.13811112222'));
  });
});

test('supabase driver: replyFeedback and updateAdmin PATCH the right rows', async () => {
  const m = mockFetch();
  await withEnv({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
  }, async () => {
    const d = createDriver({ fetchFn: m.fn });
    await d.replyFeedback('abc-1', 'جاۋاب', 'باشقۇرغۇچى');
    await d.updateAdmin({ full_name: 'يېڭى ئىسىم', password_hash: null }, 'admin');
    assert.ok(m.calls[0].url.includes('/rest/v1/feedback?id=eq.abc-1'));
    assert.equal(JSON.parse(m.calls[0].opts.body).reply, 'جاۋاب');
    assert.ok(m.calls[1].url.includes('/rest/v1/admins?username=eq.admin'));
  });
});

test('supabase driver: non-2xx responses surface an error', async () => {
  await withEnv({
    SUPABASE_URL: 'https://proj.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'k',
  }, async () => {
    const d = createDriver({
      fetchFn: async () => ({ ok: false, status: 401, text: async () => 'unauthorized' }),
    });
    // getAdminData must NOT degrade to an empty-but-success response (a Supabase
    // outage / bad key would otherwise look like an empty database); it rejects.
    await assert.rejects(() => d.getAdminData(), /Supabase REST 401/);
    // The write ops must propagate the error too.
    await assert.rejects(() => d.registerStudent({ name: 'x', phone: '1'.repeat(11), status: 'pending' }), /Supabase REST 401/);
  });
});