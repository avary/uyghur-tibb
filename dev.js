#!/usr/bin/env node
/**
 * dev.js - Local dev server (no Vercel needed).
 *
 * Serves the built Vue app (vite/dist) AND the /api/students serverless function
 * so the app works end-to-end against your database from localhost.
 *
 * Run `npm run vite:build` once before starting this (or after changing the app).
 *
 * Usage:  node dev.js      (or: npm run dev)
 * Env:    PORT  (default 8080), plus the .env variables (MYSQL_*, ADMIN_PASSWORD, ALLOWED_ORIGIN)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---- tiny .env loader (same as migrate.js) ----
function loadEnv(){
  const envPath = path.join(__dirname, '.env');
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

const ROOT = __dirname;
const PORT = Number(process.env.PORT || 8080);
const STATIC_ROOT = path.join(ROOT, 'vite', 'dist');

// Default ALLOWED_ORIGIN to the local origin so cross-origin POSTs (which browsers
// always attach an Origin header to) work from localhost. Set it explicitly in .env
// to override; production still requires it to be set explicitly.
if(!process.env.ALLOWED_ORIGIN){
  process.env.ALLOWED_ORIGIN = 'http://localhost:' + PORT;
}

// Load the API handler AFTER .env so it sees process.env.
const apiHandler = require(path.join(ROOT, 'api', 'students.js'));

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.woff': 'application/font-woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
};

function sendError(res, code, text){
  res.statusCode = code;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.end(text || http.STATUS_CODES[code] || 'Error');
}

function serveStatic(req, res){
  if(!fs.existsSync(STATIC_ROOT)){
    return sendError(res, 500, 'Vue build not found — run `npm run vite:build` first.');
  }
  let urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  if(urlPath === '/') urlPath = '/index.html';
  // Avoid serving secrets / internals.
  if(urlPath.startsWith('/.') || urlPath.startsWith('/node_modules') || urlPath.startsWith('/tasks')){
    return sendError(res, 404, 'Not found');
  }
  const filePath = path.normalize(path.join(STATIC_ROOT, urlPath));
  if(!filePath.startsWith(STATIC_ROOT)) return sendError(res, 403, 'Forbidden');
  fs.stat(filePath, (err, st) => {
    if(err || !st.isFile()) return sendError(res, 404, 'Not found');
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    fs.createReadStream(filePath).pipe(res);
  });
}

// Minimal Express-style res shim for the Vercel-style handler.
function shimRes(nodeRes){
  const wrapper = {
    setHeader(k, v){ nodeRes.setHeader(k, v); return wrapper; },
    status(code){
      nodeRes.statusCode = code;
      return {
        json(obj){
          nodeRes.setHeader('Content-Type', 'application/json');
          nodeRes.end(JSON.stringify(obj));
        },
        end(body){ nodeRes.end(body); }
      };
    },
    end(body){ nodeRes.end(body); },
  };
  return wrapper;
}

function handleApi(req, res){
  let body = '';
  req.on('data', c => { body += c; if(body.length > 1e6) req.destroy(); });
  req.on('end', () => {
    const fakeReq = { method: req.method, headers: req.headers, url: req.url, body: undefined };
    if(body){
      try { fakeReq.body = JSON.parse(body); }
      catch(e){ fakeReq.body = body; }
    }
    // Surface handler errors instead of silently hanging.
    try {
      Promise.resolve(apiHandler(fakeReq, shimRes(res))).catch(() => sendError(res, 500, 'API error'));
    } catch(e){
      sendError(res, 500, String(e && e.message || e));
    }
  });
}

const server = http.createServer((req, res) => {
  const urlPath = new URL(req.url, 'http://localhost').pathname;
  if(urlPath === '/api/students' || urlPath.startsWith('/api/students')){
    return handleApi(req, res);
  }
  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log('┌──────────────────────────────────────────────┐');
  console.log('│  ئۇيغۇر تېبابىتى مائارىپ سۇپىسى — يەرلىك خىزمەت │');
  console.log('└──────────────────────────────────────────────┘');
  const local = 'http://localhost:' + PORT + '/';
  console.log('  ئەپە (Vue)         → ' + local);
  console.log('  باشقۇرۇش (/admin) → ' + local + '#/admin');
  console.log('  API (students)     → ' + local + 'api/students');
  const nets = require('os').networkInterfaces();
  for(const name of Object.keys(nets)){
    for(const ni of nets[name] || []){
      if(ni.family === 'IPv4' && !ni.internal){
        console.log('  تور ئارقىلىق (LAN) → ' + 'http://' + ni.address + ':' + PORT + '/');
      }
    }
  }
});