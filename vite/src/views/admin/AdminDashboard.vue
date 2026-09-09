<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useApi } from '../../stores/api'
import { useToast } from '../../composables/toast'
import { getLessons, countQuestions } from '../../data/loader'

const router = useRouter()
const api = useApi()
const { toast } = useToast()

const TOKEN_KEY = 'uytibb_admin_token'
const LS_STUDENTS = 'uytibb_all_students'
const LS_FEEDBACK = 'uytibb_feedback'
const LS_HIDDEN_FB = 'uytibb_feedback_hidden'

const tab = ref('dash')
const students = ref([])
const feedback = ref([])
const busy = ref(false)
const adminName = ref('باشقۇرغۇچى')

// reply modal
const showReply = ref(false)
const replyItem = ref(null)
const replyText = ref('')

function readJSON(key, fb) {
  try { return JSON.parse(localStorage.getItem(key) || '[]') || fb } catch (e) { return fb || [] }
}
function writeJSON(key, val) { localStorage.setItem(key, JSON.stringify(val)) }

function isTest(st) {
  const nm = (st.name || '').trim()
  return nm === 'سىناق ئوقۇغۇچى' || nm === 'سىناق' || nm.startsWith('سىناق') || st.phone === '13800000000' || st.phone === 'admin'
}

async function loadStudents() {
  const merged = readJSON(LS_STUDENTS)
  // Seed from the device's own registration (uytibb_v1.user), like the vanilla admin.
  try {
    const prog = JSON.parse(localStorage.getItem('uytibb_v1') || '{}')
    if (prog.user && prog.user.phone && !merged.some(u => u.phone === prog.user.phone)) {
      merged.unshift({ status: 'approved', ...prog.user })
    }
  } catch (e) {}
  // Authoritative server list (admin token) wins.
  const server = await api.getStudents()
  if (server && server.length) {
    server.forEach(s => {
      const ex = merged.find(x => x.phone === s.phone)
      const rec = { name: s.name, phone: s.phone, status: s.status, when: s.registered_at ? s.registered_at.slice(0, 10) : 'بۈگۈن' }
      if (!ex) merged.unshift(rec)
      else if (s.status && ex.status !== s.status) ex.status = s.status
    })
  }
  const filtered = merged.filter(s => !isTest(s))
  writeJSON(LS_STUDENTS, filtered)
  students.value = filtered
}

async function loadFeedback() {
  const local = readJSON(LS_FEEDBACK)
  try {
    const prog = JSON.parse(localStorage.getItem('uytibb_v1') || '{}')
    if (!local.length && Array.isArray(prog.fb) && prog.fb.length) local.push(...prog.fb)
  } catch (e) {}
  const hidden = new Set(readJSON(LS_HIDDEN_FB))
  const server = await api.getFeedback()
  if (server && server.length) {
    const serverMap = new Map(server.map(f => [f.id, f]))
    // Any local replies over an existing server item are folded into the server row.
    local.forEach(f => {
      if (f.id != null && serverMap.has(f.id) && f.reply && !serverMap.get(f.id).reply) {
        serverMap.get(f.id).reply = f.reply
        serverMap.get(f.id).replyAt = f.replyAt
      }
    })
    const merged = server.concat(local.filter(f => f.id == null))
    feedback.value = merged.filter(f => !hidden.has(f.id)).sort((a, b) => (b.id || 0) - (a.id || 0))
  } else {
    feedback.value = local.filter(f => !hidden.has(f.id))
  }
}

async function refreshAll() {
  busy.value = true
  await Promise.all([loadStudents(), loadFeedback()])
  busy.value = false
}

onMounted(() => {
  try { adminName.value = sessionStorage.getItem('uytibb_admin_user_name') || 'باشقۇرغۇچى' } catch (e) {}
  refreshAll()
})

const pending = computed(() => students.value.filter(s => s.status === 'pending'))
const approved = computed(() => students.value.filter(s => s.status !== 'pending'))
const unreplied = computed(() => feedback.value.filter(f => !f.reply).length)

const stats = computed(() => {
  const lessons = getLessons()
  let pdfs = 0
  lessons.forEach(L => { if (L.pdfUrl || L.pdfData) pdfs++ })
  return {
    lessons: lessons.length,
    pdfs,
    questions: countQuestions(),
    approved: approved.value.length,
    pending: pending.value.length,
    feedback: feedback.value.length,
    unreplied: unreplied.value.length
  }
})

async function setStatus(st, status, okMsg) {
  const d = await api.updateStudentStatus(st.phone, status)
  if (d && d.status === 'ok') {
    toast(okMsg)
    await loadStudents()
  } else {
    toast('⚠️ مۇلازىمەت ئەمەلگە ئاشۇرالمىدى. توكېن بېكىتىلمىگەن ياكى مۇددىتى ئۆتكەن بولۇشى مۇمكىن.', 'err')
  }
}

async function removeStudent(st) {
  if (!confirm(`«${st.name}» ئوقۇغۇچىنى ئۆچۈرەمسىز؟`)) return
  const d = await api.deleteStudent(st.phone)
  if (d && d.status === 'ok') {
    const rest = readJSON(LS_STUDENTS).filter(x => x.phone !== st.phone)
    writeJSON(LS_STUDENTS, rest)
    toast('🗑️ ئوقۇغۇچى ئۆچۈرۈلدى.')
    await loadStudents()
  } else {
    toast('⚠️ ئۆچۈرۈش مەغلۇپ بولدى. توكېن تەكشۈرۈڭ.', 'err')
  }
}

function openReply(f) {
  replyItem.value = f
  replyText.value = f.reply || ''
  showReply.value = true
}

async function saveReply() {
  const text = replyText.value.trim()
  if (!text) { toast('جاۋاب تېكىستىنى كىرگۈزۈڭ!', 'err'); return }
  const f = replyItem.value
  if (f.id != null) {
    // Server-backed item: only mutate local state when the API actually accepted it.
    const d = await api.replyFeedback(f.id, text, adminName.value)
    if (!d || d.status !== 'ok') {
      toast('⚠️ جاۋاب يوللانمىدى. توكېن بېكىتىلمىگەن ياكى مۇددىتى ئۆتكەن بولۇشى مۇمكىن.', 'err')
      return
    }
  }
  const d = new Date()
  const dateStr = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate() + ' ' + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes()
  f.reply = text
  f.replyAt = dateStr
  f.by = adminName.value
  // Persist merged list locally so the vanilla admin stays in sync.
  const list = feedback.value.map(x => ({ id: x.id, n: x.n, phone: x.phone, t: x.t, reply: x.reply, replyAt: x.replyAt, w: x.w }))
  writeJSON(LS_FEEDBACK, list)
  showReply.value = false
  toast('✅ جاۋاب قايتۇرۇلدى ۋە ئوقۇغۇچى باش بېتىگە چىقىرىلدى!')
  await loadFeedback()
}

function dismissFeedback(f) {
  if (!confirm('بۇ سوئال ياكى پىكىرنى يوشۇرامسىز؟')) return
  const hidden = readJSON(LS_HIDDEN_FB)
  if (f.id != null && !hidden.includes(f.id)) hidden.push(f.id)
  writeJSON(LS_HIDDEN_FB, hidden)
  const rest = readJSON(LS_FEEDBACK).filter(x => x.id != null || x !== f)
  writeJSON(LS_FEEDBACK, rest)
  feedback.value = feedback.value.filter(x => x !== f)
  toast('🗑️ سوئال يوشۇرۇلدى.')
}

function exportCsv() {
  const rows = [['isim', 'telefon', 'halet', 'waqit']]
  students.value.forEach(s => rows.push([s.name || '', s.phone || '', s.status || '', s.when || '']))
  const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
  const blob = new Blob([ '\uFEFF' + csv ], { type: 'text/csv;charset=utf-8;' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'uyghur-tibb-students.csv'
  a.click()
  URL.revokeObjectURL(a.href)
  toast('📋 تىزىملىك CSV قىلىپ چۈشۈرۈلدى.')
}

function logout() {
  sessionStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem('uytibb_admin_user_name')
  sessionStorage.removeItem('uytibb_admin_user_role')
  router.replace('/admin/login')
}

const tabs = [
  { id: 'dash', ic: '📊', label: 'باش بەت' },
  { id: 'students', ic: '🎓', label: 'ئوقۇغۇچىلار' },
  { id: 'feedback', ic: '💬', label: 'پىكىر-سوئال' },
  { id: 'content', ic: '📝', label: 'مەزمۇن' }
]
</script>

<template>
  <div class="admin">
    <header class="ahead">
      <div class="ahead-in">
        <RouterLink to="/" class="abrand">
          <img src="/icon.svg" alt="">
          <div><b>ئۇيغۇر تېبابىتى · باشقۇرۇش</b><small>{{ adminName }}</small></div>
        </RouterLink>
        <div class="ahead-actions">
          <RouterLink to="/" class="btn btn-ghost btn-sm">← ئەپ</RouterLink>
          <button class="btn btn-danger btn-sm" @click="logout">🚪 چىقىش</button>
        </div>
      </div>
    </header>

    <nav class="atabs">
      <button v-for="t in tabs" :key="t.id" class="atab" :class="{ on: tab === t.id }" @click="tab = t.id">
        <span>{{ t.ic }}</span>{{ t.label }}
        <i v-if="t.id === 'students' && stats.pending" class="abadge">{{ stats.pending }}</i>
        <i v-else-if="t.id === 'feedback' && stats.unreplied" class="abadge">{{ stats.unreplied }}</i>
      </button>
    </nav>

    <main class="abody">
      <!-- DASHBOARD -->
      <section v-if="tab === 'dash'">
        <div class="stat-grid">
          <div class="stat"><b>{{ stats.lessons }}</b><span>دەرس</span></div>
          <div class="stat"><b>{{ stats.pdfs }}</b><span>PDF كىتاب</span></div>
          <div class="stat"><b>{{ stats.questions }}</b><span>سوئال</span></div>
          <div class="stat"><b>{{ stats.approved }}</b><span>تەستىقلانغان</span></div>
          <div class="stat warn" :class="{ hot: stats.pending }"><b>{{ stats.pending }}</b><span>تەستىق كۈتۈۋاتىدۇ</span></div>
          <div class="stat warn" :class="{ hot: stats.unreplied }"><b>{{ stats.unreplied }}</b><span>جاۋابسىز</span></div>
        </div>
        <div class="card quick-actions">
          <h3>تېز ئەمەلىيەتلەر</h3>
          <div class="qa-row">
            <button class="btn btn-teal" @click="tab = 'students'">🎓 ئوقۇغۇچىلارنى باشقۇرۇش</button>
            <button class="btn btn-gold" @click="tab = 'feedback'">💬 پىكىر-سوئالغا جاۋاب</button>
            <button class="btn btn-ghost" @click="tab = 'content'">📝 مەزمۇن تەھرىر (ئەسلى)</button>
          </div>
        </div>
        <small class="ahint">مۇلازىمەت دۇكىنى: /api/students · توكېن 8 سائەت ئىشلەيدۇ.</small>
      </section>

      <!-- STUDENTS -->
      <section v-else-if="tab === 'students'">
        <div class="card">
          <div class="card-head">
            <h3>⏳ تەستىق كۈتۈۋاتقانلار ({{ pending.length }})</h3>
            <button class="btn btn-line btn-sm" @click="refreshAll">{{ busy ? '⏳' : '🔄' }} يېڭىلاش</button>
          </div>
          <div v-if="!pending.length" class="empty">ھازىرچە تەستىق كۈتۈۋاتقان يېڭى ئوقۇغۇچى يوق.</div>
          <div v-for="st in pending" :key="'p' + st.phone" class="row">
            <div class="row-main"><b>{{ st.name }}</b><small dir="ltr">{{ st.phone }}</small></div>
            <div class="row-when">{{ st.when || 'بۈگۈن' }}</div>
            <div class="row-actions">
              <button class="btn btn-teal btn-sm" @click="setStatus(st, 'approved', '✅ تەستىقلاندى (ئىجازەت بېرىلدى)')">تەستىقلاش</button>
              <button class="btn btn-danger btn-sm" @click="removeStudent(st)">رەت قىلىش</button>
            </div>
          </div>
        </div>

        <div class="card">
          <div class="card-head">
            <h3>✅ تەستىقلانغانلار ({{ approved.length }})</h3>
            <button class="btn btn-ghost btn-sm" @click="exportCsv">📋 CSV چۈشۈرۈش</button>
          </div>
          <div v-if="!approved.length" class="empty">تېخى تەستىقلانغان ئوقۇغۇچى يوق.</div>
          <div v-for="st in approved" :key="'a' + st.phone" class="row">
            <div class="row-main">
              <b>{{ st.name }}</b>
              <small dir="ltr">{{ st.phone }}</small>
              <span class="tbadge" :class="st.status === 'blocked' ? 'b-red' : 'b-green'">
                {{ st.status === 'blocked' ? '⛔ چەكلەنگەن' : '✅ ئىجازەت بېرىلدى' }}
              </span>
            </div>
            <div class="row-when">{{ st.when || 'بۈگۈن' }}</div>
            <div class="row-actions">
              <button v-if="st.status === 'blocked'" class="btn btn-teal btn-sm" @click="setStatus(st, 'approved', '🔓 قايتا ئېچىلدى')">قايتا ئېچىش</button>
              <button v-else class="btn btn-ghost btn-sm" @click="setStatus(st, 'blocked', '⛔ توختىتىلدى')">توختىتىش</button>
              <button class="btn btn-danger btn-sm" @click="removeStudent(st)">🗑️ ئۆچۈرۈش</button>
            </div>
          </div>
        </div>
      </section>

      <!-- FEEDBACK -->
      <section v-else-if="tab === 'feedback'">
        <div class="card">
          <div class="card-head">
            <h3>💬 سوئال-پىكىرلەر ({{ feedback.length }})</h3>
            <button class="btn btn-line btn-sm" @click="refreshAll">{{ busy ? '⏳' : '🔄' }} يېڭىلاش</button>
          </div>
          <div v-if="!feedback.length" class="empty">تېخى سوئال ياكى پىكىر چۈشمىدى.</div>
          <div v-for="(f, i) in feedback" :key="i" class="fb">
            <div class="fb-head">
              <b>{{ f.n || 'مېھمان' }}</b>
              <small v-if="f.phone" dir="ltr">{{ f.phone }}</small>
              <small class="fb-when">{{ f.w || '' }}</small>
            </div>
            <div class="fb-q">{{ f.t || '' }}</div>
            <div v-if="f.reply" class="fb-reply">
              <b>🌿 باشقۇرغۇچى جاۋابى:</b> {{ f.reply }}
              <small v-if="f.replyAt">{{ f.replyAt }}</small>
            </div>
            <div v-else class="fb-unreplied">⚠️ جاۋاب قايتۇرۇلمىغان</div>
            <div class="fb-actions">
              <button class="btn btn-gold btn-sm" @click="openReply(f)">✍️ {{ f.reply ? 'جاۋاب تەھرىرلەش' : 'جاۋاب بېرىش' }}</button>
              <button class="btn btn-ghost btn-sm" @click="dismissFeedback(f)">🗑️ يوشۇرۇش</button>
            </div>
          </div>
        </div>
      </section>

      <!-- CONTENT (legacy) -->
      <section v-else-if="tab === 'content'">
        <div class="card">
          <h3>📝 مەزمۇن تەھرىرلىگۈچ</h3>
          <p class="acopy">
            دەرس سەھىپىسى (ئىدىيە، بۆلەك، سوئال، PDF يۈكلەش)، ئۇستازلار، زاپاسلاش/ئەسلىگە
            قايتۇرۇش ۋە كۆپ باشقۇرغۇچى باشقۇرۇش ھازىرچە ئەسلى ئەپنىڭ <code>admin.html</code>
            قىسمىدا تەھرىرلىنىدۇ. تەھرىرلەنگەن مەزمۇن <code>localStorage</code> ئارقىلىق
            ئوقۇغۇچى ئەپىگە بىرلا ۋاقىتتا ئەكس ئېتىدۇ (فرونت ئەپ ۋە Vue ئەپ ئىككىلىسىگە).
          </p>
          <div class="qa-row">
            <a class="btn btn-gold" href="/admin.html" target="_blank" rel="noopener">ئەسلى باشقۇرۇش سەھىپىسىنى ئېچىش →</a>
            <button class="btn btn-ghost" @click="router.push('/')">→ ئوقۇغۇچى ئەپى</button>
          </div>
        </div>
      </section>
    </main>

    <!-- REPLY MODAL -->
    <div v-if="showReply" class="amodal" @click.self="showReply = false">
      <div class="amodal-card">
        <h3>✍️ جاۋاب بېرىش</h3>
        <div class="reply-q">
          <b>{{ (replyItem.n || 'ئوقۇغۇچى') }} سورايدۇ:</b>
          <p>{{ replyItem.t || '' }}</p>
        </div>
        <textarea v-model="replyText" rows="4" class="areply-inp" placeholder="جاۋابىڭىزنى يېزىڭ..."></textarea>
        <div class="amodal-actions">
          <button class="btn btn-ghost" @click="showReply = false">بىكار قىلىش</button>
          <button class="btn btn-gold" @click="saveReply">جاۋاب يوللاش</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.admin { min-height: 100vh; display: flex; flex-direction: column; background: var(--bg); }
.ahead { position: sticky; top: 0; z-index: 20; background: var(--card); border-bottom: 1px solid var(--line); }
.ahead-in { max-width: 860px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; padding: .7rem 1rem; }
.abrand { display: flex; align-items: center; gap: .6rem; text-decoration: none; color: var(--ink); }
.abrand img { width: 38px; height: 38px; }
.abrand b { display: block; font-size: .98rem; }
.abrand small { color: var(--muted); font-size: .78rem; }
.ahead-actions { display: flex; gap: .5rem; }

.atabs { position: sticky; top: 57px; z-index: 19; display: flex; gap: .4rem; overflow-x: auto; max-width: 860px; margin: 0 auto; width: 100%; padding: .6rem 1rem; background: var(--bg); }
.atab { position: relative; flex: 1 1 auto; white-space: nowrap; border: 1px solid var(--line); background: var(--card); color: var(--muted); border-radius: 12px; padding: .55rem .8rem; font: inherit; font-size: .85rem; cursor: pointer; }
.atab.on { background: linear-gradient(135deg, var(--teal), var(--teal-dark)); color: #fff; border-color: transparent; }
.abadge { position: absolute; top: -5px; inset-inline-end: -5px; background: var(--gold); color: #2e2200; border-radius: 50%; min-width: 20px; height: 20px; line-height: 20px; font-style: normal; font-size: .72rem; }

.abody { width: 100%; max-width: 860px; margin: 0 auto; padding: 1rem 1rem 2.5rem; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: .6rem; margin-bottom: 1rem; }
.stat { background: var(--card); border: 1px solid var(--line); border-radius: 16px; padding: .9rem; text-align: center; }
.stat b { display: block; font-size: 1.7rem; color: var(--teal); }
.stat.warn b { color: var(--gold-dark, var(--gold)); }
.stat.hot { border-color: var(--gold); box-shadow: 0 0 0 3px rgba(201, 162, 39, .18); }
.stat span { color: var(--muted); font-size: .8rem; }
.ahint { display: block; text-align: center; color: var(--muted); margin-top: 1rem; font-size: .78rem; }

.card { background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 1rem; margin-bottom: 1rem; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .8rem; }
.card h3 { margin: 0; font-size: 1rem; }
.quick-actions h3 { margin-bottom: .7rem; }
.qa-row { display: flex; flex-wrap: wrap; gap: .55rem; }
.qa-row a { text-decoration: none; }

.empty { text-align: center; color: var(--muted); padding: 1rem; font-size: .9rem; }
.row { display: flex; align-items: center; gap: .6rem; padding: .65rem 0; border-top: 1px dashed var(--line); flex-wrap: wrap; }
.row-main { flex: 1 1 180px; min-width: 0; }
.row-main b { display: inline-block; font-size: .93rem; }
.row-main small { display: block; color: var(--muted); font-size: .8rem; direction: ltr; text-align: right; }
.row-when { color: var(--muted); font-size: .82rem; white-space: nowrap; }
.row-actions { display: flex; gap: .45rem; flex-wrap: wrap; }
.tbadge { display: inline-block; margin-inline-start: .4rem; border-radius: 20px; padding: .15rem .55rem; font-size: .72rem; }
.tbadge.b-green { background: rgba(38, 157, 66, .15); color: #269d42; }
.tbadge.b-red { background: rgba(229, 115, 115, .18); color: #e14d4d; }

.fb { border-top: 1px dashed var(--line); padding: .7rem 0; }
.fb-head { display: flex; flex-wrap: wrap; gap: .4rem; align-items: baseline; margin-bottom: .25rem; }
.fb-head small { color: var(--muted); font-size: .78rem; }
.fb-when { margin-inline-start: auto; }
.fb-q { background: var(--card-2); border-radius: 12px; padding: .6rem .75rem; line-height: 1.8; font-weight: 600; margin-bottom: .5rem; }
.fb-reply { background: var(--gold-light, rgba(201, 162, 39, .12)); border: 1px solid rgba(201, 162, 39, .45); border-radius: 10px; padding: .5rem .7rem; font-size: .88rem; color: #6b5600; margin-bottom: .5rem; }
.fb-reply small { display: block; color: var(--muted); }
.fb-unreplied { color: var(--red); font-size: .82rem; margin-bottom: .5rem; }
.fb-actions { display: flex; gap: .45rem; }

.acopy { color: var(--muted); line-height: 2; }
.acopy code { background: var(--card-2); padding: .1rem .35rem; border-radius: 6px; font-size: .86em; }

.amodal { position: fixed; inset: 0; z-index: 50; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(0, 0, 0, .45); }
.amodal-card { width: 100%; max-width: 460px; background: var(--card); border: 1px solid var(--line); border-radius: 18px; padding: 1.2rem; }
.reply-q { background: var(--card-2); border-radius: 12px; padding: .7rem .8rem; margin-bottom: .8rem; }
.reply-q p { margin: .35rem 0 0; line-height: 1.8; }
.areply-inp { width: 100%; box-sizing: border-box; resize: vertical; border: 1px solid var(--line); border-radius: 12px; background: var(--bg); color: var(--ink); padding: .7rem .8rem; font: inherit; line-height: 1.8; }
.areply-inp:focus { outline: none; border-color: var(--teal); }
.amodal-actions { display: flex; justify-content: flex-end; gap: .55rem; margin-top: .9rem; }
</style>