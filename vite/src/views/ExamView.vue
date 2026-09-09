<script setup>
import { ref, computed, onBeforeUnmount } from 'vue'
import { useQuiz } from '../composables/useQuiz'
import { useProgress } from '../stores/progress'
import { getLessons } from '../data/loader'

const progress = useProgress()
const phase = ref('setup') // setup | run | done
const count = ref(10)
const scope = ref('all')
const xTime = ref(10)

const pool = computed(() => {
  const all = getLessons().flatMap(L =>
    (L.quiz || []).filter(q => q.type !== 'essay').map(q => ({ q, L }))
  )
  if (scope.value === 'read') {
    return all.filter(x => (progress.data.lessons[x.L.id] || {}).read)
  }
  return all
})

const quiz = useQuiz([], null)
const resultPct = ref(0)

function shuffle(a) {
  a = a.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]; a[i] = a[j]; a[j] = t
  }
  return a
}

// ---- timer ----
const remaining = ref(0)
let timer = null
const mmss = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return m + ':' + String(s).padStart(2, '0')
})
function beginTimer() {
  remaining.value = xTime.value * 60
  timer = setInterval(() => {
    remaining.value--
    if (remaining.value <= 0) { clearInterval(timer); timer = null; submit() }
  }, 1000)
}
onBeforeUnmount(() => { if (timer) clearInterval(timer) })

function start() {
  const pickedQs = shuffle(pool.value.map(x => x.q)).slice(0, Math.min(count.value, pool.value.length))
  quiz.load(pickedQs, null)
  phase.value = 'run'
  beginTimer()
}

function submit() {
  if (timer) { clearInterval(timer); timer = null }
  resultPct.value = quiz.finish()
  progress.addExam({ scope: scope.value, got: quiz.score, pct: resultPct.value, when: new Date().toISOString() })
  phase.value = 'done'
}

const answered = computed(() => quiz.checked.filter(Boolean).length)
</script>

<template>
  <section>
    <h2 class="pagettl">🗓️ ۋاقىتلىق سىناق</h2>

    <div v-if="phase === 'setup'" class="card setup">
      <p class="pagesub">بارلىق دەرسلەردىن تاللاپ ۋاقىتلىق سىناق ئىشلەڭ</p>

      <label class="lbl">سوئال سانى</label>
      <div class="chips">
        <button v-for="c in [10, 20, 40]" :key="c" class="chip" :class="{ on: count === c }" @click="count = c">{{ c }} سوئال</button>
      </div>

      <label class="lbl">دائىرىسى</label>
      <div class="chips">
        <button class="chip" :class="{ on: scope === 'all' }" @click="scope = 'all'">بارلىق دەرسلەر ({{ pool.length }})</button>
        <button class="chip" :class="{ on: scope === 'read' }" @click="scope = 'read'">ئوقۇغان دەرسلەر</button>
      </div>

      <label class="lbl">ۋاقىت</label>
      <div class="chips">
        <button v-for="m in [5, 10, 20, 30]" :key="m" class="chip" :class="{ on: xTime === m }" @click="xTime = m">{{ m }} مىنۇت</button>
      </div>

      <button class="btn btn-teal btn-block" style="margin-top:16px" :disabled="!pool.length" @click="start">🏁 سىناقنى باشلاش</button>
      <p v-if="!pool.length" class="hint" style="text-align:center;color:var(--red);font-size:.84rem;margin-top:8px">
        سوئال تېپىلمىدى — ئالدى بىلەن دەرسلەرنى ئوقۇڭ (ئوقۇغان دەرسلەر تاللانغاندا).
      </p>
    </div>

    <!-- run hud -->
    <div v-else-if="phase === 'run'" class="hud">
      <span class="pill teal">سوراق {{ quiz.idx.value + 1 }}/{{ quiz.tot.value }}</span>
      <span class="pill gold">⏱ {{ mmss }}</span>
      <span class="pill">✓ {{ answered }}/{{ quiz.tot.value }}</span>
      <span class="hud-spacer"></span>
      <button class="btn btn-danger btn-sm" @click="submit">تاپشۇرۇش</button>
    </div>

    <!-- run: question card (mirrors QuizView rendering) -->
    <div v-if="phase === 'run'" class="qcard" :class="'type-' + quiz.q().type">
      <div class="qlabel"><b>{{ quiz.q().type === 'choice' ? '☑' : quiz.q().type === 'tf' ? '✓✗' : quiz.q().type === 'blank' ? '✎' : '🔗' }}</b>{{ quiz.q().type === 'choice' ? 'جاۋاب تاللاش' : quiz.q().type === 'tf' ? 'توغرا-خاتا' : quiz.q().type === 'blank' ? 'بوش ئورۇن تولدۇرۇش' : 'تۇتاشتۇرۇش' }}</div>
      <h2 class="qtext">{{ quiz.q().q }}</h2>

      <div v-if="quiz.q().type === 'choice'" class="opts">
        <button v-for="(o, i) in quiz.q().opts" :key="i" class="opt" :class="{
          sel: quiz.answers[quiz.idx.value].sel === i,
          correct: quiz.checked[quiz.idx.value] && i === quiz.q().a,
          wrong: quiz.checked[quiz.idx.value] && quiz.answers[quiz.idx.value].sel === i && i !== quiz.q().a
        }" @click="!quiz.checked[quiz.idx.value] && (quiz.answers[quiz.idx.value].sel = i)">
          <span class="opt-i">{{ i + 1 }}</span>{{ o }}
        </button>
      </div>

      <div v-else-if="quiz.q().type === 'tf'" class="opts">
        <button class="opt" :class="{ sel: quiz.answers[quiz.idx.value].sel === true, correct: quiz.checked[quiz.idx.value] && quiz.q().a === true, wrong: quiz.checked[quiz.idx.value] && quiz.answers[quiz.idx.value].sel === true && quiz.q().a !== true }" @click="!quiz.checked[quiz.idx.value] && (quiz.answers[quiz.idx.value].sel = true)">✓ توغرا</button>
        <button class="opt" :class="{ sel: quiz.answers[quiz.idx.value].sel === false, correct: quiz.checked[quiz.idx.value] && quiz.q().a === false, wrong: quiz.checked[quiz.idx.value] && quiz.answers[quiz.idx.value].sel === false && quiz.q().a !== false }" @click="!quiz.checked[quiz.idx.value] && (quiz.answers[quiz.idx.value].sel = false)">✗ خاتا</button>
      </div>

      <div v-else-if="quiz.q().type === 'blank'" class="blanks">
        <div v-for="(acc, slot) in quiz.q().a" :key="slot" class="blank-row">
          <input
            class="input"
            :class="{ correct: quiz.checked[quiz.idx.value] && acc.some(a => (quiz.answers[quiz.idx.value].vals[slot] || '').trim().toLowerCase() === String(a).toLowerCase()), wrong: quiz.checked[quiz.idx.value] && !acc.some(a => (quiz.answers[quiz.idx.value].vals[slot] || '').trim().toLowerCase() === String(a).toLowerCase()) }"
            :placeholder="'بوش ئورۇن ' + (slot + 1)"
            v-model="quiz.answers[quiz.idx.value].vals[slot]"
            :disabled="quiz.checked[quiz.idx.value]"
          >
        </div>
      </div>

      <div v-else-if="quiz.q().type === 'match'" class="match">
        <div v-for="l in quiz.q().pairs.map(p => p[0])" :key="l" class="match-row">
          <div class="mtxt">{{ l }}</div>
          <select class="input" :disabled="quiz.checked[quiz.idx.value]" v-model="quiz.answers[quiz.idx.value].map[l]">
            <option value="" disabled>تاللاڭ…</option>
            <option v-for="r in [...new Set(quiz.q().pairs.map(p => p[1]))]" :key="r" :value="r">{{ r }}</option>
          </select>
        </div>
      </div>

      <div v-if="quiz.checked[quiz.idx.value]" class="exp" :class="{ bad: !quiz.isCorrect(quiz.q(), quiz.answers[quiz.idx.value]) }">
        <b>{{ quiz.isCorrect(quiz.q(), quiz.answers[quiz.idx.value]) ? 'توغرا!' : 'توغرا ئەمەس' }}</b>
        <span v-if="quiz.q().exp">{{ quiz.q().exp }}</span>
      </div>
    </div>

    <div v-if="phase === 'run'" class="quiz-nav">
      <button v-if="quiz.idx.value > 0" class="btn btn-ghost" @click="quiz.prev()">‹ ئالدىنقى</button>
      <button v-if="!quiz.checked[quiz.idx.value]" class="btn btn-teal" @click="quiz.check()">تەكشۈرۈش</button>
      <button v-if="quiz.checked[quiz.idx.value] && quiz.idx.value < quiz.tot.value - 1" class="btn btn-teal" @click="quiz.next()">كېيىنكى سوئال ›</button>
    </div>

    <!-- done -->
    <div v-else-if="phase === 'done'" class="card result">
      <div class="ring" :style="{ '--pct': resultPct + '%' }"><b>{{ resultPct }}%</b></div>
      <h2>{{ resultPct >= 60 ? 'مۇبارەك! 🎉' : 'تېخىمۇ كۆپ تەكرارلاڭ' }}</h2>
      <p class="muted">{{ quiz.score }} / {{ quiz.tot.value }} توغرا تەكشۈرۈلدى • %{{ resultPct }}</p>
      <div class="result-actions">
        <button class="btn btn-teal" @click="phase = 'setup'">يېڭى سىناق</button>
        <RouterLink class="btn btn-ghost" to="/lessons">← دەرسلەر</RouterLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.setup { display: flex; flex-direction: column; gap: 6px; }
.lbl { font-size: .82rem; font-weight: 800; color: var(--muted); margin-top: 12px; }
.chips { display: flex; gap: 8px; flex-wrap: wrap; }
.chip {
  border: 1.5px solid var(--line); background: var(--card-2); color: var(--ink);
  padding: .5rem 1.05rem; border-radius: 11px; font-weight: 700; font-size: .86rem; cursor: pointer;
  transition: all .15s ease;
}
.chip.on { background: var(--teal); border-color: var(--teal); color: #fff; }

.hud { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.hud-spacer { flex: 1; }
.hud .btn { margin-inline-start: auto; }

.qcard { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); }
.qlabel { display: inline-flex; align-items: center; gap: .45rem; background: var(--teal-light); color: var(--teal-dark); padding: .25rem .7rem; border-radius: 999px; font-size: .74rem; font-weight: 800; }
[data-theme="dark"] .qlabel { color: var(--teal); }
.qtext { font-size: 1.06rem; line-height: 1.5; margin: 12px 0 16px; }
.opts { display: flex; flex-direction: column; gap: 9px; }
.opt {
  display: flex; align-items: center; gap: 10px; text-align: start;
  background: var(--card-2); border: 1.5px solid var(--line); color: var(--ink);
  border-radius: 13px; padding: 11px 13px; font-size: .92rem; font-weight: 600; cursor: pointer;
  transition: border-color .15s ease, background .15s ease;
}
.opt-i { flex: none; width: 26px; height: 26px; border-radius: 8px; background: var(--card); border: 1px solid var(--line); display: grid; place-items: center; font-size: .78rem; color: var(--muted); }
.opt.sel { border-color: var(--teal); background: var(--teal-light); }
.opt.sel .opt-i { background: var(--teal); color: #fff; border-color: var(--teal); }
.opt.correct { border-color: var(--green); background: rgba(30,142,77,.14); }
.opt.correct .opt-i { background: var(--green); color: #fff; border-color: var(--green); }
.opt.wrong { border-color: var(--red); background: rgba(192,57,43,.12); }
.opt.wrong .opt-i { background: var(--red); color: #fff; border-color: var(--red); }
.blanks { display: flex; flex-direction: column; gap: 9px; }
.blank-row .input.correct { border-color: var(--green); box-shadow: 0 0 0 3px rgba(30,142,77,.15); }
.blank-row .input.wrong { border-color: var(--red); box-shadow: 0 0 0 3px rgba(192,57,43,.12); }
.match { display: flex; flex-direction: column; gap: 9px; }
.match-row { display: flex; gap: 8px; align-items: center; }
.mtxt { flex: 1; font-weight: 700; font-size: .9rem; background: var(--card-2); padding: 10px 12px; border-radius: 11px; border: 1px solid var(--line); }
.match-row select { flex: 1.2; }
.exp { margin-top: 16px; padding: 12px 14px; border-radius: 12px; font-size: .88rem; background: rgba(30,142,77,.14); border: 1px solid rgba(30,142,77,.4); display: flex; flex-direction: column; gap: 4px; }
.exp.bad { background: rgba(192,57,43,.12); border-color: rgba(192,57,43,.4); }
.quiz-nav { display: flex; gap: 10px; margin-top: 14px; }
.quiz-nav .btn { flex: 1; }
.result { text-align: center; padding: 26px 18px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ring {
  --pct: 0%;
  position: relative; width: 130px; height: 130px; border-radius: 50%;
  background: conic-gradient(var(--teal) var(--pct), var(--card-2) 0); display: grid; place-items: center;
}
.ring::before { content: ""; position: absolute; width: 102px; height: 102px; border-radius: 50%; background: var(--card); }
.ring b { position: relative; z-index: 1; font-size: 1.7rem; color: var(--teal-dark); }
[data-theme="dark"] .ring b { color: var(--teal); }
.result-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 10px; }
</style>