<script setup>
import { ref, computed } from 'vue'
import { useProgress } from '../stores/progress'
import { useApi } from '../stores/api'
import { getLessons, getTeachers, countQuestions } from '../data/loader'
import { useToast } from '../composables/toast'

const progress = useProgress()
const api = useApi()
const { toast } = useToast()

const LESSONS = getLessons()
const TEACHERS = getTeachers()
const totalQ = countQuestions()
const autoQ = countQuestions(q => q.type !== 'essay')
const pdfLessons = computed(() => LESSONS.filter(L => L.pdfUrl || L.pdfData))
const uname = computed(() => {
  const n = progress.user?.name || ''
  return (!n || n === 'ئاساسىي باشقۇرغۇچى' || n.includes('باشقۇرغۇچى')) ? '' : n
})

const TIPS = [
  'ھەر كۈنى ئاران 15 مىنۇت ئۆگىنىڭ — داۋاملىق بولۇش ئەڭ مۇھىم!',
  'دەرسنى ئوقۇغاندىن كېيىن زېھىن خەرىتىسى بىلەن تەكرارلاڭ، ئەستە قالدۇرۇش 2 ھەسسە ئاشىدۇ.',
  'مەشىقتە %60تىن يۇقىرى ئالغاندا كېيىنكى دەرسكە ئۆتۈڭ.',
  'خاتا ئىشلىگەن سوئالىڭىزنىڭ چۈشەندۈرۈشىنى چوقۇم ئوقۇڭ.',
  'سىناقتىن ئىلگىرى ھەر دەرسنىڭ «مۇھىم نۇقتىلار»نى كۆزدىن كەچۈرۈڭ.',
  'مىزاج-خىلىت مۇناسىۋىتىنى جەدۋەل قىلىپ يادلاڭ: سەپرا-قۇرۇق ئىسسىق، قان-ھۆل ئىسسىق...',
  'ئۇيقۇدىن بۇرۇن 10 مىنۇت تەكرارلاش ئەتىسى ئەسلەشنى ئاسانلاشتۇرىدۇ.'
]
const todayTip = () => {
  const d = new Date()
  return TIPS[(d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()) % TIPS.length]
}

// Daily question + term, deterministic by date
const daily = computed(() => {
  const d = new Date()
  const seed = d.getFullYear() * 372 + d.getMonth() * 31 + d.getDate()
  const all = LESSONS.flatMap(L => (L.quiz || []).map(q => ({ q, l: L })))
  const quiz = all.filter(x => x.q.type !== 'essay')
  const terms = LESSONS.flatMap(L => (L.sections || []).flatMap(s => s.points || []))
  return {
    q: quiz.length ? quiz[seed % quiz.length] : null,
    term: terms.length ? terms[(seed * 7 + 3) % terms.length] : null
  }
})

// Feedback board
const fbName = ref(progress.user?.name || '')
const fbText = ref('')
const fbList = ref([])
const fbBusy = ref(false)
async function loadFb() {
  const d = await api.getFeedback()
  if (d && Array.isArray(d)) fbList.value = d.slice(-20).reverse()
}
async function sendFb() {
  if (!fbText.value.trim()) return toast('پىكرىڭىزنى يېزىڭ', 'err')
  fbBusy.value = true
  const body = { name: fbName.value, phone: progress.user?.phone || fbName.value || '—', text: fbText.value }
  const r = await api.addFeedback(body.name, body.phone, body.text)
  fbBusy.value = false
  if (r && r.status === 'ok') {
    toast('رەھمەت، پىكرىڭىز ئەۋەتىلدى ✓')
    fbText.value = ''
    loadFb()
  } else {
    toast('ئەۋەتىش مۇۋەپپەقىيەتسىز — قايتا سىناڭ', 'err')
  }
}
loadFb()
</script>

<template>
  <section>
    <div class="greet">
      <div class="hlogo"><img src="/icon.svg" alt=""></div>
      <h2>{{ uname ? 'ئەسسالامۇ ئەلەيكۇم، ' + uname + '!' : 'ئەسسالامۇ ئەلەيكۇم!' }}</h2>
      <p>ئۇيغۇر تېبابىتى نەزەرىيە قىسمى — {{ LESSONS.length }} دەرس • {{ totalQ }} مەشىق سوئالى</p>
      <div class="gprog"><i :style="{ width: progress.pctRead + '%' }"></i></div>
      <div class="grow"><span>ئومۇمىي ئىلگىرىلەش</span><span>%{{ progress.pctRead }} ({{ progress.lessonsRead }}/{{ LESSONS.length }} دەرس)</span></div>
    </div>

    <div class="mstats">
      <div class="mstat"><b>{{ LESSONS.length }}</b><span>دەرس</span></div>
      <div class="mstat"><b>{{ autoQ }}</b><span>ئاپتومات سوئال</span></div>
      <div class="mstat"><b>{{ totalQ - autoQ }}</b><span>بايان سوئال</span></div>
      <div class="mstat"><b>{{ progress.exams.length }}</b><span>سىناق</span></div>
      <div class="mstat"><b>🔥{{ progress.streak.n || 0 }}</b><span>كۈن داۋام</span></div>
    </div>

    <div class="menu-grid">
      <RouterLink class="menu-tile" to="/lessons"><span class="mi">📚</span><b>دەرسلەر</b><small>{{ LESSONS.length }} دەرس</small></RouterLink>
      <RouterLink class="menu-tile pdf" to="/books"><span class="mi">📄</span><b>PDF كىتابلار</b><small>{{ pdfLessons.length }} كىتاب (تولۇق)</small></RouterLink>
      <RouterLink class="menu-tile" to="/exam"><span class="mi">📝</span><b>سىناق</b><small>ۋاقىتلىق سىناق</small></RouterLink>
      <RouterLink class="menu-tile" to="/teachers"><span class="mi">👨‍🏫</span><b>ئۇستازلار</b><small>{{ TEACHERS.length }} تەرجىمىھال</small></RouterLink>
    </div>

    <div v-if="daily.q" class="dq card">
      <div class="secttl">🎯 بۈگۈنكى سوئال</div>
      <div class="dqa">🤔 {{ daily.q.q }}</div>
      <RouterLink class="btn btn-teal btn-sm" :to="'/lesson/' + daily.q.l.id + '/quiz'">بۇ دەرسنىڭ مەشىقىگە ئۆتۈش</RouterLink>
    </div>

    <div v-if="daily.term" class="card dt">
      <div class="secttl">📘 بۈگۈنكى ئاتالغۇ</div>
      <div class="dtxt">✦ {{ daily.term }}</div>
    </div>

    <div class="tip">💡 <b>بۈگۈنكى تەۋسىيە:</b> {{ todayTip() }}</div>

    <div class="secttl">💬 سۇئال-پىكىر تاختىسى</div>
    <div class="fb">
      <div class="fb-form">
        <input v-model="fbName" class="input" placeholder="ئىسمىڭىز">
        <textarea v-model="fbText" class="input" rows="2" placeholder="سۇئال ياكى پىكرىڭىزنى بۇ يەرگە يېزىڭ…"></textarea>
        <button class="btn btn-teal btn-sm" :disabled="fbBusy" @click="sendFb">ئەۋەتىش ➤</button>
      </div>
      <div class="fb-list">
        <div v-for="f in fbList" :key="f.id" class="fb-item">
          <div class="fb-head"><b>{{ f.name || 'ئەزا' }}</b><span>{{ new Date(f.created_at || Date.now()).toLocaleDateString() }}</span></div>
          <div class="fb-txt">{{ f.text }}</div>
          <div v-if="f.reply" class="fb-reply">↩️ ئۇستاز: {{ f.reply }}</div>
        </div>
        <p v-if="!fbList.length" class="muted" style="text-align:center;padding:1rem .5rem;font-size:.85rem">ھەنۇز پىكىر بولمىدى — بىرىنچى بولۇپ يېزىڭ!</p>
      </div>
    </div>
  </section>
</template>

<style scoped>
.greet {
  position: relative;
  overflow: hidden;
  padding: 20px 18px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--teal) 0%, var(--teal-deep) 130%);
  color: #fff;
  box-shadow: var(--shadow-lg);
}
.greet::after {
  content: ""; position: absolute; right: -40px; top: -40px; width: 180px; height: 180px;
  border-radius: 50%; background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.16), transparent 65%);
}
.hlogo { width: 66px; height: 66px; border-radius: 18px; overflow: hidden; background: var(--card); display: grid; place-items: center; box-shadow: inset 0 0 0 2px rgba(201,162,39,.55); margin-bottom: 12px; }
.hlogo img { width: 62px; height: 62px; }
.greet h2 { font-size: 1.18rem; margin-bottom: 4px; }
.greet p { font-size: .85rem; opacity: .9; margin-bottom: 14px; }
.gprog { height: 9px; border-radius: 8px; background: rgba(255,255,255,.22); overflow: hidden; }
.gprog i { display: block; height: 100%; border-radius: 8px; background: linear-gradient(90deg, var(--gold), #ffe08a); transition: width .6s cubic-bezier(.22,1,.36,1); }
.grow { display: flex; justify-content: space-between; font-size: .78rem; margin-top: 8px; opacity: .95; }

.mstats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 14px 0 4px; }
.mstat {
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-sm);
  padding: 12px 4px; text-align: center; box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 2px;}
.mstat b { font-size: 1.15rem; color: var(--teal-dark); }
[data-theme="dark"] .mstat b { color: var(--teal); }
.mstat span { font-size: .66rem; color: var(--muted); }

.menu-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 14px; }
.menu-tile {
  display: flex; flex-direction: column; gap: 4px; align-items: flex-start;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-sm);
  padding: 14px 12px; box-shadow: var(--shadow);
  transition: transform .15s ease, box-shadow .2s ease;
}
.menu-tile:active { transform: scale(.96); }
.menu-tile .mi { font-size: 1.5rem; }
.menu-tile b { font-size: .82rem; line-height: 1.25; }
.menu-tile small { font-size: .66rem; color: var(--muted); }
.menu-tile.pdf { border: 1.5px solid rgba(201,162,39,.5); background: linear-gradient(180deg, var(--gold-soft), transparent); }
.menu-tile.pdf b { color: #b45309; }
[data-theme="dark"] .menu-tile.pdf b { color: var(--gold); }

.dq { display: flex; flex-direction: column; gap: 10px; margin-top: 22px; }
.dqa { font-size: .95rem; font-weight: 600; background: var(--card-2); border-radius: 12px; padding: 12px 14px; border: 1px solid var(--line); }
.dt { margin-top: 14px; }
.dtxt { background: var(--gold-light); border-radius: 12px; padding: 10px 14px; color: #7a610f; font-weight: 600; font-size: .92rem; }
[data-theme="dark"] .dtxt { color: var(--gold); }

.tip {
  margin-top: 16px; background: var(--teal-light); border: 1px dashed rgba(14,124,111,.4);
  border-radius: var(--radius-sm); padding: 12px 14px; font-size: .86rem; color: var(--teal-dark);
}
[data-theme="dark"] .tip { color: var(--teal); }

.fb { display: flex; flex-direction: column; gap: 12px; }
.fb-form { display: flex; flex-direction: column; gap: 8px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); padding: 14px; box-shadow: var(--shadow); }
.fb-form .btn { align-self: flex-end; }
.fb-list { display: flex; flex-direction: column; gap: 8px; }
.fb-item { background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-sm); padding: 12px 14px; box-shadow: var(--shadow); }
.fb-head { display: flex; justify-content: space-between; font-size: .78rem; color: var(--muted); margin-bottom: 4px; }
.fb-head b { color: var(--ink); }
.fb-txt { font-size: .9rem; }
.fb-reply { margin-top: 8px; font-size: .85rem; background: var(--teal-light); border-radius: 10px; padding: 8px 12px; color: var(--teal-dark); }
[data-theme="dark"] .fb-reply { color: var(--teal); }
</style>