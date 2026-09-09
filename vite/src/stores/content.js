import { defineStore } from 'pinia'
import { loadData } from '../data/loader'

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
      const def = cloneDefaults()

      let lessons = def.lessons
      const rawL = localStorage.getItem(LS_LESSONS)
      if (rawL) {
        try {
          const custom = JSON.parse(rawL)
          if (Array.isArray(custom)) {
            lessons = custom
            lessons.forEach((L, idx) => {
              const orig = def.lessons[idx] || {}
              if (!L.pdfUrl && orig.pdfUrl) L.pdfUrl = orig.pdfUrl
              if (!L.pdfTitle && orig.pdfTitle) L.pdfTitle = orig.pdfTitle
            })
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
      localStorage.setItem(LS_LESSONS, JSON.stringify(this.lessons))
      localStorage.setItem(LS_TEACHERS, JSON.stringify(this.teachers))
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
      if (!data || !Array.isArray(data.lessons)) return false
      this.lessons = data.lessons
      this.teachers = Array.isArray(data.teachers) ? data.teachers : this.teachers
      this.currentLessonId = this.lessons.length ? this.lessons[0].id : 1
      this.saveAll()
      return true
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