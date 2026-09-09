<script setup>
import { ref, reactive } from 'vue'
import { useContent } from '../../stores/content'
import { useToast } from '../../composables/toast'

const store = useContent()
store.init()
const { toast } = useToast()

const dispName = ref(localStorage.getItem('uytibb_admin_name') || 'باشقۇرغۇچى')
const admins = ref([])
const newAdmin = reactive({ name: '', username: '', role: 'teacher' })

const LS_ADMINS = 'uytibb_admins'
const LS_V1 = 'uytibb_v1'

function getAdmins() {
  const raw = localStorage.getItem(LS_ADMINS)
  let list = []
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length) list = parsed
    } catch (e) {}
  }
  const singleName = localStorage.getItem('uytibb_admin_name') || 'باشقۇرغۇچى'
  let root = list.find(a => a && (a.username === 'admin' || a.role === 'super'))
  if (!root) {
    root = { username: 'admin', name: singleName, role: 'super' }
    list.unshift(root)
  } else if (localStorage.getItem('uytibb_admin_name')) {
    root.name = localStorage.getItem('uytibb_admin_name')
  }
  return list
}

function saveAdmins(list) { localStorage.setItem(LS_ADMINS, JSON.stringify(list)) }

function refreshAdmins() { admins.value = getAdmins() }
refreshAdmins()

function saveName() {
  const nameVal = dispName.value.trim()
  if (!nameVal) { toast('باشقۇرغۇچى نامىنى كىرگۈزۈڭ!', 'err'); return }
  localStorage.setItem('uytibb_admin_name', nameVal)
  sessionStorage.setItem('uytibb_admin_user_name', nameVal)
  const list = getAdmins()
  const root = list.find(a => a.username === 'admin' || a.role === 'super')
  if (root) root.name = nameVal
  saveAdmins(list)
  refreshAdmins()
  toast('🎉 باشقۇرغۇچى نامى ساقلاندى! («' + nameVal + '»).')
}

function addAdmin() {
  const name = newAdmin.name.trim()
  const username = newAdmin.username.trim()
  if (!name || !username) { toast('ئىسمى ۋە كىرىش نامىنى تولدۇرۇڭ!', 'err'); return }
  const list = getAdmins()
  if (list.some(a => (a.username || '').toLowerCase() === username.toLowerCase())) {
    toast('بۇ كىرىش نامى ئاللىقاچان بار! باشقا نام تاللاڭ.', 'err')
    return
  }
  list.push({ username, name, role: newAdmin.role })
  saveAdmins(list)
  newAdmin.name = ''
  newAdmin.username = ''
  refreshAdmins()
  toast('➕ نام-ئۇچۇر قوشۇلدى («' + name + '»).')
}

function delAdmin(idx) {
  const list = getAdmins()
  if (list.length <= 1) { toast('كەم دېگەندە بىر باشقۇرغۇچى ھېساباتى قېلىشى كېرەك!', 'err'); return }
  if (!confirm('بۇ باشقۇرغۇچى ھېساباتىنى ئۆچۈرەمسىز؟')) return
  list.splice(idx, 1)
  saveAdmins(list)
  admins.value = list
  toast('🗑️ باشقۇرغۇچى ھېساباتى ئۆچۈرۈلدى.')
}

function saveFeedbackList(list) {
  localStorage.setItem('uytibb_feedback', JSON.stringify(list))
  try {
    const prog = JSON.parse(localStorage.getItem(LS_V1) || '{}')
    prog.fb = list
    localStorage.setItem(LS_V1, JSON.stringify(prog))
  } catch (e) {}
}

function backup() {
  const data = {
    version: '2.0',
    exportDate: new Date().toISOString(),
    lessons: store.lessons,
    teachers: store.teachers,
    students: (() => { try { return JSON.parse(localStorage.getItem('uytibb_all_students') || '[]') } catch (e) { return [] } })(),
    feedback: (() => { try { return JSON.parse(localStorage.getItem('uytibb_feedback') || '[]') } catch (e) { return [] } })()
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'uyghur-tibb-full-backup-' + new Date().toISOString().slice(0, 10) + '.json'
  a.click()
  URL.revokeObjectURL(a.href)
  toast('📦 زاپاس ھۆججەت چۈشۈرۈلدى.')
}

function restore(e) {
  const f = e.target.files && e.target.files[0]
  if (!f) return
  const reader = new FileReader()
  reader.onload = evt => {
    try {
      const imported = JSON.parse(evt.target.result)
      const r = store.restore(imported)
      if (!r.ok) {
        toast('⚠️ زاپاس ھۆججەت قوبۇل قىلىنمىدى: ' + r.error, 'err')
        return
      }
      if (Array.isArray(imported.students)) localStorage.setItem('uytibb_all_students', JSON.stringify(imported.students))
      if (Array.isArray(imported.feedback)) saveFeedbackList(imported.feedback)
      toast('✅ بارلىق دەرسلەر، سوئاللار ۋە سانلىق مەلۇماتلار ئەسلىگە كەلتۈرۈلدى!')
    } catch (err) {
      toast('ھۆججەتنى ئوقۇشتا خاتالىق: ' + err.message, 'err')
    }
  }
  reader.readAsText(f)
  e.target.value = ''
}

function resetDefaults() {
  if (!confirm('ھەقىقەتەن بارلىق ئۆزگەرتىشلەرنى ئۆچۈرۈپ ئەسلىدىكى ھالەتكە قايتۇرامسىز؟')) return
  store.resetDefaults()
  toast('⚠️ ئەسلى زاۋۇت ھالىتىگە قايتۇرۇلدى.')
}

function roleLabel(r) { return r === 'super' ? 'ئالىي باشقۇرغۇچى (Super Admin)' : 'ئوقۇتۇش مەسئۇلى (Teacher)' }
</script>

<template>
  <div>
    <!-- ADMIN PROFILE -->
    <div class="card">
      <h3>🛠 باشقۇرغۇچى تەڭشەكلىرى</h3>
      <div class="fld">
        <label>كوپچىلىق كۆرىدىغان باشقۇرغۇچى نامى</label>
        <input v-model="dispName" class="input" type="text">
      </div>
      <div class="qa-row">
        <button class="btn btn-gold btn-sm" @click="saveName">💾 نامنى ساقلاش</button>
      </div>
      <p class="acopy">
        🔑 باشقۇرغۇچى پارولى مۇلازىمەت تەرەپتە تەڭشىلىدۇ —
        Vercel دە <code>ADMIN_PASSWORD</code> مۇھىت ئۆزگەرگۈچىسى ئارقىلىق.
        پارول 'brauzer' دا ساقلانمايدۇ ياكى بۇ يەردە ئۆزگەرتىلەنمەيدۇ.
      </p>
    </div>

    <!-- MULTI-ADMIN -->
    <div class="card">
      <h3>👥 كۆپ باشقۇرغۇچى ھېساباتلىرى (metadata)</h3>
      <p class="acopy">
        بۇ تىزىملىك پەقەت كۆرسىتىش نامى ئۈچۈن. كىرىش ھەققىدە <code>ADMIN_PASSWORD</code>
        ئارقىلىق مۇلازىمەت تەرەپتە تەكشۈرۈلىدۇ — پارول ساقلانمايدۇ.
      </p>
      <div v-if="!admins.length" class="empty">ھېسابات يوق.</div>
      <div v-else class="adm-row" v-for="(adm, i) in admins" :key="i">
        <div class="adm-main">
          <b>{{ adm.username }}</b>
          <small>{{ adm.name }}</small>
          <span class="tag" :class="adm.role === 'super' ? 'b-gold' : 'b-green'">{{ roleLabel(adm.role) }}</span>
        </div>
        <button v-if="admins.length > 1" class="btn btn-red btn-sm" @click="delAdmin(i)">🗑️</button>
        <small v-else class="muted">ئاساسىي</small>
      </div>
      <div class="fld add-admin">
        <input v-model="newAdmin.name" class="input" type="text" placeholder="تولۇق ئىسمى">
        <input v-model="newAdmin.username" class="input" type="text" placeholder="كىرىش نامى">
        <select v-model="newAdmin.role" class="input">
          <option value="teacher">ئوقۇتۇش مەسئۇلى (Teacher)</option>
          <option value="super">ئالىي باشقۇرغۇچى (Super Admin)</option>
        </select>
        <button class="btn btn-teal btn-sm" @click="addAdmin">➕ قوشۇش</button>
      </div>
    </div>

    <!-- BACKUP & RESTORE -->
    <div class="card">
      <h3>💾 زاپاسلاش ۋە ئەسلىگە كەلتۈرۈش</h3>
      <p class="acopy">
        بارلىق دەرسلەر، ئۇستازلار، ئوقۇغۇچىلار ۋە پىكىر-سوئاللارنى بىر JSON
        ھۆججەتكە زاپاسلاپ، باشقا قۇرۇلمىغا يۆتكەلەيسىز.
      </p>
      <p class="acopy note">
        ℹ️ دەرس/ئۇستاز ئۆزگەرتىشلىرى پەقەت <b>بۇ ئۈسكۈنە</b> دە (localStorage)
        ساقلىنىدۇ — مۇلازىمەتكە ئاپتوماتىك يوللانمايدۇ. ئەسلى زاپاس ھۆججەتتىن
        باشقا قۇرۇلمىغا ئۆتكۈزۈش ئۈچۈن «زاپاس ھۆججەت چۈشۈرۈش/ئەسلىگە كەلتۈرۈش» نى ئىشلىتىڭ.
      </p>
      <div class="qa-row">
        <button class="btn btn-gold btn-sm" @click="backup">📥 زاپاس ھۆججەت چۈشۈرۈش</button>
        <label class="btn btn-line btn-sm file-btn">
          📤 زاپاس ھۆججەت ئەسلىگە كەلتۈرۈش
          <input type="file" accept="application/json" class="hidden" @change="restore">
        </label>
      </div>
      <div class="qa-row reset-row">
        <button class="btn btn-danger btn-sm" @click="resetDefaults">⚠️ ئەسلى زاۋۇت ھالىتىگە قايتۇرۇش</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.qa-row { display: flex; flex-wrap: wrap; gap: .55rem; }
.fld { margin-bottom: .7rem; }
.fld label { display: block; font-size: .82rem; font-weight: 800; color: var(--muted); margin-bottom: .3rem; }
.acopy { color: var(--muted); font-size: .82rem; line-height: 1.9; }
.acopy.note { border: 1px dashed var(--line); border-radius: 10px; padding: .55rem .7rem; background: var(--card-2); }
.acopy b { color: var(--ink); }
.acopy code { background: var(--card-2); padding: .1rem .35rem; border-radius: 6px; font-size: .88em; }
.empty { text-align: center; color: var(--muted); padding: 1rem; font-size: .85rem; }
.adm-row { display: flex; align-items: center; justify-content: space-between; gap: .6rem; border-top: 1px dashed var(--line); padding: .6rem 0; flex-wrap: wrap; }
.adm-main { flex: 1 1 220px; min-width: 0; display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
.adm-main b { font-size: .92rem; }
.adm-main small { color: var(--muted); font-size: .8rem; }
.tag { border-radius: 20px; padding: .15rem .55rem; font-size: .72rem; font-weight: 700; }
.tag.b-gold { background: rgba(201, 162, 39, .16); color: #8a6d15; }
.tag.b-green { background: rgba(38, 157, 66, .15); color: #269d42; }
.muted { color: var(--muted); font-size: .78rem; }
.add-admin { display: flex; gap: .5rem; flex-wrap: wrap; margin-top: .8rem; }
.add-admin .input { flex: 1 1 150px; }
.file-btn { cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.hidden { display: none; }
.reset-row { margin-top: .8rem; }
</style>