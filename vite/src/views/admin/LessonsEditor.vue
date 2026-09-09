<script setup>
import { ref, computed, watch } from 'vue'
import { useContent } from '../../stores/content'
import { useToast } from '../../composables/toast'

const store = useContent()
store.init()
const { toast } = useToast()

const PLACEHOLDER_LOCAL = '(يەرلىك PDF سانلىق مەلۇماتى)'

const MAX_PDF_BYTES = 2 * 1024 * 1024

const lesson = computed(() => store.lessonById(store.currentLessonId))

const pdfUrlDraft = ref('')
const pdfPreview = ref(false)
const previewUrl = ref('')
const previewTitle = ref('')
const fileInput = ref(null)

function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

const pdfTitleFallback = computed(() => {
  const L = lesson.value
  const base = L && L.title ? (store.currentLessonId + '-دەرسلىك: ' + L.title) : (store.currentLessonId + '-دەرس')
  return base + ' كىتابى (PDF)'
})

const pdfTitleText = computed({
  get: () => (lesson.value && lesson.value.pdfTitle) || pdfTitleFallback.value,
  set: v => { const L = lesson.value; if (L && v.trim()) L.pdfTitle = v.trim() }
})

const pdfUrlField = computed({
  get: () => (lesson.value && lesson.value.pdfData) ? PLACEHOLDER_LOCAL : pdfUrlDraft.value,
  set: v => { pdfUrlDraft.value = v }
})

const goalsText = computed({
  get: () => (lesson.value && lesson.value.goals || []).join('\n'),
  set: v => { const L = lesson.value; if (L) L.goals = v.split('\n').map(s => s.trim()).filter(Boolean) }
})

const hasPdf = computed(() => !!lesson.value && (lesson.value.pdfUrl || lesson.value.pdfData))
const pdfBadge = computed(() => hasPdf.value ? '📄 PDF بار' : '⚠️ PDF يوق')

watch(() => store.currentLessonId, () => {
  const L = lesson.value
  pdfUrlDraft.value = (L && L.pdfData) ? '' : (L && L.pdfUrl || '')
}, { immediate: true })

function switchLesson(e) { store.currentLessonId = Number(e.target.value) }

function addLesson() {
  const L = store.addLesson()
  toast('➕ ' + L.id + '-دەرس مەزمۇن ۋە تەييار سوئاللىرى بىلەن مۇۋەپپەقىيەتلىك قوشۇلدى!')
}

function delLesson() {
  if (store.lessons.length <= 1) {
    toast('كەم دېگەندە بىر دەرس قېلىشى كېرەك، ھەممە دەرسنى ئۆچۈرۈۋېتىشكە بولمايدۇ!', 'err')
    return
  }
  const L = lesson.value
  if (!L) return
  if (!confirm(L.id + '-دەرس («' + L.title + '») نى ئۆچۈرۈشنى راستىنلا جەزملەشتۈرەمسىز؟\nبۇ مەشغۇلاتتىن كېيىن مەزكۇر دەرس سىستېمىدىن ئۆچۈرۈلىدۇ.')) return
  store.deleteLesson(L.id)
  toast('🗑️ ' + L.id + '-دەرس مۇۋەپپەقىيەتلىك ئۆچۈرۈلدى!')
}

function uploadPdf(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  const L = lesson.value
  if (!L) return

  const isPdf = file.type === 'application/pdf' || (!file.type && /\.pdf$/i.test(file.name))
  if (!isPdf) {
    toast('⚠️ پەقەت PDF ھۆججەت تاللىيالايسىز!', 'err')
    return
  }
  if (file.size > MAX_PDF_BYTES) {
    toast('⚠️ PDF ھۆججەت ' + Math.round(MAX_PDF_BYTES / 1024 / 1024) + 'MB دىن چوڭ بولماسلىقى كېرەك.', 'err')
    return
  }

  const rawName = file.name.replace(/\.[^/.]+$/, '').replace(/[\_\-]+/g, ' ').trim()
  let cleanTitle = rawName
  const m = /^lesson\s*(\d+)$/i.exec(rawName)
  if (m) cleanTitle = m[1] + '-دەرسلىك بىلىملىرى'
  const reader = new FileReader()
  reader.onerror = () => toast('⚠️ ھۆججەتنى ئوقۇشتا خاتالىق — قايتا سىناڭ.', 'err')
  reader.onload = (evt) => {
    const pdfData = evt.target.result
    const pdfUrl = 'pdf/' + file.name
    const pdfTitle = (cleanTitle || (L.id + '-دەرس')) + ' كىتابى (PDF)'
    const prev = { pdfUrl: L.pdfUrl, pdfData: L.pdfData, pdfTitle: L.pdfTitle }

    L.pdfData = pdfData
    L.pdfUrl = pdfUrl
    L.pdfTitle = pdfTitle
    pdfUrlDraft.value = ''
    if (!L.title || L.title === (L.id + '-دەرسلىك بىلىملىرى') || L.title.indexOf('يېڭى دەرس') >= 0) {
      L.title = cleanTitle || (L.id + '-دەرسلىك تېبابەت بىلىملىرى')
    }
    if (!L.subtitle || L.subtitle === 'يېڭى تولۇقلانغان دەرس مەزمۇنى') {
      L.subtitle = 'مەزكۇر دەرسلىكنىڭ كىتابتىكى ئەسلى مەزمۇنى، نەزەرىيىسى ۋە ئەمەلىي تەسىرى'
    }
    if (!L.short) L.short = L.id + '-دەرس'
    if (!L.desc || L.desc === 'بۇ دەرس ئارقا سەھنىدىن يېڭىدىن قوشۇلدى') {
      L.desc = 'مەزكۇر دەرسلىككە تېبابەت دەرسلىك كىتابچىسى تولۇق كىرگۈزۈلگەن بولۇپ، ئۆگىنىش ۋە ئەمەلىيەتتە قوللىنىشقا مۇۋاپىق.'
    }
    if (!L.goals || !L.goals.length || (L.goals.length === 1 && L.goals[0] === 'بۇ دەرسنىڭ ئاساسىي مەقسىتىنى بىلىش')) {
      L.goals = [
        'دەرسلىك كىتابىنىڭ مەزمۇنى ۋە ئاساسىي پىرىنسىپلىرىنى تولۇق ئىگىلەش',
        'مەزكۇر دەرسكە ئائىت مۇھىم ئاتالغۇ ۋە چۈشەنچىلەرنى پەرقلەندۈرۈش',
        'دەرسلىككە چېتىشلىق تەكرارلاش مەشىق ۋە سىناق سوئاللىرىغا مۇستەقىل جاۋاب بېرىش'
      ]
    }
    if (!L.sections || !L.sections.length || (L.sections.length === 1 && L.sections[0].h === '1. كىرىش سۆز')) {
      L.sections = [
        {
          h: '1. دەرسلىك كىتابى ھەققىدە ۋە مۇھىم بىلىم نۇقتىلىرى',
          body: '<p>مەزكۇر دەرسكە مۇناسىپ <b>«' + escapeHtml(pdfTitle) + '»</b> سىستېمىغا مۇۋەپپەقىيەتلىك كىرگۈزۈلدى. دەرسلىك ئىچىدىكى <b>«📄 كىتاب (PDF)»</b> خەتكۈچى ئارقىلىق پۈتۈن كىتابنى تولۇق ئوقۇيالايسىز.</p>',
          points: [
            'دەرسلىك كىتابىدىكى مۇھىم تېبابەت بىلىملىرىنى ئەستايىدىل تەھلىل قىلىش',
            'مۇھىم تېبابەت تەجرىبىلىرىنى دەپتەرگە قەرەللىك خاتىرىلەش'
          ]
        }
      ]
    }
    if (!store.saveAll()) {
      L.pdfData = prev.pdfData
      L.pdfUrl = prev.pdfUrl
      L.pdfTitle = prev.pdfTitle
      toast('⚠️ PDF ساقلاش مەغلۇپ بولدى — يەرلىك ئەسلىھە چېكى تولغان بولۇشى مۇمكىن.', 'err')
      return
    }
    toast('✅ PDF قوشۇلدى ۋە دەرس مەزمۇنلىرى ئاپتوماتىك تولدۇرۇلدى!')
  }
  reader.readAsDataURL(file)
}

function previewPdf() {
  const L = lesson.value
  const draft = pdfUrlDraft.value.trim() === PLACEHOLDER_LOCAL ? '' : pdfUrlDraft.value.trim()
  const url = (L && L.pdfData) || draft || (L && L.pdfUrl) || ('pdf/lesson-' + store.currentLessonId + '.pdf')
  const pTitle = (L && L.pdfTitle) || pdfTitleText.value
  if (!url) {
    if (confirm('⚠️ مەزكۇر ' + store.currentLessonId + '-دەرسكە تېخى PDF بېكىتىلمىگەن.\n\n💡 9-دەرسلىك ۋە 10-دەرسلىكتە تەييار PDF كىتاب بايلىقى بار.\n9-دەرسلىكنىڭ PDF كىتابىنى ھازىر كۆرەمسىز؟')) {
      store.currentLessonId = 9
      setTimeout(() => previewPdf(), 150)
    }
    return
  }
  previewTitle.value = '👁️ ' + pTitle
  previewUrl.value = url
  pdfPreview.value = true
}

function downloadName() {
  return String(previewTitle.value || 'دەرسلىك').replace(/^\s*👁️\s*/, '').replace(/[\\/:*?"<>|]/g, '_') + '.pdf'
}

function removePdf() {
  const L = lesson.value
  if (!L) return
  if (!confirm('بۇ دەرسلىكنىڭ PDF كىتابچىسىنى چىقىرىۋېتەمسىز؟')) return
  delete L.pdfUrl
  delete L.pdfData
  delete L.pdfTitle
  pdfUrlDraft.value = ''
  toast('🗑️ PDF چىقىرىۋېتىلدى.')
}

function addSection() {
  const L = lesson.value
  if (!L) return
  L.sections = L.sections || []
  L.sections.push({ h: 'يېڭى بۆلەك', body: '<p>بۆلەك مەزمۇنىنى بۇ يەرگە يېزىڭ...</p>', points: [] })
}

function removeSection(i) {
  const L = lesson.value
  if (L && L.sections) L.sections.splice(i, 1)
}

function onPoints(sec, e) {
  sec.points = e.target.value.split('\n').map(s => s.trim()).filter(Boolean)
}

function save() {
  const L = lesson.value
  if (!L) return
  const pUrl = pdfUrlDraft.value.trim()
  if (pUrl && pUrl !== PLACEHOLDER_LOCAL) L.pdfUrl = pUrl
  store.saveAll()
  toast('✅ بارلىق ئۆزگىرىشلەر ساقلاندى!')
}
</script>

<template>
  <div v-if="lesson">
    <!-- SELECTOR -->
    <div class="card">
      <div class="card-head">
        <h3>📖 دەرس تاللاش ۋە PDF تەڭشەش</h3>
        <select class="input sel" :value="store.currentLessonId" @change="switchLesson">
          <option v-for="L in store.lessons" :key="L.id" :value="L.id">
            {{ L.id }}-دەرس: {{ L.title }}{{ (L.pdfUrl || L.pdfData) ? ' 📄 [PDF كىتاب بار]' : '' }}
          </option>
        </select>
      </div>
      <div class="qa-row">
        <button class="btn btn-teal btn-sm" @click="addLesson">➕ يېڭى دەرس قوشۇش</button>
        <button class="btn btn-danger btn-sm" @click="delLesson">🗑️ دەرس ئۆچۈرۈش</button>
        <span class="tbadge" :class="hasPdf ? 'b-green' : 'b-gold'">{{ pdfBadge }}</span>
      </div>
    </div>

    <!-- LESSON FIELDS -->
    <div class="card">
      <h3>دەرس ئۇچۇرلىرى</h3>
      <div class="fld">
        <label>دەرس باش تېمىسى</label>
        <input v-model="lesson.title" class="input" type="text" placeholder="دەرسلىكنىڭ تولۇق تېمىسى">
      </div>
      <div class="row2">
        <div class="fld">
          <label>قىسقا نامى</label>
          <input v-model="lesson.short" class="input" type="text">
        </div>
        <div class="fld">
          <label>تۈز سەپ (Subtitle)</label>
          <input v-model="lesson.subtitle" class="input" type="text">
        </div>
      </div>
      <div class="fld">
        <label>تەپسىلىي چۈشەندۈرۈش (Desc)</label>
        <textarea v-model="lesson.desc" class="input" rows="2"></textarea>
      </div>
      <div class="fld">
        <label>مەقسەتلەر (ھەر قۇرغا بىردىن)</label>
        <textarea v-model="goalsText" class="input" rows="3"></textarea>
      </div>
    </div>

    <!-- PDF MANAGER -->
    <div class="card">
      <h3>📄 PDF كىتابچە باشقۇرۇش</h3>
      <div class="fld">
        <label>PDF ئاتى (Title)</label>
        <input :value="pdfTitleText" @input="pdfTitleText = $event.target.value" class="input" type="text">
      </div>
      <div class="fld">
        <label>PDF ئادرېسى (URL)</label>
        <input v-model="pdfUrlField" class="input" type="text" dir="ltr" placeholder="pdf/lesson-1.pdf">
        <small v-if="lesson.pdfData" class="hint">📦 يەرلىك PDF ئاللىبۇرۇن ساقلاندى — URL ئەمەس.</small>
      </div>
      <div class="qa-row">
        <button class="btn btn-gold btn-sm" @click="previewPdf">👁️ كۆرۈش</button>
        <a v-if="previewUrl" class="btn btn-line btn-sm" :href="previewUrl" target="_blank" rel="noopener">↗ يېڭى ئۆزەكتە ئېچىش</a>
        <a v-if="previewUrl" class="btn btn-line btn-sm" :href="previewUrl" :download="downloadName()">⬇ چۈشۈرۈش</a>
        <button class="btn btn-danger btn-sm" @click="removePdf">🗑️ PDF چىقىرىۋېتىش</button>
      </div>
      <div class="dropzone" @click="fileInput && fileInput.click()">
        <input ref="fileInput" type="file" accept="application/pdf" class="hidden" @change="uploadPdf">
        <b>📤 PDF يۈكلەش</b>
        <small>بۇ يەرنى بېسىڭ ياكى PDF كىتابچە تاللاڭ — دەرس مەزمۇنلىرى ئاپتوماتىك تولدۇرۇلىدۇ. (ئەڭ چوڭ: 2MB)</small>
      </div>
    </div>

    <!-- SECTIONS EDITOR -->
    <div class="card">
      <div class="card-head">
        <h3>📑 دەرس بۆلەكلىرى ({{ (lesson.sections || []).length }})</h3>
        <button class="btn btn-teal btn-sm" @click="addSection">➕ بۆلەك قوشۇش</button>
      </div>
      <div v-if="!(lesson.sections || []).length" class="empty">تېخى بۆلەك يوق.</div>
      <div v-for="(sec, i) in (lesson.sections || [])" :key="i" class="sec">
        <div class="sec-head">
          <b>{{ i + 1 }}-بۆلەك تېمىسى</b>
          <button class="btn btn-danger btn-sm" @click="removeSection(i)">🗑️ ئۆچۈرۈش</button>
        </div>
        <input v-model="sec.h" class="input" type="text">
        <label class="lbl">بۆلەك مەزمۇنى (HTML/تېكىست)</label>
        <textarea v-model="sec.body" class="input" rows="4"></textarea>
        <label class="lbl">📌 مۇھىم نۇقتىلار (ھەر قۇردا بىردىن)</label>
        <textarea class="input" rows="2" :value="(sec.points || []).join('\n')" @input="onPoints(sec, $event)"></textarea>
      </div>
    </div>

    <div class="qa-row save-row">
      <button class="btn btn-gold" @click="save">💾 ھەممىنى ساقلاش</button>
      <button class="btn btn-ghost" @click="save">⚡ تېز ساقلاش</button>
    </div>

    <!-- PDF PREVIEW MODAL -->
    <div v-if="pdfPreview" class="overlay" @click.self="pdfPreview = false">
      <div class="modal pdf-modal">
        <h3>{{ previewTitle }}</h3>
        <iframe :src="previewUrl" class="pdf-frame" title="PDF كۆرۈش"></iframe>
        <div class="qa-row">
          <a class="btn btn-line btn-sm" :href="previewUrl" target="_blank" rel="noopener">↗ يېڭى ئۆزەكتە ئېچىش</a>
          <a class="btn btn-gold btn-sm" :href="previewUrl" :download="downloadName()">⬇ چۈشۈرۈش</a>
          <button class="btn btn-ghost btn-sm" @click="pdfPreview = false">ياپقۇچنى تاقاش</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sel { max-width: 380px; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .8rem; flex-wrap: wrap; }
.qa-row { display: flex; flex-wrap: wrap; gap: .55rem; }
.row2 { display: grid; grid-template-columns: 1fr 1fr; gap: .7rem; }
@media (max-width: 560px) { .row2 { grid-template-columns: 1fr; } }
.fld { margin-bottom: .7rem; }
.fld label, .lbl { display: block; font-size: .82rem; font-weight: 800; color: var(--muted); margin-bottom: .3rem; }
.hint { display: block; color: var(--teal-dark); font-size: .78rem; margin-top: .3rem; }
.tbadge { display: inline-block; border-radius: 20px; padding: .3rem .7rem; font-size: .78rem; align-self: center; }
.tbadge.b-green { background: rgba(38, 157, 66, .15); color: #269d42; }
.tbadge.b-gold { background: rgba(201, 162, 39, .16); color: #8a6d15; }
.dropzone { margin-top: .8rem; border: 2px dashed var(--line); border-radius: 14px; padding: 1rem; text-align: center; cursor: pointer; color: var(--muted); transition: border-color .15s ease; }
.dropzone:hover { border-color: var(--teal); background: var(--card-2); }
.dropzone b { display: block; color: var(--teal-dark); margin-bottom: .15rem; }
.dropzone small { font-size: .78rem; }
.hidden { display: none; }
.sec { border: 1px solid var(--line); border-radius: 12px; padding: .9rem; background: var(--bg); margin-bottom: .7rem; }
.sec-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: .5rem; }
.sec input { margin-bottom: .6rem; }
.sec textarea { margin-bottom: .6rem; }
.empty { text-align: center; color: var(--muted); padding: .8rem; }
.save-row { justify-content: flex-end; }
.pdf-modal { max-width: 640px; }
.pdf-frame { width: 100%; height: 62vh; border: 1px solid var(--line); border-radius: 12px; background: var(--bg); }
</style>