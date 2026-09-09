import '../../../data.js'
// Root `data.js` assigns window.DEFAULT_LESSONS / window.DEFAULT_TEACHERS.
// Imported here (single source of truth) while the legacy vanilla app still
// consumes the same file directly.

export function loadData() {
  // data.js has already executed (module side effect); this keeps the app
  // bootstrap explicit and idempotent.
  return { lessons: window.DEFAULT_LESSONS || [], teachers: window.DEFAULT_TEACHERS || [] }
}

function customLessons() {
  try {
    const raw = localStorage.getItem('uytibb_custom_lessons')
    if (!raw) return null
    const custom = JSON.parse(raw)
    if (!Array.isArray(custom) || !custom.length) return null
    return custom.map((L, idx) => {
      const lid = L.id || (idx + 1)
      if (lid >= 1 && lid <= 10) {
        L.pdfUrl = 'pdf/lesson-' + lid + '.pdf?v=20260909_original'
        delete L.pdfData
      } else {
        L.pdfUrl = L.pdfUrl || ('pdf/lesson-' + lid + '.pdf')
      }
      L.pdfTitle = L.pdfTitle || ((L.title ? (lid + '-دەرسلىك: ' + L.title) : (lid + '-دەرس')) + ' كىتابى (PDF)')
      return L
    })
  } catch (e) { return null }
}

function customTeachers() {
  try {
    const raw = localStorage.getItem('uytibb_custom_teachers')
    if (!raw) return null
    const arr = JSON.parse(raw)
    return Array.isArray(arr) && arr.length ? arr : null
  } catch (e) { return null }
}

export function getLessons() {
  return customLessons() || window.DEFAULT_LESSONS || []
}

export function getTeachers() {
  return customTeachers() || window.DEFAULT_TEACHERS || []
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