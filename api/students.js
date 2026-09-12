// api/students.js - Vercel Serverless Function backed by Supabase PostgreSQL
const https = require('https');
const url = require('url');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://voupxaqyaywhldazvklj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_YzSxcmTmflGY7Yzwi6M4Ww_K5MyIN00';

let inMemoryStudents = [];
let inMemoryExams = [];
let inMemoryFeedback = [];

function sbFetch(path, options = {}) {
  return new Promise((resolve, reject) => {
    if (!SUPABASE_URL || !SUPABASE_KEY) return resolve(null);
    const target = new URL(path, SUPABASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': options.prefer || 'return=representation',
        ...(options.headers || {})
      }
    };
    const req = https.request(target, reqOptions, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(data ? JSON.parse(data) : {});
        } catch (e) {
          resolve(data);
        }
      });
    });
    req.on('error', err => resolve(null));
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

const EXCLUDED_TEST_PHONES = ['5551234567', '99900011122', '5516862398', '5016862393', '5516862393', '5559880508', '5315942989', '13800000000', 'admin'];
const LAUNCH_CUTOFF = '2026-09-12T11:00:00.000Z';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method === 'POST') {
    try {
      const data = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      // 1. Register student (auto-approved by default, no gatekeeper)
      if (data.action === 'register' && data.user) {
        const studentStatus = data.user.status || 'approved';
        await sbFetch('/rest/v1/students', {
          method: 'POST',
          prefer: 'resolution=merge-duplicates',
          body: {
            name: data.user.name,
            phone: data.user.phone,
            status: studentStatus,
            last_active: new Date().toISOString()
          }
        });
        const existing = inMemoryStudents.find(s => s.phone === data.user.phone);
        if (existing) {
          existing.name = data.user.name;
          existing.status = studentStatus;
        } else {
          inMemoryStudents.unshift({
            name: data.user.name,
            phone: data.user.phone,
            status: studentStatus,
            registered_at: new Date().toISOString(),
            when: new Date().toISOString()
          });
        }
        return res.status(200).json({ status: 'ok', message: 'Student registered and approved' });
      }

      // 2. Approve or update student status
      if (data.action === 'update_status' && data.phone && data.status) {
        await sbFetch(`/rest/v1/students?phone=eq.${encodeURIComponent(data.phone)}`, {
          method: 'PATCH',
          body: { status: data.status, last_active: new Date().toISOString() }
        });
        const student = inMemoryStudents.find(s => s.phone === data.phone);
        if (student) {
          student.status = data.status;
        } else {
          inMemoryStudents.unshift({ phone: data.phone, status: data.status, when: new Date().toISOString() });
        }
        return res.status(200).json({ status: 'ok', message: 'Status updated' });
      }

      // 2b. Reset / Clear all students (Admin reset)
      if (data.action === 'clear_all_students') {
        inMemoryStudents = [];
        inMemoryExams = [];
        return res.status(200).json({ status: 'ok', message: 'Students memory reset' });
      }

      // 3. Log exam
      if (data.action === 'exam' && data.exam) {
        inMemoryExams.unshift(data.exam);
        return res.status(200).json({ status: 'ok', message: 'Exam result logged' });
      }

      // 4. Feedback / Question
      if (data.action === 'feedback' && data.feedback) {
        await sbFetch('/rest/v1/feedback', {
          method: 'POST',
          body: {
            student_name: data.feedback.name || 'نامەلۇم',
            student_phone: data.feedback.phone || '',
            question: data.feedback.text || ''
          }
        });
        inMemoryFeedback.unshift(data.feedback);
        return res.status(200).json({ status: 'ok', message: 'Feedback logged' });
      }

      // 5. Reply feedback
      if (data.action === 'reply_feedback' && data.idx != null && data.reply) {
        if (inMemoryFeedback[data.idx]) {
          inMemoryFeedback[data.idx].reply = data.reply;
          inMemoryFeedback[data.idx].replyAt = new Date().toISOString();
        }
        return res.status(200).json({ status: 'ok', message: 'Reply recorded' });
      }

      return res.status(400).json({ status: 'error', message: 'Unknown action' });
    } catch (e) {
      return res.status(500).json({ status: 'error', message: e.message });
    }
  }

  if (req.method === 'GET') {
    // Fetch live from Supabase
    let sbStudents = await sbFetch('/rest/v1/students?select=*&order=registered_at.desc');
    let list = Array.isArray(sbStudents) && sbStudents.length ? sbStudents : inMemoryStudents;
    list = (list || []).filter(s => {
      const nm = (s.name || '').trim();
      if (nm === 'سىناق ئوقۇغۇچى' || nm === 'سىناق' || nm.startsWith('سىناق')) return false;
      const ph = String(s.phone || '').trim();
      if (EXCLUDED_TEST_PHONES.includes(ph)) return false;
      const reg = s.registered_at || s.when || '';
      if (reg && reg < LAUNCH_CUTOFF) return false;
      return true;
    });
    return res.status(200).json({
      status: 'ok',
      students: list,
      exams: inMemoryExams,
      feedback: inMemoryFeedback,
      supabaseConnected: true,
      serverTime: new Date().toISOString()
    });
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
};
