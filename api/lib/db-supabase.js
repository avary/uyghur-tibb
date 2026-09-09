// api/lib/db-supabase.js - Supabase (Postgres) backend driver for /api/students.
//
// Same adapter surface as db-mysql.js (connected / getStudentStatus /
// getAdminData / registerStudent / updateStudentStatus / deleteStudent /
// logExam / addFeedback / replyFeedback / updateAdmin).
//
// SECURITY:
//  - Talks to Supabase's REST API from the SERVER SIDE using the Service Role
//    key (SUPABASE_SERVICE_ROLE_KEY). That key NEVER reaches the browser and is
//    only ever loaded from the environment.
//  - All admin/auth enforcement still happens in api/students.js (HMAC token,
//    CORS, rate limiting); this driver only persists data.
//  - `fetcher` is injectable for tests (defaults to global fetch).
//
// Schema requirements (see supabase_setup.sql):
//   public.students(name, phone UNIQUE, status, registered_at, last_active, notes)
//   public.feedback(id, student_name, student_phone, question, reply, reply_at,
//                   replied_by, is_public, created_at)
//   public.exam_logs(student_phone, scope, score, total_questions,
//                    duration_seconds, passed, taken_at)
//   public.admins(username, full_name, password_hash, role)
function createDriver({ fetchFn } = {}){
  const fetchHttp = fetchFn || global.fetch;
  const base = String(process.env.SUPABASE_URL || '').replace(/\/+$/, '');
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const connected = !!(base && key);

  const authHeaders = {
    'apikey': key,
    'Authorization': 'Bearer ' + key,
  };

  // Perform a Supabase PostgREST call. `prefer` supports e.g.
  // 'return=minimal', 'resolution=merge-duplicates'.
  async function sb(path, { method = 'GET', body, prefer } = {}){
    const headers = { ...authHeaders, ...(body ? { 'Content-Type': 'application/json' } : {}) };
    if(prefer) headers['Prefer'] = prefer;
    const res = await fetchHttp(base + '/rest/v1' + path, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if(!res.ok){
      const detail = await res.text().catch(() => '');
      throw new Error('Supabase REST ' + res.status + ': ' + detail.slice(0, 200));
    }
    if(res.status === 204) return null;
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  const pg = (v) => encodeURIComponent(v);

  function iso(d){ return d ? new Date(d).toISOString() : null; }

  return {
    connected,

    async getStudentStatus(phone){
      if(!connected) return null;
      const rows = await sb('/students?select=status&phone=eq.' + pg(phone) + '&limit=1');
      return rows && rows.length ? rows[0].status : null;
    },

    async getAdminData(){
      const students = [], feedback = [], exams = [];
      if(connected){
        // Deliberately NOT caught: a failed table read (bad key, missing schema,
        // Supabase down) must surface as an error (the dispatcher returns 500) so
        // an outage is never mistaken for an empty-but-healthy database.
        const sRows = await sb('/students?select=*&order=registered_at.desc');
        const fRows = await sb('/feedback?select=*&order=created_at.desc');
        const eRows = await sb('/exam_logs?select=*&order=taken_at.desc');
        for(const r of sRows || []){
          students.push({ name: r.name, phone: r.phone, status: r.status, registered_at: iso(r.registered_at), when: iso(r.registered_at), notes: r.notes });
        }
        for(const r of fRows || []){
          feedback.push({ id: r.id, n: r.student_name, phone: r.student_phone, t: r.question, reply: r.reply, replyAt: iso(r.reply_at), by: r.replied_by, w: iso(r.created_at) });
        }
        for(const r of eRows || []){
          exams.push({ student: r.student_phone, scope: r.scope, score: r.score, total_questions: r.total_questions, duration_seconds: r.duration_seconds, passed: !!r.passed, taken: iso(r.taken_at), when: iso(r.taken_at) });
        }
      }
      return { students, feedback, exams };
    },

    // Upsert by unique phone (mirrors MySQL ON DUPLICATE KEY UPDATE).
    async registerStudent(v){
      if(!connected) return;
      await sb('/students', {
        method: 'POST',
        body: { name: v.name, phone: v.phone, status: v.status, last_active: new Date().toISOString() },
        prefer: 'return=minimal,resolution=merge-duplicates',
      });
    },

    async updateStudentStatus(phone, status){
      if(!connected) return;
      await sb('/students?phone=eq.' + pg(phone), {
        method: 'PATCH',
        body: { status, last_active: new Date().toISOString() },
        prefer: 'return=minimal',
      });
    },

    async deleteStudent(phone){
      if(!connected) return;
      await sb('/exam_logs?student_phone=eq.' + pg(phone), { method: 'DELETE', prefer: 'return=minimal' }).catch(() => {});
      await sb('/students?phone=eq.' + pg(phone), { method: 'DELETE', prefer: 'return=minimal' });
    },

    async logExam(ex){
      if(!connected) return;
      await sb('/exam_logs', {
        method: 'POST',
        body: {
          student_phone: ex.student_phone || null,
          scope: ex.scope,
          score: Math.round(ex.score),
          total_questions: Math.round(ex.total_questions),
          duration_seconds: ex.duration_seconds || null,
          passed: !!ex.passed,
        },
        prefer: 'return=minimal',
      });
    },

    async addFeedback(fb){
      if(!connected) return;
      await sb('/feedback', {
        method: 'POST',
        body: { student_name: fb.name || 'نامەلۇم', student_phone: fb.phone || null, question: fb.text, is_public: true },
        prefer: 'return=minimal',
      });
    },

    async replyFeedback(id, reply, repliedBy){
      if(!connected) return;
      await sb('/feedback?id=eq.' + pg(id), {
        method: 'PATCH',
        body: { reply, reply_at: new Date().toISOString(), replied_by: repliedBy },
        prefer: 'return=minimal',
      });
    },

    async updateAdmin(admin, username){
      if(!connected) return;
      await sb('/admins?username=eq.' + pg(username), {
        method: 'PATCH',
        body: { full_name: admin.full_name || 'باشقۇرغۇچى', password_hash: admin.password_hash || null },
        prefer: 'return=minimal',
      });
    }
  };
}

module.exports = { createDriver };