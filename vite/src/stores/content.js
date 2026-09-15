import { defineStore } from 'pinia'
import { loadData, syncLessonsCache } from '../data/loader'

// Source of truth for the admin content editors (lessons + teachers).
// Mirrors the vanilla admin.html model:
//   - reads custom overrides from uytibb_custom_lessons / uytibb_custom_teachers
//   - falls back to the root data.js defaults
//   - persists every change back to the same localStorage keys so the learner
//     app (vite/src/data/loader.js) picks edits up without any further wiring.
// Defaults are deep-cloned into the store so editing never mutates the shared
// window.DEFAULT_LESSONS / window.DEFAULT_TEACHERS globals.

const LS_LESSONS = 'uytibb_custom_lessons'
const LS_TEACHERS = 'uytibb_custom_teachers'

const QUIZ_TYPES = ['choice', 'tf', 'blank', 'match', 'essay']

// ---- pure helpers (node-testable; no DOM) ----

function asStr(v) { return v == null ? '' : String(v) }
function asStrArray(v) { return Array.isArray(v) ? v.map(asStr) : [] }

function normalizeLesson(L) {
  if (!L || typeof L !== 'object') return null
  const id = Number(L.id)
  if (!Number.isInteger(id) || id <= 0) return null
  if (!asStr(L.title).trim()) return null

  const n = {
    id,
    title: asStr(L.title),
    short: asStr(L.short),
    subtitle: asStr(L.subtitle),
    desc: asStr(L.desc),
    goals: asStrArray(L.goals),
    sections: Array.isArray(L.sections)
      ? L.sections.map(s => ({
          h: asStr(s && s.h),
          body: asStr(s && s.body),
          points: asStrArray(s && s.points)
        }))
      : [],
    terms: Array.isArray(L.terms)
      ? L.terms.map(t => ({ w: asStr(t && t.w), m: asStr(t && t.m) }))
      : [],
    quiz: Array.isArray(L.quiz)
      ? L.quiz.map(q => {
          const type = QUIZ_TYPES.includes(q && q.type) ? q.type : 'essay'
          const nq = { type, q: asStr(q.q), exp: asStr(q.exp) }
          if (type === 'choice') {
            nq.opts = asStrArray(q.opts)
            nq.a = Number(q.a)
            if (!Number.isInteger(nq.a) || nq.a < 0 || nq.a >= nq.opts.length) nq.a = 0
          } else if (type === 'tf') {
            nq.a = Boolean(q.a)
          } else if (type === 'blank') {
            nq.a = Array.isArray(q.a) ? q.a.map(asStrArray) : []
          } else if (type === 'match') {
            nq.pairs = Array.isArray(q.pairs)
              ? q.pairs.map(p => (Array.isArray(p) ? [asStr(p[0]), asStr(p[1])] : [asStr(p && p.a), asStr(p && p.b)]))
              : []
          } else {
            nq.model = asStr(q.model)
          }
          return nq
        })
      : []
  }
  if (L.pdfUrl !== undefined) n.pdfUrl = asStr(L.pdfUrl)
  if (L.pdfData !== undefined) n.pdfData = asStr(L.pdfData)
  if (L.pdfTitle !== undefined) n.pdfTitle = asStr(L.pdfTitle)
  return n
}

function normalizeTeacher(T) {
  if (!T || typeof T !== 'object') return null
  if (!asStr(T.name).trim()) return null
  const n = { name: asStr(T.name) }
  for (const k of ['years', 'field', 'tag', 'bio', 'works']) {
    if (T[k] !== undefined) n[k] = asStr(T[k])
  }
  return n
}

function validateLessons(arr) {
  if (!Array.isArray(arr)) return null
  const seen = new Set()
  const out = []
  for (const L of arr) {
    const n = normalizeLesson(L)
    if (!n) return null
    if (seen.has(n.id)) return null
    seen.add(n.id)
    out.push(n)
  }
  return out
}

function validateTeachers(arr) {
  if (arr === undefined) return null
  if (!Array.isArray(arr)) return null
  const out = []
  for (const T of arr) {
    const n = normalizeTeacher(T)
    if (!n) return null
    out.push(n)
  }
  return out
}

function cloneDefaults() {
  const d = loadData()
  return {
    lessons: JSON.parse(JSON.stringify(d.lessons || [])),
    teachers: JSON.parse(JSON.stringify(d.teachers || []))
  }
}

export const useContent = defineStore('content', {
  state: () => ({
    loaded: false,
    lessons: [],
    teachers: [],
    currentLessonId: null
  }),
  actions: {
    init() {
      if (this.loaded) return
      syncLessonsCache()
      const def = cloneDefaults()

      let lessons = def.lessons
      const rawL = localStorage.getItem(LS_LESSONS)
      if (rawL) {
        try {
          const custom = JSON.parse(rawL)
          if (Array.isArray(custom)) {
            lessons = custom.map(L => {
              const orig = def.lessons.find(x => Number(x.id) === Number(L.id)) || {}
              if (orig.quiz && (!L.quiz || L.quiz.length < orig.quiz.length)) {
                L.quiz = orig.quiz.slice()
              }
              if (!L.pdfUrl && orig.pdfUrl) L.pdfUrl = orig.pdfUrl
              if (!L.pdfTitle && orig.pdfTitle) L.pdfTitle = orig.pdfTitle
              return L
            })
            try {
              localStorage.setItem(LS_LESSONS, JSON.stringify(lessons))
            } catch (e) {}
          }
        } catch (e) {
          lessons = def.lessons
        }
      }

      let teachers = def.teachers
      const rawT = localStorage.getItem(LS_TEACHERS)
      if (rawT) {
        try {
          const custom = JSON.parse(rawT)
          if (Array.isArray(custom)) teachers = custom
        } catch (e) {
          teachers = def.teachers
        }
      }

      this.lessons = lessons
      this.teachers = teachers
      if (!this.currentLessonId || !this.lessonById(this.currentLessonId)) {
        this.currentLessonId = this.lessons.length ? this.lessons[0].id : 1
      }
      this.loaded = true
    },

    lessonById(id) {
      return this.lessons.find(L => Number(L.id) === Number(id)) || null
    },

    saveAll() {
      try {
        localStorage.setItem(LS_LESSONS, JSON.stringify(this.lessons))
        localStorage.setItem(LS_TEACHERS, JSON.stringify(this.teachers))
        return true
      } catch (e) {
        return false
      }
    },

    addLesson() {
      const ids = this.lessons.map(l => Number(l.id) || 0)
      const newId = ids.length ? Math.max.apply(null, ids) + 1 : 1
      const newL = {
        id: newId,
        title: newId + '-دەرسلىك: ئۇيغۇر تېبابىتى يېڭى نەزەرىيە بىلىملىرى',
        short: newId + '-دەرس',
        subtitle: newId + '-دەرسلىكنىڭ تېبابەت قائىدىلىرى ۋە تەن پەرۋىشى',
        desc: 'بۇ دەرسلىكتە ئۇيغۇر تېبابىتى نەزەرىيىسى ۋە ساقلىقنى ساقلاش چارىلىرى تەپسىلىي بايان قىلىنىدۇ.',
        goals: [
          newId + '-دەرسلىكنىڭ تۈپ نەزەرىيە بىلىملىرىنى تولۇق ئۆزلەشتۈرۈش',
          'تېبابەتتىكى ئاساسلىق ئاتالغۇلار ۋە پەرۋىش تەدبىرلىرىنى پەرقلەندۈرۈش',
          'دەرسكە چېتىشلىق تەكرارلاش سوئاللىرىغا مۇستەقىل جاۋاب بېرىش'
        ],
        sections: [
          {
            h: '1. كىرىش سۆز ۋە ئاساسىي پىرىنسىپلار',
            body: '<p>ئۇيغۇر تېبابىتى مىڭ يىللاردىن بۇيان ئەجدادلىرىمىزنىڭ ئەمەلىي تەجرىبىلىرى ئاساسىدا شەكىللەنگەن مۇكەممەل داۋالاش ۋە ساقلىق ساقلاش سىستېمىسىدۇر.</p><p>بۇ ' + newId + '-دەرسلىكتە بايان قىلىنغان پرىنسىپلار ئارقىلىق تەن ساغلاملىقىنى قوغداش ۋە كېسەللىكلەرنىڭ ئالدىنى ئېلىش چارىلىرى چوڭقۇر ئۆگىنىلىدۇ.</p>',
            points: ['تەن تەبىئىتىنى ئاسراش', 'كېسەللىكلەرنىڭ ئالدىنى ئېلىش تەدبىرلىرى']
          },
          {
            h: '2. موھىم نۇقتىلار ۋە تەتبىقلىنىشى',
            body: '<p>ئۇيغۇر تېبابىتىدە مىزاج، بەدەن ئورگانلىرى ۋە روھنىڭ ماسلىقى تەبىئىي كۈچنى قۇۋۋەتلەشنىڭ ئاساسى ھېسابلىنىدۇ.</p><p>كۈندىلىك پەرۋىشتە يېمەك-ئىچمەك ۋە ئادەتلەرنى مۇۋاپىق تەڭشەش كېرەك.</p>',
            points: ['قائىدىگە قاتتىق رىئايە قىلىش', 'ئەمەلىيەت بىلەن بىرلەشتۈرۈش']
          }
        ],
        terms: [
          { w: newId + '-دەرس ئاتالغۇسى', m: 'بۇ دەرسلىكتە بايان قىلىنغان ئاساسلىق تېبابەت كەسپىي ئۇقۇمى.' }
        ],
        quiz: [
          {
            type: 'choice',
            q: 'بۇ ' + newId + '-دەرسلىكنىڭ ئاساسىي ئۆگىنىش مەقسىتى نېمە؟',
            opts: ['تېبابەت نەزەرىيە قائىدىلىرىنى ئۆگىنىش ۋە ئەمەلىيەتكە تەتبىقلاش', 'پەقەت يادلاپ قويۇش', 'سەل قاراش', 'ھېچقايسىسى ئەمەس'],
            a: 0,
            exp: 'دەرسنىڭ تۈپ مەقسىتى تېبابەت ئىلمىنى توغرا ئۆگىنىش ۋە كۈندىلىك ساغلاملىققا تەتبىقلاش.'
          },
          {
            type: 'tf',
            q: 'ئۇيغۇر تېبابىتى تەننىڭ تەبىئىي كۈچىگە تايىنىپ ساقلىقنى ساقلاشنى ئاساس قىلىدۇ.',
            a: true,
            exp: 'بەدەننىڭ تەبىئىي كۈچى ۋە قۇۋۋىتى تېبابەتنىڭ ئەڭ موھىم ئاساسىدۇر.'
          },
          {
            type: 'blank',
            q: 'ئۇيغۇر تېبابىتىنىڭ ئەڭ تۈپ پىرىنسىپى: ساقلىقنى ساقلاش ۋە كېسەللىكنىڭ ___ ئېلىشتۇر.',
            a: [['ئالدىنى', 'ئالدىنى ئېلىش']],
            exp: 'ساقلىقنى ساقلاش ۋە كېسەللىكلەرنىڭ ئالدىنى ئېلىش تۈپ پىرىنسىپتۇر.'
          },
          {
            type: 'essay',
            q: 'بۇ ' + newId + '-دەرسلىكتىن ئىگىلىگەن مۇھىم نەزەرىيە بىلىملىرىنى يىغىنچاقلاڭ.',
            model: 'بۇ دەرستە تېبابەت نەزەرىيىسى، تەن ئاسراش ۋە كېسەللىكنىڭ ئالدىنى ئېلىشنىڭ مۇھىملىقى بايان قىلىندى.'
          }
        ],
        pdfUrl: 'pdf/lesson-' + newId + '.pdf',
        pdfTitle: newId + '-دەرسلىك كىتابى (PDF)'
      }
      this.lessons.push(newL)
      this.currentLessonId = newId
      this.saveAll()
      return newL
    },

    deleteLesson(id) {
      if (this.lessons.length <= 1) return false
      const L = this.lessonById(id)
      if (!L) return false
      const idx = this.lessons.findIndex(x => Number(x.id) === Number(id))
      if (idx >= 0) this.lessons.splice(idx, 1)
      this.currentLessonId = this.lessons.length ? this.lessons[0].id : 1
      this.saveAll()
      return true
    },

    resetDefaults() {
      localStorage.removeItem(LS_LESSONS)
      localStorage.removeItem(LS_TEACHERS)
      const def = cloneDefaults()
      this.lessons = def.lessons
      this.teachers = def.teachers
      this.currentLessonId = this.lessons.length ? this.lessons[0].id : 1
    },

    restore(data) {
      if (!data || typeof data !== 'object') return { ok: false, error: 'زاپاس ھۆججەت قۇرۇلمىسى خاتا' }
      const lessons = validateLessons(data.lessons)
      if (!lessons) {
        return {
          ok: false,
          error: 'دەرسلەر سانلىق مەلۇماتى خاتا (id سان بولۇشى ۋە بىردىنبىر ۋە title تولدۇرۇلغان بولۇشى كېرەك)'
        }
      }
      const teachers = validateTeachers(data.teachers)
      if (!teachers) return { ok: false, error: 'ئۇستازلار سانلىق مەلۇماتى خاتا (har بىرىنىڭ name بولۇشى كېرەك)' }
      this.lessons = lessons
      this.teachers = teachers
      this.currentLessonId = this.lessons.length ? this.lessons[0].id : 1
      const saved = this.saveAll()
      if (!saved) return { ok: false, error: 'يەرلىك ئەسلىھەگە ساقلاش مەغلۇپ بولدى (خېرىدار ساقلاش چېكىدىن ئېشىپ كەتتى)' }
      return { ok: true }
    },

    backup() {
      return {
        version: '2.0',
        exportDate: new Date().toISOString(),
        lessons: this.lessons,
        teachers: this.teachers,
        students: (() => { try { return JSON.parse(localStorage.getItem('uytibb_all_students') || '[]') } catch (e) { return [] } })(),
        feedback: (() => { try { return JSON.parse(localStorage.getItem('uytibb_feedback') || '[]') } catch (e) { return [] } })()
      }
    }
  }
})