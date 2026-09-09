import { defineStore } from 'pinia'
import { getLessons } from '../data/loader'

// Port of the vanilla app's localStorage progress model (key uytibb_v1),
// kept byte-compatible so switching from legacy index.html loses nothing.
const KEY = 'uytibb_v1'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') } catch (e) { return {} }
}

function full() {
  const s = read()
  s.lessons = s.lessons || {}
  s.exams = s.exams || []
  s.streak = s.streak || { d: 0, n: 0, best: 0 }
  s.badges = s.badges || []
  s.wrong = s.wrong || []
  s.marks = s.marks || []
  return s
}

function save(s) {
  const existing = read()
  const merged = { ...existing, ...s }
  merged.lessons = { ...(existing.lessons || {}), ...(s.lessons || {}) }
  merged.exams = s.exams || existing.exams || []
  merged.badges = s.badges || existing.badges || []
  merged.wrong = s.wrong || existing.wrong || []
  merged.marks = s.marks || existing.marks || []
  localStorage.setItem(KEY, JSON.stringify(merged))
}

export const useProgress = defineStore('progress', {
  state: () => ({
    data: full(),
    ready: true
  }),
  getters: {
    lessonsRead: s => {
      const lessons = getLessons()
      return lessons.filter(l => (s.data.lessons[l.id] || {}).read).length
    },
    lessonsTotal: () => getLessons().length,
    pctRead: s => {
      const total = getLessons().length
      if (!total) return 0
      const done = getLessons().filter(l => (s.data.lessons[l.id] || {}).read).length
      return Math.round((done / total) * 100)
    },
    user: s => s.data.user || null,
    streak: s => s.data.streak,
    exams: s => s.data.exams,
    badges: s => s.data.badges,
    wrong: s => s.data.wrong,
    marks: s => s.data.marks,
    bestFor: s => id => (s.data.lessons[id] || {}).best,
    isRead: s => id => !!(s.data.lessons[id] || {}).read
  },
  actions: {
    _sync() { this.data = full() },
    markRead(id) {
      const s = full()
      s.lessons[id] = s.lessons[id] || {}
      s.lessons[id].read = true
      save(s)
      this._sync()
    },
    saveBest(id, pct) {
      const s = full()
      s.lessons[id] = s.lessons[id] || {}
      if (s.lessons[id].best == null || pct > s.lessons[id].best) s.lessons[id].best = pct
      save(s)
      this._sync()
    },
    saveLast(id) {
      const s = full()
      s.lastLesson = id
      save(s)
      this._sync()
    },
    addExam(rec) {
      const s = full()
      s.exams.push(rec)
      save(s)
      this._sync()
    },
    setUser(u) {
      const s = full()
      s.user = u
      save(s)
      this._sync()
    },
    addWrong(q) {
      const s = full()
      const has = s.wrong.some(w => w.q && w.q === q.q)
      if (!has) { s.wrong.push(q); s.wrong = s.wrong.slice(-200) }
      save(s)
      this._sync()
    },
    removeWrong(q) {
      const s = full()
      s.wrong = s.wrong.filter(w => !(w.q && w.q === q.q))
      save(s)
      this._sync()
    },
    updateStreak() {
      const today = new Date().toDateString()
      const s = full()
      const streak = s.streak || { d: 0, n: 0, best: 0 }
      if (streak.d !== today) {
        const y = new Date(Date.now() - 86400000).toDateString()
        streak.n = streak.d === y ? streak.n + 1 : 1
        streak.d = today
        streak.best = Math.max(streak.best, streak.n)
      }
      s.streak = streak
      save(s)
      this._sync()
    }
  }
})