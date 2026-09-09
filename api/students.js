// api/students.js - Vercel Serverless Function with a pluggable database backend.
//
// The backend is chosen with the DB_DRIVER env var:
//   DB_DRIVER=mysql    -> MySQL (mysql2)                       — default
//   DB_DRIVER=supabase -> Supabase (server-side PostgREST, Service Role key)
// Actual DB work is delegated to api/lib/db-<driver>.js; everything below is
// driver-agnostic, so the browser clients (supabase.js / the Vue API store) never
// need to know or care which database is deployed.
//
// SECURITY:
//  - No credentials are hardcoded. Everything comes from environment variables:
//      MySQL:     MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
//      Supabase:  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (server-side only)
//      Shared:    ADMIN_PASSWORD (admin auth secret), ALLOWED_ORIGIN (CORS), DB_DRIVER
//  - Credentials never reach the browser; all DB work happens here.
//  - Privileged actions (login, listing all students, approve/block, delete student,
//    reply feedback, update admin) require a short-lived HMAC token from the `login` action.
//  - Public actions (register, feedback, exam, scoped status) are validated + rate-limited.
//  - Inputs are validated server-side; CORS is restricted; simple per-IP rate limiting.
const crypto = require('crypto');

const { createDriver: createMysqlDriver } = require('./lib/db-mysql');
const { createDriver: createSupabaseDriver } = require('./lib/db-supabase');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';
const AUTH_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours

// ---- Backend driver selection (DB_DRIVER=mysql|supabase, else auto-detect) ----
// Explicitly choosing a driver whose credentials are missing is a configuration
// error and FAILS CLOSED (the function errors on cold start) rather than silently
// answering requests with an empty/never-persisted database. Only the auto-detect
// default (no DB_DRIVER, no credentials) keeps the lenient connected=false path.
function hasMysql(){
  return !!(process.env.MYSQL_HOST && process.env.MYSQL_USER &&
    process.env.MYSQL_PASSWORD && process.env.MYSQL_DATABASE);
}
function hasSupabase(){
  return !!(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
function selectDriver(){
  const explicit = String(process.env.DB_DRIVER || '').toLowerCase();
  if(explicit === 'supabase'){
    if(!hasSupabase()) throw new Error('DB_DRIVER=supabase requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (server-side only)');
    return createSupabaseDriver();
  }
  if(explicit === 'mysql'){
    if(!hasMysql()) throw new Error('DB_DRIVER=mysql requires MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD and MYSQL_DATABASE');
    return createMysqlDriver();
  }
  if(!hasMysql() && hasSupabase()) return createSupabaseDriver();
  return createMysqlDriver();
}
const db = selectDriver();

// ---- Simple per-IP rate limiter (best effort; resets on cold start) ----
const RATE_WINDOW_MS = 60 * 1000;
const RATE_LIMIT = 20;
const rateBuckets = {};
function rateLimited(ip){
  if(!ip) return false;
  const now = Date.now();
  const b = rateBuckets[ip];
  if(!b || now - b.start > RATE_WINDOW_MS){ rateBuckets[ip] = { start: now, count: 1 }; return false; }
  b.count += 1;
  return b.count > RATE_LIMIT;
}

function hmac(value){
  return crypto.createHmac('sha256', ADMIN_PASSWORD).update(value).digest('hex');
}

function issueToken(role, username){
  const payload = { role: role || 'super', username: username || 'admin', exp: Date.now() + AUTH_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return body + '.' + hmac(body);
}

function safeEqualStr(a, b){
  if(typeof a !== 'string' || typeof b !== 'string') return false;
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if(ba.length !== bb.length){ return false; }
  return crypto.timingSafeEqual(ba, bb);
}

function parseToken(token){
  if(typeof token !== 'string') return null;
  const parts = token.split('.');
  if(parts.length !== 2) return null;
  const [body, sig] = parts;
  if(!safeEqualStr(hmac(body), sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if(!payload || typeof payload.exp !== 'number' || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) { return null; }
}

function getReqUser(req, res){
  const auth = (req.headers.authorization || '');
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const payload = parseToken(token);
  if(!payload){ res.status(401).json({ status: 'error', message: 'Unauthorized' }); return null; }
  return payload;
}

// Current request origin derived from the Host/proto headers (same-origin = the site
// that served the page). Behind a proxy (e.g. Vercel), use x-forwarded-proto.
function requestOrigin(req){
  const scheme = req.headers['x-forwarded-proto'] ||
    ((req.socket && req.socket.encrypted) ? 'https' : 'http');
  const host = req.headers.host;
  if(!host) return null;
  return scheme.toLowerCase() + '://' + host.toLowerCase();
}

// CORS enforcement:
//  - Requests with NO Origin header (same-origin fetches, curl, server-to-server) are
//    allowed. Browsers only send Origin on cross-origin requests.
//  - Same-origin requests (Origin == the Host the page was served from, e.g. the admin
//    panel on its own domain, or localhost) are always allowed and echoed — this is not
//    a cross-origin hole, it is the browser's same-origin policy.
//  - Any other Origin must match ALLOWED_ORIGIN exactly, otherwise it is REJECTED with
//    403 (the request is never processed, not just left unanswered).
//  - If ALLOWED_ORIGIN is unset, remaining cross-origin requests FAIL CLOSED with 503 so
//    the API can never silently open itself to arbitrary origins.
function originCheck(req, res){
  const origin = req.headers.origin;
  if(!origin) return true; // non-CORS client: allow but never send ACAO

  const same = requestOrigin(req);
  if(same && origin.toLowerCase() === same){
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    return true;
  }
  if(!ALLOWED_ORIGIN){
    res.status(503).json({ status: 'error', message: 'ALLOWED_ORIGIN is not configured' });
    return false;
  }
  if(origin === ALLOWED_ORIGIN){
    res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
    res.setHeader('Vary', 'Origin');
    return true;
  }
  // Disallowed cross-origin request: reject outright, before any processing.
  res.status(403).json({ status: 'error', message: 'Origin not allowed' });
  return false;
}

function validateStudentInput(user){
  const name = String((user && user.name) || '').trim();
  const phone = String((user && user.phone) || '').trim();
  const status = (user && user.status) || 'pending';
  if(name.length < 1 || name.length > 200) return { ok: false, why: 'Invalid name' };
  if(!/^[0-9+\-\s()]{7,40}$/.test(phone)) return { ok: false, why: 'Invalid phone' };
  if(!/^(pending|approved|blocked)$/.test(status)) return { ok: false, why: 'Invalid status' };
  return { ok: true, name, phone, status };
}

module.exports = async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'unknown';

  const fail = (code, msg) => res.status(code).json({ status: 'error', message: msg });

  // CORS enforcement: reject disallowed origins (403) BEFORE processing anything.
  // Preflight (OPTIONS) from a disallowed origin is also rejected.
  if(!originCheck(req, res)){
    if(req.method === 'OPTIONS'){ res.status(403).end(); }
    return;
  }
  if(req.method === 'OPTIONS'){
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.status(204).end();
    return;
  }

  try {
    // ---- GET ----
    if(req.method === 'GET'){
      const q = Object.fromEntries(new URL(req.url, 'http://x').searchParams.entries());

      // Public scoped status check: /api/students?phone=... -> only that phone's status
      if(q && q.phone){
        if(rateLimited(ip)) return fail(429, 'Too many requests');
        const phone = String(q.phone);
        const status = await db.getStudentStatus(phone);
        return res.status(200).json({ status: 'ok', phone, studentStatus: status });
      }

      // Full list (students/exams/feedback) => ADMIN ONLY
      const user = getReqUser(req, res);
      if(!user) return;
      const { students, feedback, exams } = await db.getAdminData();
      const safeStudents = students.filter(s => {
        const nm = (s.name || '').trim();
        return nm !== 'سىناق ئوقۇغۇچى' && nm !== 'سىناق' && !nm.startsWith('سىناق') && s.phone !== '13800000000' && s.phone !== 'admin';
      });
      return res.status(200).json({ status: 'ok', students: safeStudents, exams, feedback, dbConnected: db.connected, serverTime: new Date().toISOString() });
    }

    // ---- POST ----
    if(req.method === 'POST'){
      if(rateLimited(ip)) return fail(429, 'Too many requests');
      let data;
      try { data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
      catch(e){ return fail(400, 'Invalid JSON'); }
      const action = data && data.action;

      // 1. Admin login: verify against env ADMIN_PASSWORD, return short-lived token
      if(action === 'login'){
        if(!ADMIN_PASSWORD) return fail(500, 'ADMIN_PASSWORD not configured');
        const pass = String((data.password || data.pass || '')).trim();
        const username = String((data.username || data.user || 'admin')).trim();
        if(pass.length === 0) return fail(401, 'Password required');
        const a = Buffer.from(pass);
        const b = Buffer.from(ADMIN_PASSWORD);
        if(a.length !== b.length || !crypto.timingSafeEqual(a, b)) return fail(401, 'Invalid credentials');
        return res.status(200).json({ status: 'ok', message: 'Logged in', token: issueToken('super', username), user: { name: username, role: 'super' } });
      }

      // 2. Verify admin token (ADMIN ONLY) — thin server-side check so the Vue
      //    route guard can reject forged/expired tokens before showing the admin UI
      if(action === 'verify_token'){
        const user = getReqUser(req, res);
        if(!user) return;
        return res.status(200).json({ status: 'ok', user: { name: user.username || 'admin', role: user.role || 'super' } });
      }

      // 3. Register student (public, validated)
      if(action === 'register' && data.user){
        const v = validateStudentInput(data.user);
        if(!v.ok) return fail(400, 'Invalid student data: ' + v.why);
        if(db.connected) await db.registerStudent(v);
        return res.status(200).json({ status: 'ok', message: 'Student registered' });
      }

      // 4. Approve / block / set student status (ADMIN ONLY)
      if(action === 'update_status' && data.phone && data.status){
        const user = getReqUser(req, res);
        if(!user) return;
        if(!/^(approved|blocked|pending)$/.test(data.status)) return fail(400, 'Invalid status');
        if(db.connected) await db.updateStudentStatus(data.phone, data.status);
        return res.status(200).json({ status: 'ok', message: 'Status updated' });
      }

      // 5. Delete a student (ADMIN ONLY)
      if(action === 'delete_student' && data.phone){
        const user = getReqUser(req, res);
        if(!user) return;
        if(db.connected) await db.deleteStudent(data.phone);
        return res.status(200).json({ status: 'ok', message: 'Student deleted' });
      }

      // 6. Log exam result (public, validated, persisted)
      if(action === 'exam' && data.exam){
        const ex = data.exam;
        const score = Number(ex.score);
        const total = Number(ex.total_questions);
        const phone = String(ex.student_phone || ex.student || '').trim();
        const scope = String(ex.scope || '').trim();
        if(!Number.isFinite(score) || score < 0 || !Number.isFinite(total) || total < 1 || total > 1000 || score > total) {
          return fail(400, 'Invalid exam data');
        }
        if(db.connected) await db.logExam({ student_phone: phone, scope, score, total_questions: total, duration_seconds: Number(ex.duration_seconds) || null, passed: !!ex.passed });
        return res.status(200).json({ status: 'ok', message: 'Exam result logged' });
      }

      // 7. Submit feedback (public, validated, persisted)
      if(action === 'feedback' && data.feedback){
        const name = String(data.feedback.name || '').trim();
        const phone = String(data.feedback.phone || '').trim();
        const text = String(data.feedback.text || '').trim();
        if(text.length < 1 || text.length > 2000) return fail(400, 'Invalid feedback');
        if(name.length > 200) return fail(400, 'Name too long');
        if(phone && phone.length > 40) return fail(400, 'Phone too long');
        if(db.connected) await db.addFeedback({ name, phone, text });
        return res.status(200).json({ status: 'ok', message: 'Feedback logged' });
      }

      // 8. Reply to feedback (ADMIN ONLY)
      if(action === 'reply_feedback' && data.id != null && data.reply != null){
        const user = getReqUser(req, res);
        if(!user) return;
        const reply = String(data.reply).trim();
        if(db.connected) await db.replyFeedback(data.id, reply, user.username || 'باشقۇرغۇچى');
        return res.status(200).json({ status: 'ok', message: 'Reply recorded' });
      }

      // 9. Update admin profile/settings (ADMIN ONLY)
      if(action === 'admin_update' && data.admin){
        const user = getReqUser(req, res);
        if(!user) return;
        if(db.connected) await db.updateAdmin(data.admin, user.username);
        return res.status(200).json({ status: 'ok', message: 'Admin updated' });
      }

      return fail(400, 'Unknown action');
    }
  } catch (err) {
    return fail(500, 'Server error');
  }

  return fail(405, 'Method not allowed');
};
