import '../../../data.js'
// Root `data.js` assigns window.DEFAULT_LESSONS / window.DEFAULT_TEACHERS.
// Imported here (single source of truth) while the legacy vanilla app still
// consumes the same file directly.

export function loadData() {
  // data.js has already executed (module side effect); this keeps the app
  // bootstrap explicit and idempotent.
  return { lessons: window.DEFAULT_LESSONS || [], teachers: window.DEFAULT_TEACHERS || [] }
}

export function getLessons() {
  return window.DEFAULT_LESSONS || []
}

export function getTeachers() {
  return window.DEFAULT_TEACHERS || []
}

export function lessonById(id) {
  const n = Number(id)
  return getLessons().find(l => l.id === n) || null
}

export function countQuestions(filterFn) {
  let n = 0
  getLessons().forEach(l => (l.quiz || []).forEach(q => {
    if (!filterFn || filterFn(q)) n++
  }))
  return n
}

export const QTYPES = {
  choice: 'جاۋاب تاللاش',
  tf: 'توغرا-خاتا',
  blank: 'بوش ئورۇن تولدۇرۇش',
  match: 'تۇتاشتۇرۇش',
  essay: 'جاۋاب بېرىش'
}
export const QTICON = { choice: '☑', tf: '✓✗', blank: '✎', match: '🔗', essay: '✍' }