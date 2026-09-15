<script setup>
import { computed } from 'vue'
import { useProgress } from '../stores/progress'
import { useTheme } from '../composables/theme'
import { useView } from '../composables/view'
import { getLessons, countQuestions } from '../data/loader'
import { sanitizeHtml } from '../utils/sanitize'
import { reminderEnabled, toggleReminder } from '../composables/reminder'

const progress = useProgress()
const theme = useTheme()
const view = useView()
const LESSONS = getLessons()
const totalQ = countQuestions()
const autoQ = countQuestions(q => q.type !== 'essay')
const reminder = ref(reminderEnabled())

const wrongCount = computed(() => progress.wrong.length)
const bestAvg = computed(() => {
  const vals = LESSONS.map(L => progress.bestFor(L.id)).filter(v => v != null)
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
})
const recentAttempts = computed(() => progress.quizAttempts.slice(0, 8).map(a => ({ ...a, lesson: LESSONS.find(L => Number(L.id) === Number(a.lessonId)) })))

function exportProgress() {
  const raw = localStorage.getItem('uytibb_v1') || '{}'
  const blob = new Blob([raw], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'uyghur-tibb-progress.json'
  a.click()
  URL.revokeObjectURL(url)
}

function importProgress(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const imported = JSON.parse(String(reader.result || ''))
      if (!imported || typeof imported !== 'object' || !imported.lessons || !Array.isArray(imported.exams)) throw new Error('invalid')
      if (!confirm('بۇ زاپاس ھۆججەت بىلەن ئۈسكۈنىدىكى ئىلگىرىلەشنى ئالماشتۇرامسىز؟')) return
      localStorage.setItem('uytibb_v1', JSON.stringify(imported))
      progress._sync()
    } catch (e) {
      alert('زاپاس ھۆججەتنى ئوقۇغىلى بولمىدى.')
    }
  }
  reader.readAsText(file)
}

function resetProgress() {
  if (!confirm('بارلىق ئۈگىنىش ئىلگىرىلىشىڭىزنى بۇ ئۈسكۈنىدىن ئۆچۈرەمسىز؟')) return
  localStorage.removeItem('uytibb_v1')
  localStorage.removeItem('uytibb_recipe_progress')
  Object.assign(progress.data, { lessons: {}, exams: [], streak: { d: 0, n: 0, best: 0 }, badges: [], wrong: [], marks: [], quizAttempts: [] })
  progress._sync()
}

async function setReminder(value) {
  const enabled = await toggleReminder(value)
  reminder.value = enabled
}
</script>

<template>
  <section>
    <h2 class="pagettl">👤 مەن</h2>

    <div class="me hero">
      <div class="mh-logo"><img src="/icon.svg" alt=""></div>
      <div class="mh-info">
        <b>{{ progress.user?.name || 'ئەزا' }}</b>
        <small v-if="progress.user?.phone">تېلېفون: {{ progress.user.phone }}</small>
        <small v-else class="muted">تىزىملىتىپ ئەپتىن تولۇق پايدىلىنىڭ</small>
      </div>
      <button class="btn btn-gold btn-sm" @click="$router.push('/me')">تىزىملىتىش</button>
    </div>

    <div class="stat-grid">
      <RouterLink to="/lessons" class="stat">
        <b>{{ progress.lessonsRead }}/{{ LESSONS.length }}</b><span>دەرس ئوقۇدى</span>
        <i :style="{ width: progress.pctRead + '%' }"></i>
      </RouterLink>
      <RouterLink to="/exam" class="stat">
        <b>{{ progress.exams.length }}</b><span>سىناق ئىشلىدى</span>
      </RouterLink>
      <RouterLink to="/me" class="stat">
        <b>{{ autoQ }}</b><span>ئاپتومات سوئال</span>
      </RouterLink>
      <RouterLink to="/me" class="stat">
        <b>🔥{{ progress.streak.n || 0 }}</b><span>كۈن داۋام</span>
        <small v-if="progress.streak.best" class="sub">ئەڭ ياخشى: {{ progress.streak.best }}</small>
      </RouterLink>
    </div>

    <!-- wrong answers -->
    <div class="secttl">❌ خاتا سوئاللىرىم ({{ wrongCount }})</div>
    <div v-if="progress.wrong.length" class="wlist">
      <div v-for="(w, i) in progress.wrong" :key="i" class="w card">
        <div class="w-top"><b v-html="sanitizeHtml(w.q)"></b><span class="pill">{{ w.type }}</span></div>
        <div class="muted" style="font-size:.82rem" v-html="sanitizeHtml(w.model || w.exp || '')"></div>
        <button class="btn btn-ghost btn-sm" style="align-self:flex-start" @click="progress.removeWrong(w)">✓ بىلىپ قويدۇم</button>
      </div>
    </div>
    <p v-else class="muted" style="text-align:center;padding:1rem">خاتا سوئال يوق — جۇدە ئوبدان! 🌟</p>

    <div class="secttl">📊 ئومۇمىي ئەھۋال</div>
    <div class="stats-lines">
      <div class="line"><span>دەرس تاماملاش</span><b>%{{ progress.pctRead }}</b></div>
      <div class="line"><span>ئوتتۇرىچە يۇقىرى نەتىجە</span><b>%{{ bestAvg }}</b></div>
    </div>

    <div class="secttl">📝 يېقىنقى مەشىق نەتىجىلىرى</div>
    <div v-if="recentAttempts.length" class="attempts card">
      <div v-for="(attempt, i) in recentAttempts" :key="i" class="attempt">
        <RouterLink :to="'/lesson/' + attempt.lessonId + '/quiz'">{{ attempt.lesson?.title || ('دەرس ' + attempt.lessonId) }}</RouterLink>
        <span>%{{ attempt.pct }} · {{ new Date(attempt.at).toLocaleDateString() }}</span>
      </div>
    </div>
    <p v-else class="muted">تېخى مەشىق نەتىجىسى يوق.</p>

    <div class="secttl">🎨 تېما</div>
    <div class="themes card">
      <div class="tp-lbl">رەڭگى تېما</div>
      <div class="tp-row">
        <div
          v-for="p in theme.PALETTES"
          :key="p.id"
          class="topt"
          :class="{ on: theme.palette.value === p.id }"
          @click="theme.setPalette(p.id)"
        >
          <i class="t-dot" :style="{ background: p.dot }"></i>
          <span>{{ p.em }} {{ p.label }}</span>
        </div>
        <button class="btn btn-ghost btn-sm wbtn" @click="theme.toggle()">
          {{ theme.dark.value ? '☀️ كۈندۈز' : '🌙 كېچە' }}
        </button>
      </div>

      <div class="tp-lbl">ئېكران كۆرۈنۈشى</div>
      <div class="tp-row">
        <button class="topt" :class="{ on: view.view.value === 'mobile' }" @click="view.setView('mobile')">📱 تېلېفون (560px)</button>
        <button class="topt" :class="{ on: view.view.value === 'desktop' }" @click="view.setView('desktop')">💻 كەڭ ئېكران (1040px)</button>
      </div>
    </div>

    <div class="secttl">🔐 مەلۇماتلىرىڭىز</div>
    <div class="card data-tools">
      <p class="muted">ئىلگىرىلەش ئۈسكۈنىڭىزدە ساقلىنىدۇ. زاپاسلاڭ ياكى خالىسىڭىز ئۆچۈرۈڭ.</p>
      <div class="tp-row">
        <button class="btn btn-teal btn-sm" @click="exportProgress">⬇️ زاپاسلاش</button>
        <label class="btn btn-ghost btn-sm">⬆️ قايتا ئەكىرىش<input type="file" accept="application/json,.json" hidden @change="importProgress"></label>
        <button class="btn btn-danger btn-sm" @click="resetProgress">🗑️ ئىلگىرىلەشنى ئۆچۈرۈش</button>
      </div>
    </div>

    <div class="secttl">🔔 ئۆگىنىش ئەسكەرتمىسى</div>
    <div class="card data-tools">
      <p class="muted">ئەپنى ئاچقاندا كۈندە بىر قېتىم ئۆگىنىش ئەسكەرتمىسى كۆرۈنسۇن.</p>
      <button class="btn btn-ghost btn-sm" @click="setReminder(!reminder)">{{ reminder ? '🔕 ئەسكەرتمىنى توختىتىش' : '🔔 ئەسكەرتمىنى قوزغىتىش' }}</button>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, var(--teal), var(--teal-deep)); color: #fff;
  border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-lg);
}
.mh-logo { width: 54px; height: 54px; border-radius: 15px; background: var(--card); display: grid; place-items: center; overflow: hidden; }
.mh-logo img { width: 50px; height: 50px; }
.mh-info { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.35; }
.mh-info b { font-size: 1.05rem; }
.mh-info small { font-size: .78rem; opacity: .9; }
.stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
.stat {
  position: relative; display: flex; flex-direction: column; gap: 3px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-sm);
  padding: 14px; box-shadow: var(--shadow); overflow: hidden;
}
.stat b { font-size: 1.35rem; color: var(--teal-dark); }
[data-theme="dark"] .stat b { color: var(--teal); }
.stat span { font-size: .76rem; color: var(--muted); }
.stat > i { position: absolute; right: 0; bottom: 0; height: 4px; background: linear-gradient(90deg, var(--gold), var(--teal)); border-radius: 4px 0 0 0; transition: width .5s ease; }
.sub { font-size: .72rem; color: var(--muted); }
.wlist { display: flex; flex-direction: column; gap: 10px; }
.w { display: flex; flex-direction: column; gap: 8px; }
.w-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.w-top b { font-size: .9rem; line-height: 1.4; }
.stats-lines { display: flex; flex-direction: column; gap: 8px; }
.attempts { display:flex; flex-direction:column; gap:.2rem; }
.attempt { display:flex; justify-content:space-between; gap:.75rem; padding:.55rem 0; border-bottom:1px solid var(--line); font-size:.84rem; }
.attempt:last-child { border-bottom:0; }
.attempt a { color:var(--ink); text-decoration:none; font-weight:700; }
.attempt span { color:var(--muted); white-space:nowrap; }
.line { display: flex; justify-content: space-between; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: .88rem; box-shadow: var(--shadow); }
.line b { color: var(--teal-dark); }
[data-theme="dark"] .line b { color: var(--teal); }
.themes { display: block; }
.tp-lbl { font-size: .72rem; color: var(--muted); font-weight: 800; margin: 6px 0 8px; }
.tp-lbl:first-child { margin-top: 0; }
.tp-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.topt {
  display: inline-flex; align-items: center; gap: 6px;
  padding: .42rem .7rem; border-radius: 999px;
  border: 1px solid var(--line); background: var(--card-2);
  color: var(--muted); font-size: .78rem; font-weight: 700; cursor: pointer;
  transition: .15s ease;
}
.topt.on { background: var(--teal-light); border-color: var(--teal); color: var(--teal-dark); }
[data-theme="dark"] .topt.on { color: var(--teal); }
.t-dot { width: 14px; height: 14px; border-radius: 50%; display: inline-block; box-shadow: inset 0 0 0 2px rgba(255,255,255,.35); }
.wbtn { margin-inline-start: auto; }
.data-tools { margin-bottom: 1rem; }
.data-tools p { font-size: .82rem; margin-bottom: .7rem; }
</style>
