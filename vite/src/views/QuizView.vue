<script setup>
import { ref, computed } from 'vue'
import { useQuiz } from '../composables/useQuiz'
import { lessonById, QTYPES, QTICON } from '../data/loader'
import { sanitizeHtml } from '../utils/sanitize'

const props = defineProps({ id: { type: [String, Number], required: true } })
const lesson = computed(() => lessonById(props.id))
const questions = computed(() => {
  const L = lesson.value
  return L ? [...(L.quiz || [])] : []
})

const { idx, answers, checked, selfGood, step, score, tot, q, isLast, check, next, prev, finish, restart, isCorrect } = useQuiz(questions.value, Number(props.id))
const resultPct = ref(0)
const reviewOpen = ref(false)

const typeLabel = computed(() => (q() ? QTYPES[q().type] : ''))

function onFinish() {
  resultPct.value = finish()
}

// ---- question templating helpers ----
function matchLeftSet() {
  const qq = q.value
  return qq && qq.type === 'match' ? qq.pairs.map(p => p[0]) : []
}
function matchRightFor(left) {
  const qq = q.value
  const pair = qq.pairs.find(p => p[0] === left)
  return pair ? pair[1] : ''
}
const matchRights = computed(() => {
  const qq = q.value
  return qq && qq.type === 'match' ? [...new Set(qq.pairs.map(p => p[1]))] : []
})
</script>

<template>
  <section v-if="questions.length && step === 'run'">
    <!-- progress -->
    <div class="quiz-prog">
      <div class="qp-track"><i :style="{ width: ((idx + (checked[idx] ? 1 : 0)) / questions.length) * 100 + '%' }"></i></div>
      <div class="qp-meta">
        <span>{{ idx + 1 }} / {{ questions.length }}</span>
        <span>{{ typeLabel }} • {{ score }} توغرا</span>
      </div>
    </div>

    <!-- question card -->
    <div class="qcard" :class="'type-' + (q() ? q().type : '')">
      <div class="qlabel"><b>{{ QTICON[q().type] }}</b>{{ typeLabel }}</div>
      <h2 class="qtext">{{ q().q }}</h2>

      <!-- choice -->
      <div v-if="q().type === 'choice'" class="opts">
        <button
          v-for="(o, i) in q().opts"
          :key="i"
          class="opt"
          :class="{
            sel: answers[idx].sel === i,
            correct: checked[idx] && i === q().a,
            wrong: checked[idx] && answers[idx].sel === i && i !== q().a
          }"
          @click="!checked[idx] && (answers[idx].sel = i)"
        ><span class="opt-i">{{ i + 1 }}</span>{{ o }}</button>
      </div>

      <!-- tf -->
      <div v-else-if="q().type === 'tf'" class="tf-opt">
        <button class="opt" :class="{ sel: answers[idx].sel === true, correct: checked[idx] && q().a === true, wrong: checked[idx] && answers[idx].sel === true && q().a !== true }" @click="!checked[idx] && (answers[idx].sel = true)">✓ توغرا</button>
        <button class="opt" :class="{ sel: answers[idx].sel === false, correct: checked[idx] && q().a === false, wrong: checked[idx] && answers[idx].sel === false && q().a !== false }" @click="!checked[idx] && (answers[idx].sel = false)">✗ خاتا</button>
      </div>

      <!-- blank -->
      <div v-else-if="q().type === 'blank'" class="blanks">
        <div v-for="(acc, slot) in q().a" :key="slot" class="blank-row">
          <input
            class="input"
            :class="{ correct: checked[idx] && acc.some(a => (answers[idx].vals[slot] || '').trim().toLowerCase() === a.toLowerCase()), wrong: checked[idx] && !acc.some(a => (answers[idx].vals[slot] || '').trim().toLowerCase() === a.toLowerCase()) }"
            :placeholder="'بوش ئورۇن ' + (slot + 1)"
            v-model="answers[idx].vals[slot]"
            :disabled="checked[idx]"
          >
          <span v-if="checked[idx] && acc.some(a => (answers[idx].vals[slot] || '').trim().toLowerCase() === a.toLowerCase())" class="ok">✓</span>
          <span v-else-if="checked[idx]" class="no">✗</span>
        </div>
      </div>

      <!-- match -->
      <div v-else-if="q().type === 'match'" class="match">
        <div v-for="l in matchLeftSet()" :key="l" class="match-row">
          <div class="mtxt">{{ l }}</div>
          <select class="input" :disabled="checked[idx]" v-model="answers[idx].map[l]">
            <option value="" disabled>تاللاڭ…</option>
            <option v-for="r in matchRights" :key="r" :value="r">{{ r }}</option>
          </select>
          <span v-if="checked[idx] && answers[idx].map[l] === matchRightFor(l)" class="ok">✓</span>
          <span v-else-if="checked[idx]" class="no">✗</span>
        </div>
      </div>

      <!-- essay -->
      <div v-else-if="q().type === 'essay'" class="essay">
        <textarea class="input" rows="4" placeholder="جاۋابىڭىزنى يېزىڭ…" v-model="answers[idx].text" :disabled="checked[idx]"></textarea>
        <button v-if="!checked[idx]" class="btn btn-ghost btn-sm" @click="selfGood[idx] = !selfGood[idx]">{{ selfGood[idx] ? '🚩 جاۋابىم توغرا دەپ بەلگىلەنگەن' : '🏁 جاۋابىم توغرا، بەلگىلە' }}</button>
        <div v-else class="model" v-html="sanitizeHtml(q().model || q().exp || '')"></div>
      </div>

      <!-- explanation -->
      <div v-if="checked[idx]" class="exp" :class="{ bad: !(q().type === 'essay' ? selfGood[idx] : isCorrect(q(), answers[idx])) }">
        <b>{{ q().type === 'essay' ? (selfGood[idx] ? 'مۇۋەپپەقىيەتلىك!' : 'ئۈلگىلىك جاۋاب') : (isCorrect(q(), answers[idx]) ? 'توغرا!' : 'توغرا ئەمەس') }}</b>
        <span v-if="q().exp">{{ q().exp }}</span>
      </div>
    </div>

    <!-- nav -->
    <div class="quiz-nav">
      <button v-if="idx > 0" class="btn btn-ghost" @click="prev">‹ ئالدىنقى</button>
      <button v-if="!checked[idx]" class="btn btn-teal" @click="check">تەكشۈرۈش</button>
      <button v-if="checked[idx] && !isLast()" class="btn btn-teal" @click="next">كېيىنكى سوئال ›</button>
      <button v-if="checked[idx] && isLast()" class="btn btn-gold" @click="onFinish">نەتىجىنى كۆرۈش 🏁</button>
    </div>
  </section>

  <!-- results -->
  <section v-else-if="questions.length && step === 'done'">
    <div class="result card">
      <div class="ring" :style="{ '--pct': resultPct + '%' }"><b>{{ resultPct }}%</b></div>
      <h2>{{ resultPct >= 60 ? 'مۇبارەك! 🎉' : 'يېتەرلىك ئەمەس' }}</h2>
      <p class="muted">{{ score }} سوئال توغرا، {{ questions.filter((qq, i) => qq.type === 'essay' ? selfGood[i] : isCorrect(qq, answers[i])).length }}/{{ questions.length }} تەكشۈرۈلدى</p>
      <p v-if="resultPct < 60" class="hint">دەرسنى قايتا كۆرۈپ، يەنە بىر قېتىم سىناڭ.</p>

      <div class="result-actions">
        <button class="btn btn-teal" @click="restart(); resultPct = 0">🔄 قايتا ئىشلەش</button>
        <RouterLink class="btn btn-ghost" :to="'/lesson/' + id">← دەرسكە</RouterLink>
        <button class="btn btn-gold" @click="reviewOpen = !reviewOpen">📋 تەكرارلاش</button>
      </div>
    </div>

    <div v-if="reviewOpen" class="review">
      <div v-for="(qq, i) in questions" :key="i" class="rev card" :class="{ bad: !(qq.type === 'essay' ? selfGood[i] : isCorrect(qq, answers[i])) }">
        <div class="rev-head"><b>{{ QTICON[qq.type] }} {{ qq.q }}</b><span class="pill" :class="(qq.type === 'essay' ? selfGood[i] : isCorrect(qq, answers[i])) ? 'green' : 'red'">{{ (qq.type === 'essay' ? selfGood[i] : isCorrect(qq, answers[i])) ? 'توغرا' : 'خاتا' }}</span></div>
        <div class="muted" style="font-size:.82rem">{{ qq.exp || qq.model }}</div>
      </div>
    </div>
  </section>

  <section v-else class="empty">
    <p>بۇ دەرستە مەشىق سوئالى يوق.</p>
    <RouterLink class="btn btn-teal btn-sm" :to="'/lesson/' + id">دەرسكە قايتىش</RouterLink>
  </section>
</template>

<style scoped>
.quiz-prog { margin-bottom: 14px; }
.qp-track { height: 7px; background: var(--card-2); border: 1px solid var(--line); border-radius: 8px; overflow: hidden; }
.qp-track i { display: block; height: 100%; background: linear-gradient(90deg, var(--teal), var(--gold)); border-radius: 8px; transition: width .3s ease; }
.qp-meta { display: flex; justify-content: space-between; font-size: .75rem; color: var(--muted); margin-top: 6px; }

.qcard { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 18px; box-shadow: var(--shadow); }
.qlabel { display: inline-flex; align-items: center; gap: .45rem; background: var(--teal-light); color: var(--teal-dark); padding: .25rem .7rem; border-radius: 999px; font-size: .74rem; font-weight: 800; }
[data-theme="dark"] .qlabel { color: var(--teal); }
.qtext { font-size: 1.06rem; line-height: 1.5; margin: 12px 0 16px; }

.opts { display: flex; flex-direction: column; gap: 9px; }
.opt {
  display: flex; align-items: center; gap: 10px; text-align: start;
  background: var(--card-2); border: 1.5px solid var(--line); color: var(--ink);
  border-radius: 13px; padding: 11px 13px; font-size: .92rem; font-weight: 600;
  cursor: pointer; transition: border-color .15s ease, background .15s ease, transform .1s ease;
}
.opt:active { transform: scale(.99); }
.opt-i { flex: none; width: 26px; height: 26px; border-radius: 8px; background: var(--card); border: 1px solid var(--line); display: grid; place-items: center; font-size: .78rem; color: var(--muted); }
.opt.sel { border-color: var(--teal); background: var(--teal-light); }
.opt.sel .opt-i { background: var(--teal); color: #fff; border-color: var(--teal); }
.opt.correct { border-color: var(--green); background: rgba(30,142,77,.14); }
.opt.correct .opt-i { background: var(--green); color: #fff; border-color: var(--green); }
.opt.wrong { border-color: var(--red); background: rgba(192,57,43,.12); }
.opt.wrong .opt-i { background: var(--red); color: #fff; border-color: var(--red); }

.tf-opt { display: flex; flex-direction: column; gap: 9px; }
.blanks { display: flex; flex-direction: column; gap: 9px; }
.blank-row { display: flex; gap: 8px; align-items: center; }
.blank-row .input { flex: 1; }
.blank-row .input.correct { border-color: var(--green); box-shadow: 0 0 0 3px rgba(30,142,77,.15); }
.blank-row .input.wrong { border-color: var(--red); box-shadow: 0 0 0 3px rgba(192,57,43,.12); }
.ok { color: var(--green); font-weight: 900; }
.no { color: var(--red); font-weight: 900; }

.match { display: flex; flex-direction: column; gap: 9px; }
.match-row { display: flex; gap: 8px; align-items: center; }
.mtxt { flex: 1; font-weight: 700; font-size: .9rem; background: var(--card-2); padding: 10px 12px; border-radius: 11px; border: 1px solid var(--line); }
.match-row select { flex: 1.2; }
.match-row { flex-direction: column; align-items: stretch; }

.essay { display: flex; flex-direction: column; gap: 10px; }
.model { background: var(--gold-light); border-inline-start: 4px solid var(--gold); padding: 12px 14px; border-radius: 10px; font-size: .9rem; }
[data-theme="dark"] .model { color: var(--ink); }

.exp { margin-top: 16px; padding: 12px 14px; border-radius: 12px; font-size: .88rem; background: rgba(30,142,77,.14); border: 1px solid rgba(30,142,77,.4); display: flex; flex-direction: column; gap: 4px; }
.exp.bad { background: rgba(192,57,43,.12); border-color: rgba(192,57,43,.4); }

.quiz-nav { display: flex; gap: 10px; margin-top: 14px; }
.quiz-nav .btn { flex: 1; }

.result { text-align: center; padding: 26px 18px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.ring {
  --pct: 0%;
  width: 130px; height: 130px; border-radius: 50%;
  background: conic-gradient(var(--teal) var(--pct), var(--card-2) 0);
  display: grid; place-items: center; margin-bottom: 6px;
}
.ring::before { content: ""; position: absolute; width: 102px; height: 102px; border-radius: 50%; background: var(--card); }
.ring { position: relative; }
.ring b { position: relative; z-index: 1; font-size: 1.7rem; color: var(--teal-dark); }
[data-theme="dark"] .ring b { color: var(--teal); }
.hint { color: var(--red); font-size: .86rem; }
.result-actions { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; margin-top: 10px; }

.review { display: flex; flex-direction: column; gap: 10px; margin-top: 16px; }
.rev-head { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; font-size: .9rem; }
.rev { border-inline-start: 4px solid var(--green); }
.rev.bad { border-inline-start-color: var(--red); }
.empty { text-align: center; padding: 3rem 1rem; display: flex; flex-direction: column; gap: 12px; align-items: center; }
</style>