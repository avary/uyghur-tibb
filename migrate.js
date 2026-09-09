#!/usr/bin/env node
/**
 * migrate.js - Simple MySQL migrator for the Uyghur Tibb platform.
 *
 * Usage:
 *   node migrate.js                 Apply schema (create tables) using MYSQL_* env / .env
 *   node migrate.js --seed          Also seed a default admin row (hashed from ADMIN_PASSWORD)
 *   node migrate.js --from-supabase Also copy existing students/feedback/exams from a Supabase project
 *   node migrate.js --drop          Drop tables first (DANGEROUS) - use carefully
 *
 * Config comes from environment variables or a `.env` file in the project root:
 *   MYSQL_HOST, MYSQL_PORT, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   ADMIN_PASSWORD, SUPABASE_URL, SUPABASE_ANON_KEY
 *
 * Notes:
 *  - CREATE DATABASE / GRANT statements in mysql_setup.sql require an elevated DB user.
 *    They are applied only when MYSQL_ADMIN_USER + MYSQL_ADMIN_PASSWORD are provided;
 *    otherwise the migrator creates tables in the existing schema (MYSQL_DATABASE).
 *  - The app user (MYSQL_USER) should only need the privileges granted in mysql_setup.sql.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mysql = require('mysql2/promise');

// ---- tiny .env loader (no extra deps) ----
function loadEnv(){
  const envPath = path.join(process.cwd(), '.env');
  if(!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for(const line of lines){
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if(m && process.env[m[1]] === undefined){
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}
loadEnv();

const ADMIN = process.env.MYSQL_ADMIN_USER;
const ADMIN_PASS = process.env.MYSQL_ADMIN_PASSWORD;

function baseConfig(host, port){
  if(!process.env.MYSQL_PASSWORD){
    console.error('❌ MYSQL_PASSWORD is not set (or .env missing). Copy .env.example to .env and configure it.');
    process.exit(1);
  }
  return {
    host: host || process.env.MYSQL_HOST,
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASSWORD,
    database: process.env.MYSQL_DATABASE,
    multipleStatements: true,
  };
}

// Trim leading comment lines (`-- ...`) and block comments from a statement.
// Real DB statements begin with a reserved keyword; everything before it is SQL comment.
function stripLeadingComments(stmt){
  let s = stmt.trim();
  let prev;
  do {
    prev = s;
    s = s.replace(/^--[^\n]*/, '').replace(/^\/\*[\s\S]*?\*\//, '').trim();
  } while(s !== prev);
  return s;
}

// Split SQL into individual statements on top-level semicolons.
function splitStatements(sql){
  const stmts = [];
  let current = '';
  let inString = null;
  for(let i = 0; i < sql.length; i++){
    const ch = sql[i];
    if(inString){
      current += ch;
      if(ch === inString && sql[i-1] !== '\\') inString = null;
      continue;
    }
    if(ch === "'" || ch === '"' || ch === '`'){ inString = ch; current += ch; continue; }
    if(ch === ';'){ stmts.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  if(current.trim()) stmts.push(current.trim());

  // Drop comment-only "statements" and strip leading comments from real ones.
  const cleaned = [];
  for(const raw of stmts){
    const s = stripLeadingComments(raw);
    if(s) cleaned.push(s);
  }
  return cleaned;
}

async function applySchema(conn){
  const sql = fs.readFileSync(path.join(process.cwd(), 'mysql_setup.sql'), 'utf8');
  const stmts = splitStatements(sql);
  for(const stmt of stmts){
    const upper = stmt.toUpperCase();
    // These need elevated privileges; only the manager (admin) user applies them.
    const needsAdmin = upper.startsWith('CREATE DATABASE') || upper.startsWith('DROP DATABASE') ||
      upper.startsWith('USE ') || upper.startsWith('GRANT') || upper.startsWith('CREATE USER');
    if(needsAdmin && !ADMIN){
      console.log(`  · skip (needs admin user): ${stmt.slice(0, 60)}...`);
      continue;
    }
    try {
      await conn.query(stmt);
      console.log(`  ✓ ${stmt.slice(0, 60)}${stmt.length > 60 ? '...' : ''}`);
    } catch(e){
      // Table already exists (IF NOT EXISTS) is fine; else warn.
      if(!/already exists/i.test(e.message)){
        console.log(`  ⚠ ${e.message.slice(0, 120)}`);
      } else {
        console.log(`  · exists: ${stmt.slice(0, 60)}...`);
      }
    }
  }
}

function hashPassword(pw){
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pw, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

async function seedAdmin(conn){
  const username = process.env.ADMIN_USERNAME || 'admin';
  const pw = process.env.ADMIN_PASSWORD;
  if(!pw){ console.log('  · skip seed admin (ADMIN_PASSWORD not set)'); return; }
  const fullName = process.env.ADMIN_FULLNAME || 'ئاساسىي باشقۇرغۇچى';
  await conn.execute(
    'INSERT INTO admins (username, full_name, password_hash, role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE full_name = VALUES(full_name)',
    [username, fullName, hashPassword(pw), 'super']
  );
  console.log('  ✓ seeded admin user: ' + username);
}

async function fetchJson(url, headers){
  const res = await fetch(url, { headers });
  if(!res.ok) throw new Error('Supabase fetch failed ' + res.status + ' ' + url);
  return res.json();
}

async function migrateFromSupabase(conn){
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if(!base || !key){
    console.log('  · skip --from-supabase (SUPABASE_URL / SUPABASE_ANON_KEY not set)');
    return;
  }
  const url = base.replace(/\/+$/, '');
  const headers = { 'apikey': key, 'Authorization': 'Bearer ' + key };

  try {
    const students = await fetchJson(`${url}/rest/v1/students?select=*&order=registered_at.desc`, headers);
    let n = 0;
    for(const s of Array.isArray(students) ? students : []){
      await conn.execute(
        'INSERT INTO students (name, phone, status, notes, registered_at, last_active) VALUES (?,?,?,?,?,?) ON DUPLICATE KEY UPDATE name=VALUES(name), status=VALUES(status)',
        [String(s.name||''), String(s.phone||''), String(s.status||'pending'), s.notes||null,
         s.registered_at ? new Date(s.registered_at) : new Date(), s.last_active ? new Date(s.last_active) : new Date()]
      );
      n++;
    }
    console.log(`  ✓ migrated ${n} students`);

    const feedback = await fetchJson(`${url}/rest/v1/feedback?select=*&order=created_at.desc`, headers);
    let nf = 0;
    for(const f of Array.isArray(feedback) ? feedback : []){
      const existing = await conn.execute('SELECT id FROM feedback WHERE id = ?', [f.id]);
      if(existing[0].length){ continue; }
      await conn.execute(
        'INSERT INTO feedback (id, student_name, student_phone, question, reply, reply_at, replied_by, is_public, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [Number(f.id)||null, String(f.student_name||''), f.student_phone||null, String(f.question||''),
         f.reply||null, f.reply_at ? new Date(f.reply_at) : null, f.replied_by||null, f.is_public === false ? 0 : 1,
         f.created_at ? new Date(f.created_at) : new Date()]
      );
      nf++;
    }
    console.log(`  ✓ migrated ${nf} feedback items`);
  } catch(e){
    console.error('  ✗ --from-supabase migration failed: ' + e.message);
  }
}

async function main(){
  const args = process.argv.slice(2);
  const doSeed = args.includes('--seed');
  const doSupabase = args.includes('--from-supabase');
  const doDrop = args.includes('--drop');

  if(!process.env.MYSQL_HOST || !process.env.MYSQL_DATABASE){
    console.error('❌ MYSQL_HOST / MYSQL_DATABASE not set. Copy .env.example to .env and configure it.');
    process.exit(1);
  }

  const dropTables = async (conn) => {
    for(const t of ['exam_logs','feedback','lessons','admins','students']){
      await conn.query(`DROP TABLE IF EXISTS ${t}`);
    }
    console.log('  ✓ dropped existing tables');
  };

  // 1) As manager if provided: create DB, grant, then use app DB.
  if(ADMIN){
    const adminConn = await mysql.createConnection({
      host: process.env.MYSQL_HOST,
      port: Number(process.env.MYSQL_PORT || 3306),
      user: ADMIN,
      password: ADMIN_PASS,
      multipleStatements: true,
    });
    const sql = fs.readFileSync(path.join(process.cwd(), 'mysql_setup.sql'), 'utf8');
    const stmts = splitStatements(sql);
    for(const stmt of stmts){
      const u = stmt.toUpperCase();
      if(!(u.startsWith('CREATE DATABASE') || u.startsWith('USE ') || u.startsWith('GRANT') || u.startsWith('CREATE USER'))) continue;
      if(doDrop && u.startsWith('DROP DATABASE')) await adminConn.query(stmt);
      try { await adminConn.query(stmt); console.log(`  ✓ ${stmt.slice(0, 60)}...`); }
      catch(e){ if(!/already exists/i.test(e.message)) console.log(`  ⚠ ${e.message.slice(0,120)}`); }
    }
    await adminConn.end();
  }

  // 2) Connect as app user and apply schema.
  const conn = await mysql.createConnection(baseConfig());
  if(doDrop) await dropTables(conn);
  await applySchema(conn);
  if(doSeed) await seedAdmin(conn);
  if(doSupabase) await migrateFromSupabase(conn);
  await conn.end();

  console.log('\n✅ Migration complete.');
}

main().catch((e) => { console.error('Migration failed:', e.message); process.exit(1); });
