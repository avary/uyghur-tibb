<script setup>
import { ref, reactive, computed } from 'vue'
import { useContent } from '../../stores/content'
import { useToast } from '../../composables/toast'
import { QTYPES } from '../../data/loader'

const store = useContent()
store.init()
const { toast } = useToast()

const fLesson = ref('all')
const fType = ref('all')
const search = ref('')
const qModal = ref(false)
const editing = ref(null)

const qForm = reactive({ lessonId: null, type: 'choice', q: '', exp: '', opts: '', a: 0, tfA: 'true', blankA: '', essayA: '' })

const rows = computed(() => {
  const out = []
  store.lessons.forEach(L => {
    if (fLesson.value !== 'all' && Number(L.id) !== Number(fLesson.value)) return
    ;(L.quiz || []).forEach((q, qIdx) => {
      if (fType.value !== 'all' && q.type !== fType.value) return
      if (search.value) {
        const s = search.value.toLowerCase()
        if ((q.q || '').toLowerCase().indexOf(s) < 0 && (q.exp || '').toLowerCase().indexOf(s) < 0) return
      }
      out.push({ L, q, qIdx })
    })
  })
  return out
})

function typeLabel(t) { return QTYPES[t] || t }
function typeBadge(t) { return t === 'choice' ? 'b-green' : (t === 'tf' ? 'b-gold' : 'b-plane') }

function answerText(q) {
  if (q.type === 'choice') return 'جاۋاب: ' + (q.opts ? q.opts[q.a] : q.a)
  if (q.type === 'tf') return q.a ? 'توغرا (✓)' : 'خاتا (✗)'
  if (q.type === 'blank') return 'بوش: ' + JSON.stringify(q.a)
  if (q.type === 'match') return 'تۇتاشتۇرۇش (' + (q.pairs ? q.pairs.length : 0) + ' جۈپ)'
  if (q.type === 'essay') return 'مودېل جاۋاب بار'
  return ''
}

function resetForm(lessonId) {
  qForm.lessonId = lessonId
  qForm.type = 'choice'
  qForm.q = ''
  qForm.exp = ''
  qForm.opts = ''
  qForm.a = 0
  qForm.tfA = 'true'
  qForm.blankA = ''
  qForm.essayA = ''
}

function openAdd() {
  editing.value = null
  resetForm(store.currentLessonId)
  qModal.value = true
}

function openEdit(row) {
  const q = row.q
  editing.value = { lessonId: row.L.id, qIdx: row.qIdx }
  qForm.lessonId = row.L.id
  qForm.type = q.type || 'choice'
  qForm.q = q.q || ''
  qForm.exp = q.exp || ''
  qForm.opts = (q.type === 'choice' && q.opts) ? q.opts.join('\n') : ''
  qForm.a = q.type === 'choice' ? (q.a != null ? q.a : 0) : 0
  qForm.tfA = (q.type === 'tf' && q.a) ? 'true' : 'false'
  qForm.blankA = (q.type === 'blank' && q.a) ? (Array.isArray(q.a) ? q.a.map(item => Array.isArray(item) ? item.join(' / ') : item).join(', ') : q.a) : ''
  qForm.essayA = (q.type === 'essay') ? (q.model || '') : ''
  qModal.value = true
}

function delQ(L, qIdx) {
  if (!confirm('بۇ سوئالنى ئۆچۈرەمسىز؟')) return
  if (L.quiz) L.quiz.splice(qIdx, 1)
  store.saveAll()
  toast('🗑️ سوئال ئۆچۈرۈلدى.')
}

function saveQ() {
  const lId = Number(qForm.lessonId)
  const L = store.lessonById(lId)
  if (!L) { toast('دەرس تاللانمىدى!', 'err'); return }
  const qText = qForm.q.trim()
  if (!qText) { toast('سوئال تېكىستىنى كىرگۈزۈڭ!', 'err'); return }

  const newQ = { type: qForm.type, q: qText, exp: qForm.exp.trim() }
  if (qForm.type === 'choice') {
    newQ.opts = qForm.opts.split('\n').map(s => s.trim()).filter(Boolean)
    newQ.a = parseInt(qForm.a, 10) || 0
  } else if (qForm.type === 'tf') {
    newQ.a = qForm.tfA === 'true'
  } else if (qForm.type === 'blank') {
    newQ.a = qForm.blankA.split(',').map(s => [s.trim()])
  } else if (qForm.type === 'essay') {
    newQ.model = qForm.essayA.trim()
  }

  L.quiz = L.quiz || []
  if (editing.value && editing.value.lessonId === lId && L.quiz[editing.value.qIdx]) {
    L.quiz[editing.value.qIdx] = newQ
    toast('✏️ سوئال مۇۋەپپەقىيەتلىك تەھرىرلەندى!')
  } else {
    L.quiz.push(newQ)
    toast('➕ يېڭى سوئال قوشۇلدى!')
  }
  store.saveAll()
  qModal.value = false
}
</script>

<template>
  <div>
    <div class="card">
      <div class="card-head">
        <h3>☑ سوئاللار بانكى ({{ rows.length }})</h3>
        <button class="btn btn-gold btn-sm" @click="openAdd">➕ يېڭى سوئال كىرگۈزۈش</button>
      </div>
      <div class="filters">
        <select v-model="fLesson" class="input">
          <option value="all">ھەممە دەرس</option>
          <option v-for="L in store.lessons" :key="L.id" :value="L.id">{{ L.id }}-دەرس</option>
        </select>
        <select v-model="fType" class="input">
          <option value="all">ھەممە تۈر</option>
          <option v-for="(lab, t) in QTYPES" :key="t" :value="t">{{ QTYPES[t] }}</option>
        </select>
        <input v-model="search" class="input" type="search" placeholder="سوئال ئىزدەش...">
      </div>
    </div>

    <div class="card table-card">
      <div v-if="!rows.length" class="empty">تېخى سوئال يوق ياكى سۈزگۈچكە ماس كەلمىدى.</div>
      <table v-else class="tbl">
        <thead>
          <tr>
            <th>دەرس</th>
            <th>تۈر</th>
            <th>سوئال</th>
            <th>جاۋاب / چۈشەندۈرۈش</th>
            <th>ھەرىكەت</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in rows" :key="row.L.id + '-' + row.qIdx">
            <td><b>{{ row.L.id }}</b></td>
            <td><span class="qbadge" :class="typeBadge(row.q.type)">{{ typeLabel(row.q.type) }}</span></td>
            <td>
              <div class="q-q">{{ row.q.q || '' }}</div>
            </td>
            <td>
              <div class="q-a">{{ answerText(row.q) }}</div>
              <small class="q-exp">{{ row.q.exp || '' }}</small>
            </td>
            <td class="cell-actions">
              <button class="btn btn-gold btn-sm" @click="openEdit(row)">✏️ تەھرىرلەش</button>
              <button class="btn btn-red btn-sm" @click="delQ(row.L, row.qIdx)">🗑️</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- QUESTION MODAL -->
    <div v-if="qModal" class="overlay" @click.self="qModal = false">
      <div class="modal q-modal">
        <h3>{{ editing ? '✏️ سوئالنى تەھرىرلەش' : '➕ يېڭى سوئال كىرگۈزۈش' }}</h3>
        <div class="fld">
          <label>دەرس</label>
          <select v-model="qForm.lessonId" class="input">
            <option v-for="L in store.lessons" :key="L.id" :value="L.id">{{ L.id }}-دەرس: {{ L.title }}</option>
          </select>
        </div>
        <div class="fld">
          <label>سوئال تۈرى</label>
          <select v-model="qForm.type" class="input">
            <option v-for="(lab, t) in QTYPES" :key="t" :value="t">{{ lab }}</option>
          </select>
        </div>
        <div class="fld">
          <label>سوئال تېكىستى</label>
          <textarea v-model="qForm.q" class="input" rows="3" placeholder="سوئالنى بۇ يەرگە يېزىڭ..."></textarea>
        </div>
        <div v-if="qForm.type === 'choice'" class="fld">
          <label>تاللاش تۈرلىرى (4 دانە، ھەر قۇرغا بىردىن)</label>
          <textarea v-model="qForm.opts" class="input" rows="4" placeholder="1-تاللاش&#10;2-تاللاش&#10;3-تاللاش&#10;4-تاللاش"></textarea>
          <label>توغرا تاللاش نومۇرى (0، 1، 2، 3)</label>
          <input v-model.number="qForm.a" class="input" type="number" min="0" max="3">
        </div>
        <div v-else-if="qForm.type === 'tf'" class="fld">
          <label>توغرا جاۋاب</label>
          <select v-model="qForm.tfA" class="input">
            <option value="true">توغرا (True)</option>
            <option value="false">خاتا (False)</option>
          </select>
        </div>
        <div v-else-if="qForm.type === 'blank'" class="fld">
          <label>توغرا بوش ئورۇن جاۋابى (ئۈزۈك چېكىت بىلەن ئايرىڭ)</label>
          <input v-model="qForm.blankA" class="input" type="text" placeholder="مەسىلەن: ئۆسۈملۈك, ھايۋان, مەدەن">
        </div>
        <div v-else-if="qForm.type === 'essay'" class="fld">
          <label>مودېل توغرا جاۋاب (ئۆلچەم)</label>
          <textarea v-model="qForm.essayA" class="input" rows="3" placeholder="سوئالنىڭ ئۆلچەملىك بايان جاۋابى..."></textarea>
        </div>
        <div v-else class="fld">
          <small class="hint">🔗 تۇتاشتۇرۇش (match) تۈرىدىكى سوئاللار بۇ تەھرىرلىگۈچتە قوللىنمايدۇ — تەييار جۈپلەرنى توغرا مەنبەدىن ئېلىش كېرەك.</small>
        </div>
        <div class="fld">
          <label>چۈشەندۈرۈش (Exp)</label>
          <input v-model="qForm.exp" class="input" type="text" placeholder="ئىختىيارىي — ئوقۇغۇچىغا كۆرسىتىلىدۇ">
        </div>
        <div class="qa-row">
          <button class="btn btn-ghost" @click="qModal = false">بىكار قىلىش</button>
          <button class="btn btn-gold" @click="saveQ">💾 ساقلاش</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .8rem; flex-wrap: wrap; }
.qa-row { display: flex; flex-wrap: wrap; gap: .55rem; }
.filters { display: grid; grid-template-columns: 1fr 1fr 1.4fr; gap: .6rem; }
@media (max-width: 640px) { .filters { grid-template-columns: 1fr; } }
.table-card { overflow-x: auto; }
.tbl th, .tbl td { white-space: nowrap; }
.tbl th:first-child { width: 44px; }
.qbadge { display: inline-block; border-radius: 20px; padding: .15rem .55rem; font-size: .72rem; font-weight: 700; }
.qbadge.b-green { background: rgba(38, 157, 66, .15); color: #269d42; }
.qbadge.b-gold { background: rgba(201, 162, 39, .16); color: #8a6d15; }
.qbadge.b-plane { background: var(--card-2); color: var(--muted); }
.q-q { font-weight: 700; max-width: 340px; white-space: normal; line-height: 1.7; }
.q-a { color: var(--teal-dark); font-size: .82rem; white-space: normal; }
.q-exp { color: var(--muted); display: block; max-width: 220px; white-space: normal; line-height: 1.6; }
.cell-actions { white-space: nowrap; text-align: center; }
.cell-actions .btn { margin: .15rem; }
.empty { text-align: center; color: var(--muted); padding: 1.2rem; }
.fld { margin-bottom: .7rem; }
.fld label { display: block; font-size: .82rem; font-weight: 800; color: var(--muted); margin-bottom: .3rem; }
.hint { color: var(--muted); line-height: 1.8; }
.q-modal { max-width: 560px; max-height: 92vh; overflow-y: auto; }
.qa-row { justify-content: flex-end; }
</style>