import { ref, reactive } from 'vue'
import { useProgress } from '../stores/progress'

// Quiz engine — drives one-at-a-time practice for a lesson's question set.
// Supports choice / tf / blank / match / essay with live checking, wrong
// tracking, score, and review. Results persist via the progress store.
export function useQuiz(initialQuestions = [], lessonId = null) {
  const progress = useProgress()
  const questions = ref(initialQuestions || [])
  const idx = ref(0)
  const lesson = ref(lessonId)

  const step = ref('run')
  const score = ref(0)
  const tot = ref(0)

  // reactive per-question state (indexed by position in questions)
  const answers = reactive([])
  const checked = reactive([])
  const selfGood = reactive([])
  const storageKey = () => lesson.value == null ? '' : 'uytibb_quiz_attempt_' + lesson.value

  function persistAttempt() {
    const key = storageKey()
    if (!key || step.value !== 'run') return
    try {
      localStorage.setItem(key, JSON.stringify({ idx: idx.value, answers, checked, selfGood }))
    } catch (e) {}
  }

  function restoreAttempt() {
    const key = storageKey()
    if (!key) return
    try {
      const saved = JSON.parse(localStorage.getItem(key) || 'null')
      if (!saved || !Array.isArray(saved.answers) || saved.answers.length !== questions.value.length) return
      saved.answers.forEach((answer, i) => Object.assign(answers[i], answer || {}))
      saved.checked?.forEach((value, i) => { checked[i] = !!value })
      saved.selfGood?.forEach((value, i) => { selfGood[i] = !!value })
      idx.value = Math.min(Math.max(Number(saved.idx) || 0, 0), Math.max(questions.value.length - 1, 0))
    } catch (e) {}
  }

  function resetMetrics() {
    score.value = 0
    tot.value = questions.value.length
  }
  function initState() {
    answers.splice(0, answers.length)
    checked.splice(0, checked.length)
    selfGood.splice(0, selfGood.length)
    questions.value.forEach((qq, i) => {
      answers[i] = defaultAnswer(qq)
      checked[i] = false
      selfGood[i] = false
    })
  }
  function load(qs, lId) {
    questions.value = qs || []
    lesson.value = lId
    idx.value = 0
    step.value = 'run'
    initState()
    resetMetrics()
    restoreAttempt()
  }

  initState()
  resetMetrics()
  restoreAttempt()

  const q = () => questions.value[idx.value]
  const isLast = () => idx.value >= questions.value.length - 1

  function defaultAnswer(qq) {
    if (qq.type === 'choice' || qq.type === 'tf') return { sel: null }
    if (qq.type === 'blank') return { vals: (qq.a || []).map(() => '') }
    if (qq.type === 'match') return { map: {} }
    return { text: '' }
  }

  // is answer object correct for this question?
  function isCorrect(qq, ans) {
    if (!ans) return false
    if (qq.type === 'choice') return ans.sel != null && ans.sel === qq.a
    if (qq.type === 'tf') return ans.sel != null && ans.sel === qq.a
    if (qq.type === 'blank') {
      return qq.a.every((acc, slot) => {
        const inp = norm((ans.vals || [])[slot])
        return acc.some(a => norm(a) === inp)
      })
    }
    if (qq.type === 'match') {
      return qq.pairs.every(([l, r]) => ans.map[l] === r)
    }
    return false // essay handled by selfGood
  }

  function norm(s) {
    return String(s || '')
      .replace(/ي/g, 'ى').replace(/ک/g, 'ك')
      .replace(/[\u200c\u200d\u064b-\u0652]/g, '')
      .replace(/\s+/g, ' ').trim()
  }

  function check() {
    const i = idx.value
    checked[i] = true
    const qq = q()
    const ok = qq.type === 'essay' ? !!selfGood[i] : isCorrect(qq, answers[i])
    progress.updateStreak()
    if (ok) {
      if (!progress.wrong.some(w => w.q && w.q === qq.q)) score.value++
      progress.removeWrong(qq)
    } else {
      progress.addWrong(qq)
    }
    tot.value = questions.value.length
    persistAttempt()
  }

  function next() {
    if (idx.value < questions.value.length - 1) idx.value++
    persistAttempt()
  }

  function prev() {
    if (idx.value > 0) idx.value--
    persistAttempt()
  }

  function finish() {
    const auto = questions.value.filter(qq => qq.type !== 'essay')
    const autoOk = auto.filter(qq => isCorrect(qq, answers[questions.value.indexOf(qq)])).length
    const pct = auto.length ? Math.round((autoOk / auto.length) * 100) : 0
    if (lesson.value != null) progress.saveBest(lesson.value, pct)
    step.value = 'done'
    try { localStorage.removeItem(storageKey()) } catch (e) {}
    return pct
  }

  function restart() {
    questions.value.forEach((qq, i) => {
      Object.assign(answers[i], defaultAnswer(qq))
      checked[i] = false
      selfGood[i] = false
    })
    idx.value = 0
    score.value = 0
    tot.value = questions.value.length
    step.value = 'run'
    try { localStorage.removeItem(storageKey()) } catch (e) {}
  }

  return { questions, idx, answers, checked, selfGood, step, score, tot, q, isLast, check, next, prev, finish, restart, isCorrect, load }
}
