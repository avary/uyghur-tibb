// api/students.js - Vercel Serverless Function for Students, Approvals & Q&A Feedback

let inMemoryStudents = [];
let inMemoryExams = [];
let inMemoryFeedback = [];

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
      
      // 1. Register student
      if (data.action === 'register' && data.user) {
        const existing = inMemoryStudents.find(s => s.phone === data.user.phone);
        if (existing) {
          existing.name = data.user.name;
          if (data.user.status) existing.status = data.user.status;
        } else {
          inMemoryStudents.unshift(data.user);
        }
        return res.status(200).json({ status: 'ok', message: 'Student registered' });
      }

      // 2. Approve or update student status
      if (data.action === 'update_status' && data.phone && data.status) {
        const student = inMemoryStudents.find(s => s.phone === data.phone);
        if (student) {
          student.status = data.status;
        } else {
          inMemoryStudents.unshift({ phone: data.phone, status: data.status, when: new Date().toISOString() });
        }
        return res.status(200).json({ status: 'ok', message: 'Status updated' });
      }

      // 3. Log exam
      if (data.action === 'exam' && data.exam) {
        inMemoryExams.unshift(data.exam);
        return res.status(200).json({ status: 'ok', message: 'Exam result logged' });
      }

      // 4. Feedback / Question
      if (data.action === 'feedback' && data.feedback) {
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
    return res.status(200).json({
      status: 'ok',
      students: inMemoryStudents,
      exams: inMemoryExams,
      feedback: inMemoryFeedback,
      serverTime: new Date().toISOString()
    });
  }

  return res.status(405).json({ status: 'error', message: 'Method not allowed' });
};
