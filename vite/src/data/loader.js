import '../../../data.js'
// Root `data.js` assigns window.DEFAULT_LESSONS / window.DEFAULT_TEACHERS.
// Imported here (single source of truth) while the legacy vanilla app still
// consumes the same file directly.

export function loadData() {
  // data.js has already executed (module side effect); this keeps the app
  // bootstrap explicit and idempotent.
  return { lessons: window.DEFAULT_LESSONS || [], teachers: window.DEFAULT_TEACHERS || [] }
}

const LS_LESSONS = 'uytibb_custom_lessons'
const CACHE_MIN_LESSONS = 11
const CACHE_MIN_QUESTIONS = 500

// Mirrors upstream's autoRepairLessonsCache: a cached copy that falls short of
// the current default dataset is dropped so the app falls back to DEFAULT_LESSONS.
export function syncLessonsCache() {
  try {
    const raw = localStorage.getItem(LS_LESSONS)
    if (!raw) return
    const custom = JSON.parse(raw)
    let qSum = 0
    if (Array.isArray(custom)) custom.forEach(l => { if (l && l.quiz) qSum += l.quiz.length })
    if (!Array.isArray(custom) || custom.length < CACHE_MIN_LESSONS || qSum < CACHE_MIN_QUESTIONS) {
      localStorage.removeItem(LS_LESSONS)
    }
  } catch (e) {
    try { localStorage.removeItem(LS_LESSONS) } catch (_) {}
  }
}

function customLessons() {
  syncLessonsCache()
  try {
    const raw = localStorage.getItem(LS_LESSONS)
    if (!raw) return null
    const custom = JSON.parse(raw)
    if (!Array.isArray(custom) || !custom.length) return null
    const merged = custom.map((L, idx) => {
      const lid = L.id || (idx + 1)
      const def = (window.DEFAULT_LESSONS || []).find(x => Number(x.id) === Number(lid))
      if (def && def.quiz && (!L.quiz || L.quiz.length < def.quiz.length)) {
        L.quiz = def.quiz.slice()
      }
      if (lid >= 1 && lid <= 11) {
        L.pdfUrl = (def && def.pdfUrl) || ('pdf/lesson-' + lid + '.pdf?v=20260909_original')
        delete L.pdfData
      } else {
        L.pdfUrl = L.pdfUrl || ('pdf/lesson-' + lid + '.pdf')
      }
      L.pdfTitle = L.pdfTitle || ((L.title ? (lid + '-دەرسلىك: ' + L.title) : (lid + '-دەرس')) + ' كىتابى (PDF)')
      return L
    })
    try {
      localStorage.setItem(LS_LESSONS, JSON.stringify(merged))
    } catch (e) {}
    return merged
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