<script setup>
import { ref, computed, onMounted } from 'vue'
import { useContent } from '../../stores/content'
import { useToast } from '../../composables/toast'
import { openPdfViewer } from '../../composables/pdfViewer'
import {
  getCustomPdfBooks,
  saveCustomPdfBooks,
  resolvePdfUrl,
  dataUrlToBlobUrl,
  pdfDb,
  bookSource
} from '../../data/books'

// PDF كۇتۇپخانىسى باشقۇرۇش مەركىزى — v41–v43 + v59–v63 port.
// • دەرسلىك PDF كىتابلىرى (uytibb_custom_lessons ئارقىلىق، content store)
// • مۇستەقىل قوشۇمچە PDF كىتابلار (uytibb_custom_pdf_books + IndexedDB blob)

const emit = defineEmits(['edit'])
const store = useContent()
store.init()
const { toast } = useToast()

const MAX_PDF_BYTES = 2 * 1024 * 1024

const lessons = computed(() => store.lessons)
const customBooks = ref([])
onMounted(() => { customBooks.value = getCustomPdfBooks() })

function hasPdf(L) {
  return !!(L && (L.pdfUrl || L.pdfData))
}
function pdfUrlOf(L) {
  return (L && (L.pdfData || L.pdfUrl)) || ''
}
function shorten(u) {
  return u.length > 40 ? u.slice(0, 40) + '…' : u
}

function editLesson(L) {
  store.currentLessonId = L.id
  emit('edit', L.id)
}

async function viewLesson(L) {
  const src = L.pdfData && L.pdfData.indexOf('data:') === 0
    ? dataUrlToBlobUrl(L.pdfData)
    : (L.pdfUrl || resolvePdfUrl(L))
  if (!src || src === '#') return toast('⚠️ PDF ھۆججىتى تېپىلمىدى.', 'err')
  openPdfViewer(src, L.pdfTitle || (L.id + '-دەرسلىك كىتابى (PDF)'))
}

async function viewBook(b) {
  const src = await bookSource(b)
  if (!src) return toast('⚠️ PDF ھۆججىتى تېپىلمىدى.', 'err')
  openPdfViewer(src, b.pdfTitle || b.title || 'PDF كىتابى')
}

// ---------- يېڭى كىتاب قوشۇش ----------
const showAdd = ref(false)
const titleInp = ref('')
const descInp = ref('')
const urlInp = ref('')
const typeInp = ref('extra')
const fileInp = ref(null)

function openAdd() {
  titleInp.value = ''
  descInp.value = ''
  urlInp.value = ''
  typeInp.value = 'extra'
  if (fileInp.value) fileInp.value.value = ''
  showAdd.value = true
}
function closeAdd() { showAdd.value = false }

function isPdfFile(file) {
  return !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name))
}

function commitExtraBook(newBook) {
  const list = getCustomPdfBooks()
  list.push(newBook)
  saveCustomPdfBooks(list)
  customBooks.value = getCustomPdfBooks()
  closeAdd()
  toast('🎉 «' + newBook.title + '» كۇتۇپخانىغا مۇستەقىل كىتاب قىلىپ قوشۇلدى!')
}

async function saveNewBook() {
  const title = titleInp.value.trim()
  const desc = descInp.value.trim()
  const url = urlInp.value.trim()
  const file = fileInp.value && fileInp.value.files && fileInp.value.files[0] ? fileInp.value.files[0] : null
  if (!title) {
    toast('⚠️ كىتاب نامىنى يېزىڭ!', 'err')
    return
  }
  if (file && !isPdfFile(file)) {
    toast('⚠️ پەقەت PDF ھۆججەت تاللىيالايسىز!', 'err')
    return
  }

  // مۇستەقىل قوشۇمچە كىتاب (دەرسلىككە تەسىر كۆرسەتمەيدۇ)
  if (typeInp.value === 'extra') {
    const newBook = {
      id: 'extra-' + Date.now(),
      title,
      subtitle: desc || (title + ' (PDF كىتاب)'),
      pdfTitle: title,
      pdfUrl: url || (file ? 'pdf/' + file.name : 'pdf/book.pdf'),
      type: 'extra',
      when: new Date().toISOString().slice(0, 10)
    }

    if (file) {
      try {
        await pdfDb.save(newBook.id, file, file.name)
        newBook.hasBlob = true
        newBook.fileName = file.name
        newBook.pdfUrl = url || ('pdf/' + file.name)
        commitExtraBook(newBook)
        return
      } catch (err) {
        console.warn('PdfStore save error:', err)
        if (file.size <= MAX_PDF_BYTES) {
          const reader = new FileReader()
          reader.onload = (evt) => {
            newBook.pdfData = evt.target.result
            newBook.pdfUrl = url || ('pdf/' + file.name)
            commitExtraBook(newBook)
          }
          reader.readAsDataURL(file)
          return
        }
        newBook.pdfUrl = url || ('pdf/' + file.name)
        commitExtraBook(newBook)
        return
      }
    }
    commitExtraBook(newBook)
    return
  }

  // دەرسلىك قىلىپ قوشۇش (چوڭلىقى <3MB بولغان PDF سانلىق مەلۇمات بىلەن ساقلىنىدۇ)
  const ids = store.lessons.map(l => Number(l.id) || 0)
  const newId = ids.length ? Math.max.apply(null, ids) + 1 : 1
  const newLesson = {
    id: newId,
    title,
    subtitle: desc || (title + ' كىتابى'),
    short: newId + '-دەرس',
    desc: desc || 'مەزكۇر PDF كىتاب كۇتۇپخانىغا يېڭىدىن كىرگۈزۈلدى.',
    pdfTitle: title + ' (PDF)',
    pdfUrl: url || ('pdf/lesson-' + newId + '.pdf'),
    goals: ['مەزكۇر PDF كىتابنىڭ مەزمۇنىنى تولۇق ئوقۇپ ئىگىلەش'],
    sections: [{
      h: '1. كىتاب مەزمۇنى',
      body: '<p>بۇ PDF كىتاب كۇتۇپخانىغا كىرگۈزۈلدى. «📄 كىتاب (PDF)» خەتكۈچى ئارقىلىق تولۇق ئوقۇيالايسىز.</p>',
      points: ['مۇھىم تېبابەت بىلىملىرىنى ئۆگىنىش']
    }],
    terms: [],
    quiz: []
  }

  function commit() {
    store.lessons.push(newLesson)
    store.currentLessonId = newId
    if (!store.saveAll()) {
      store.lessons = store.lessons.filter(l => Number(l.id) !== newId)
      closeAdd()
      toast('⚠️ ساقلاش مەغلۇپ بولدى — يەرلىك ئەسلىھە چېكى تولغان بولۇشى مۇمكىن.', 'err')
      return
    }
    closeAdd()
    toast('🎉 يېڭى PDF كىتابى كۇتۇپخانىغا مۇۋەپپەقىيەتلىك قوشۇلدى!')
  }

  if (file) {
    if (file.size > MAX_PDF_BYTES) {
      toast('⚠️ دەرسلىك PDF ھۆججەت ' + Math.round(MAX_PDF_BYTES / 1024 / 1024) + 'MB دىن چوڭ بولسا، ئۇنىڭ ئورنىغا «مۇستەقىل قوشۇمچە كىتاب» قىلىپ قوشۇڭ.', 'err')
      return
    }
    const reader = new FileReader()
    reader.onerror = () => toast('⚠️ ھۆججەتنى ئوقۇشتا خاتالىق — قايتا سىناڭ.', 'err')
    reader.onload = (evt) => {
      newLesson.pdfData = evt.target.result
      commit()
    }
    reader.readAsDataURL(file)
  } else {
    commit()
  }
}

// ---------- مۇستەقىل كىتاب تەھرىرلەش / ئۆچۈرۈش ----------
const showEdit = ref(false)
const editIdx = ref(-1)
const editTitle = ref('')
const editSub = ref('')
const editUrl = ref('')
const editFile = ref(null)

function openEditBook(idx) {
  editIdx.value = idx
  const b = customBooks.value[idx]
  if (!b) return
  editTitle.value = b.title || ''
  editSub.value = b.subtitle || ''
  editUrl.value = b.pdfData && b.pdfData.indexOf('data:') === 0 ? '(يەرلىك PDF سانلىق مەلۇماتى)' : (b.pdfUrl || '')
  if (editFile.value) editFile.value.value = ''
  showEdit.value = true
}
function closeEditBook() { showEdit.value = false }

async function saveEditedBook() {
  const title = editTitle.value.trim()
  if (!title) {
    toast('⚠️ كىتاب نامىنى يېزىڭ!', 'err')
    return
  }
  const list = getCustomPdfBooks()
  const b = list[editIdx.value]
  if (!b) return
  const file = editFile.value && editFile.value.files && editFile.value.files[0] ? editFile.value.files[0] : null
  if (file && !isPdfFile(file)) {
    toast('⚠️ پەقەت PDF ھۆججەت تاللىيالايسىز!', 'err')
    return
  }
  b.title = title
  b.pdfTitle = title
  if (editSub.value.trim()) b.subtitle = editSub.value.trim()
  const u = editUrl.value.trim()
  b.pdfUrl = u && u !== '(يەرلىك PDF سانلىق مەلۇماتى)' ? u : b.pdfUrl
  if (file) {
    try {
      await pdfDb.save(b.id, file, file.name)
      b.hasBlob = true
      b.fileName = file.name
      saveCustomPdfBooks(list)
      customBooks.value = getCustomPdfBooks()
      closeEditBook()
      toast('✅ PDF كىتابى تەھرىرلەندى (يېڭى ھۆججەت ساقلاندى)!')
      return
    } catch (err) {
      console.warn('PdfStore save error:', err)
      if (file.size <= MAX_PDF_BYTES) {
        const reader = new FileReader()
        reader.onload = (evt) => {
          b.pdfData = evt.target.result
          saveCustomPdfBooks(list)
          customBooks.value = getCustomPdfBooks()
          closeEditBook()
          toast('✅ PDF كىتابى تەھرىرلەندى (يېڭى ھۆججەت ساقلاندى)!')
        }
        reader.readAsDataURL(file)
        return
      }
    }
  }
  saveCustomPdfBooks(list)
  customBooks.value = getCustomPdfBooks()
  closeEditBook()
  toast('✅ PDF كىتابى تەھرىرلەندى!')
}

async function deleteBook(idx) {
  const b = customBooks.value[idx]
  if (!b) return
  if (!confirm('«' + (b.title || 'بۇ كىتاب') + '» نى كۇتۇپخانىدىن ئۆچۈرەمسىز؟')) return
  if (b.id) await pdfDb.del(b.id)
  const list = getCustomPdfBooks()
  b.removed = true // tombstone keeps defaults from being re-seeded
  const real = list.findIndex(x => x.id === b.id)
  if (real >= 0) list.splice(real, 1)
  list.push(b)
  saveCustomPdfBooks(list)
  customBooks.value = getCustomPdfBooks()
  toast('🗑️ كىتاب كۇتۇپخانىدىن ئۆچۈرۈلدى.')
}
</script>

<template>
  <div>
    <div class="card head-card">
      <div class="card-head">
        <h3>📖 PDF كۇتۇپخانىسى باشقۇرۇش مەركىزى</h3>
        <div class="qa-row">
          <button class="btn btn-teal btn-sm" @click="openAdd">➕ يېڭى PDF كىتاب كىرگۈزۈش</button>
          <a class="btn btn-gold btn-sm" href="#/books" target="_blank" rel="noopener">🔗 PDF كۇتۇپخانىسىنى ئېچىش ↗</a>
        </div>
      </div>
      <p class="hint">دەرسلىك PDF كىتابلىرى ۋە مۇستەقىل قوشۇمچە PDF كىتابلارنى قوشالايسىز، تەھرىرلەيەلەيسىز ياكى ئۆچۈرەلەيسىز. چوڭ ھۆججەتلەر IndexedDB دا ساقلىنىدۇ (يەرلىك سىغىم چېكى يوق).</p>
    </div>

    <!-- مۇستەقىل قوشۇمچە كىتابلار -->
    <div class="card">
      <div class="card-head">
        <h3>📚 قوشۇمچە PDF كىتابلار ({{ customBooks.length }})</h3>
      </div>

      <div v-if="!customBooks.length" class="empty">تېخى قوشۇمچە كىتاب يوق.</div>

      <div v-for="(b, idx) in customBooks" :key="b.id" class="book-row">
        <div class="bk-id"><b>{{ b.id.indexOf('kham') >= 0 ? '📘' : '📕' }}</b></div>
        <div class="bk-main">
          <b>{{ b.title }}</b>
          <small>{{ b.subtitle || b.desc }}</small>
          <small dir="ltr">{{ shorten(resolvePdfUrl(b)) }}</small>
        </div>
        <span class="tbadge b-green">📖 قوشۇمچە كىتاب</span>
        <div class="qa-row bk-actions">
          <button class="btn btn-teal btn-sm" @click="viewBook(b)">👁️ كۆرۈش</button>
          <button class="btn btn-line btn-sm" @click="openEditBook(idx)">✏️ تەھرىرلەش</button>
          <button class="btn btn-red btn-sm" @click="deleteBook(idx)">🗑️</button>
        </div>
      </div>
    </div>

    <!-- دەرسلىك PDF كىتابلىرى -->
    <div class="card">
      <div class="card-head">
        <h3>📄 بارلىق دەرسلىك PDF كىتابلىرى ({{ lessons.length }})</h3>
      </div>

      <div v-if="!lessons.length" class="empty">تېخى كىتاب يوق.</div>

      <div v-for="L in lessons" :key="L.id" class="book-row">
        <div class="bk-id"><b>{{ L.id }}</b></div>
        <div class="bk-main">
          <b>{{ L.title || (L.id + '-دەرس') }}</b>
          <small>{{ L.pdfTitle || (L.id + '-دەرسلىك كىتابى (PDF)') }}</small>
          <small dir="ltr" v-if="pdfUrlOf(L)">{{ shorten(pdfUrlOf(L)) }}</small>
        </div>
        <span class="tbadge" :class="hasPdf(L) ? 'b-green' : 'b-red'">
          {{ hasPdf(L) ? '📄 PDF تەييار' : '⚠️ PDF يوق' }}
        </span>
        <div class="qa-row bk-actions">
          <button v-if="hasPdf(L)" class="btn btn-teal btn-sm" @click="viewLesson(L)">👁️ كۆرۈش</button>
          <button class="btn btn-line btn-sm" @click="editLesson(L)">✏️ تەھرىرلەش</button>
        </div>
      </div>
    </div>

    <!-- ADD NEW PDF BOOK MODAL -->
    <div v-if="showAdd" class="overlay" @click.self="closeAdd">
      <div class="modal add-modal">
        <h3>➕ يېڭى PDF كىتاب كىرگۈزۈش (قوشۇش)</h3>
        <div class="fld">
          <label>كىتاب تۈرى</label>
          <select v-model="typeInp" class="input">
            <option value="extra">📖 پەقەت كۇتۇپخانىغا قوشۇش (مۇستەقىل PDF كىتاب — دەرسلىككە تەسىر كۆرسەتمەيدۇ)</option>
            <option value="lesson">📚 يېڭى دەرسلىك قىلىپ قوشۇش (دەرسلەرگە / سىناقلارغا كىرىدۇ)</option>
          </select>
        </div>
        <div class="fld">
          <label>PDF كىتاب نامى (Title)</label>
          <input v-model="titleInp" class="input" type="text" placeholder="مەسىلەن: ئۇيغۇر تېبابىتى تېراپىيەسى">
        </div>
        <div class="fld">
          <label>قىسقا تېما ئىزاھاتى (Description)</label>
          <input v-model="descInp" class="input" type="text" placeholder="مەسىلەن: تېبابەت تەتقىقاتى ئەسلى PDF كىتابى">
        </div>
        <div class="fld">
          <label>PDF ھۆججىتى تاللاش (.pdf)</label>
          <input ref="fileInp" class="input" type="file" accept="application/pdf">
          <small class="hint">چوڭ ھۆججەتلەر IndexedDB دا ساقلىنىدۇ (سىغىم چېكى يوق). مۇستەقىل كىتابقا ھەر قانداق كۆلەمدە تولىساڭىز بولىدۇ.</small>
        </div>
        <div class="fld">
          <label>ياكى PDF URL / نىسپىي ئادرېسى</label>
          <input v-model="urlInp" class="input" type="text" dir="ltr" placeholder="pdf/lesson-12.pdf ياكى تور ئۇلانمىسى">
        </div>
        <div class="qa-row modal-actions">
          <button class="btn btn-ghost" @click="closeAdd">بىكار قىلىش</button>
          <button class="btn btn-teal" @click="saveNewBook">💾 كۇتۇپخانىغا قوشۇش</button>
        </div>
      </div>
    </div>

    <!-- EDIT EXTRA BOOK MODAL -->
    <div v-if="showEdit" class="overlay" @click.self="closeEditBook">
      <div class="modal add-modal">
        <h3>✏️ مۇستەقىل كىتاب تەھرىرلەش</h3>
        <div class="fld">
          <label>PDF كىتاب نامى (Title)</label>
          <input v-model="editTitle" class="input" type="text">
        </div>
        <div class="fld">
          <label>قىسقا تېما ئىزاھاتى (Description)</label>
          <input v-model="editSub" class="input" type="text">
        </div>
        <div class="fld">
          <label>PDF URL / نىسپىي ئادرېسى</label>
          <input v-model="editUrl" class="input" type="text" dir="ltr">
        </div>
        <div class="fld">
          <label>يېڭى PDF ھۆججەت تاللاش (.pdf) — ئىختىيارى</label>
          <input ref="editFile" class="input" type="file" accept="application/pdf">
        </div>
        <div class="qa-row modal-actions">
          <button class="btn btn-ghost" @click="closeEditBook">بىكار قىلىش</button>
          <button class="btn btn-teal" @click="saveEditedBook">💾 ساقلاش</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.head-card .card-head { align-items: center; }
.hint { display: block; color: var(--muted); font-size: .85rem; margin: .4rem 0 0; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem; margin-bottom: .8rem; flex-wrap: wrap; }
.qa-row { display: flex; flex-wrap: wrap; gap: .5rem; }
.qa-row a { text-decoration: none; }
.empty { text-align: center; color: var(--muted); padding: 1rem; }

.book-row {
  display: flex; align-items: center; gap: .7rem;
  padding: .7rem 0; border-top: 1px dashed var(--line); flex-wrap: wrap;
}
.bk-id { flex: none; width: 40px; height: 46px; border-radius: 10px; background: linear-gradient(160deg, var(--gold), var(--accent-dark)); color: var(--accent-btn-ink); display: grid; place-items: center; box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .25); }
.bk-main { flex: 1 1 200px; min-width: 0; display: flex; flex-direction: column; }
.bk-main b { font-size: .9rem; }
.bk-main small { color: var(--muted); font-size: .74rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bk-actions { margin-inline-start: auto; }

.tbadge { display: inline-block; border-radius: 20px; padding: .28rem .65rem; font-size: .74rem; }
.tbadge.b-green { background: rgba(38, 157, 66, .15); color: #269d42; }
.tbadge.b-red { background: rgba(229, 115, 115, .18); color: #e14d4d; }

.fld { margin-bottom: .75rem; }
.fld label { display: block; font-size: .82rem; font-weight: 800; color: var(--muted); margin-bottom: .3rem; }
.fld .hint { display: block; color: var(--muted); font-size: .76rem; margin-top: .3rem; }
.add-modal { max-width: 540px; }
.modal-actions { justify-content: flex-end; margin-top: .4rem; }
</style>