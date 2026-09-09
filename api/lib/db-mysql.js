// api/lib/db-mysql.js - MySQL backend driver for /api/students.
//
// Exposes the same adapter surface as db-supabase.js so the API dispatcher
// (api/students.js) is fully driver-agnostic:
//
//   connected             bool  - whether credentials are configured
//   getStudentStatus      phone -> status|null
//   getAdminData          -> { students, feedback, exams }  (mapped to API shapes)
//   registerStudent       ({name,phone,status})
//   updateStudentStatus   (phone,status)
//   deleteStudent         (phone)
//   logExam               ({student_phone,scope,score,total_questions,duration_seconds,passed})
//   addFeedback           ({name,phone,text})
//   replyFeedback         (id, reply, repliedBy)
//   updateAdmin           ({full_name,password_hash}, username)
//
// Security: credentials come from MYSQL_* env vars only (never reach the
// browser). A single connection is opened per operation and always released.
const mysql = require('mysql2/promise');

function toIso(d){ return d ? new Date(d).toISOString() : null; }

function createDriver(){
  const DB = {
    host: process.env.MYSQL_HOST || '',
    port: Number(process.env.MYSQL_PORT || 3306),
    user: process.env.MYSQL_USER || '',
    password: process.env.MYSQL_PASSWORD || '',
    database: process.env.MYSQL_DATABASE || '',
  };
  const connected = !!(DB.host && DB.user && DB.password !== undefined && DB.database);

  async function withConn(fn){
    const conn = await mysql.createConnection(DB);
    try { return await fn(conn); }
    finally { await conn.end().catch(() => {}); }
  }

  return {
    connected,

    async getStudentStatus(phone){
      if(!connected) return null;
      return withConn(async (conn) => {
        const [rows] = await conn.execute('SELECT status FROM students WHERE phone = ?', [phone]);
        return rows.length ? rows[0].status : null;
      });
    },

    async getAdminData(){
      const students = [], feedback = [], exams = [];
      if(connected){
        await withConn(async (conn) => {
          const [sRows] = await conn.execute('SELECT * FROM students ORDER BY registered_at DESC');
          for(const r of sRows){
            students.push({ name: r.name, phone: r.phone, status: r.status, registered_at: toIso(r.registered_at), when: toIso(r.registered_at), notes: r.notes });
          }
          const [fRows] = await conn.execute('SELECT * FROM feedback ORDER BY created_at DESC');
          for(const r of fRows){
            feedback.push({ id: r.id, n: r.student_name, phone: r.student_phone, t: r.question, reply: r.reply, replyAt: toIso(r.reply_at), by: r.replied_by, w: toIso(r.created_at) });
          }
          const [eRows] = await conn.execute('SELECT * FROM exam_logs ORDER BY taken_at DESC');
          for(const r of eRows){
            exams.push({ student: r.student_phone, scope: r.scope, score: r.score, total_questions: r.total_questions, duration_seconds: r.duration_seconds, passed: !!r.passed, taken: toIso(r.taken_at), when: toIso(r.taken_at) });
          }
        });
      }
      return { students, feedback, exams };
    },

    async registerStudent(v){
      if(!connected) return;
      await withConn(async (conn) => {
        await conn.execute(
          'INSERT INTO students (name, phone, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name), status = VALUES(status), last_active = NOW()',
          [v.name, v.phone, v.status]
        );
      });
    },

    async updateStudentStatus(phone, status){
      if(!connected) return;
      await withConn(async (conn) => {
        await conn.execute('UPDATE students SET status = ?, last_active = NOW() WHERE phone = ?', [status, phone]);
      });
    },

    async deleteStudent(phone){
      if(!connected) return;
      await withConn(async (conn) => {
        await conn.execute('DELETE FROM exam_logs WHERE student_phone = ?', [phone]);
        await conn.execute('DELETE FROM students WHERE phone = ?', [phone]);
      });
    },

    async logExam(ex){
      if(!connected) return;
      await withConn(async (conn) => {
        await conn.execute(
          'INSERT INTO exam_logs (student_phone, scope, score, total_questions, duration_seconds, passed) VALUES (?, ?, ?, ?, ?, ?)',
          [ex.student_phone || null, ex.scope, Math.round(ex.score), Math.round(ex.total_questions), ex.duration_seconds || null, ex.passed ? 1 : 0]
        );
      });
    },

    async addFeedback(fb){
      if(!connected) return;
      await withConn(async (conn) => {
        await conn.execute(
          'INSERT INTO feedback (student_name, student_phone, question, is_public) VALUES (?, ?, ?, 1)',
          [fb.name || 'نامەلۇم', fb.phone || '', fb.text]
        );
      });
    },

    async replyFeedback(id, reply, repliedBy){
      if(!connected) return;
      await withConn(async (conn) => {
        await conn.execute(
          'UPDATE feedback SET reply = ?, reply_at = NOW(), replied_by = ? WHERE id = ?',
          [reply, repliedBy, Number(id)]
        );
      });
    },

    async updateAdmin(admin, username){
      if(!connected) return;
      await withConn(async (conn) => {
        await conn.execute(
          'UPDATE admins SET full_name = ?, password_hash = ? WHERE username = ?',
          [admin.full_name || 'باشقۇرغۇچى', admin.password_hash || null, username]
        );
      });
    }
  };
}

module.exports = { createDriver };