<script setup>
import { ref, computed } from 'vue'
import { useContent } from '../../stores/content'
import { useToast } from '../../composables/toast'

// PDF كۇتۇپخانىسى باشقۇرۇش مەركىزى — v41/v42 port (admin PDF books table +
// custom PDF book upload). Every change lands in uytibb_custom_lessons through
// the content store, so the learner app's BooksView/LessonView pick it up.

const emit = defineEmits(['edit'])
const store = useContent()
store.init()
const { toast } = useToast()

const MAX_PDF_BYTES = 2 * 1024 * 1024

const lessons = computed(() => store.lessons)

function hasPdf(L) {
  return !!(L && (L.pdfUrl || L.pdfData))
}
function pdfUrlOf(L) {
  return (L && (L.pdfData || L.pdfUrl)) || ''
}
function shorten(u) {
  return u.length > 40 ? u.slice(0, 40) + '…' : u
}

const showAdd = ref(false)
const titleInp = ref('')
const descInp = ref('')
const urlInp = ref('')
const fileInp = ref(null)

function openAdd() {
  titleInp.value = ''
  descInp.value = ''
  urlInp.value = ''
  if (fileInp.value) fileInp.value.value = ''
  showAdd.value = true
}
function closeAdd() { showAdd.value = false }

function editLesson(L) {
  store.currentLessonId = L.id
  emit('edit', L.id)
}

function saveNewBook() {
  const title = titleInp.value.trim()
  const desc = descInp.value.trim()
  const url = urlInp.value.trim()
  const file = fileInp.value && fileInp.value.files && fileInp.value.files[0] ? fileInp.value.files[0] : null

  if (!title) {
    toast('⚠️ كىتاب نامىنى يېزىڭ!', 'err')
    return
  }

  const ids = store.lessons.map(l => Number(l.id) || 0)
  const newId = ids.length ? Math.max.apply(null, ids) + 1 : 1

  const newLesson = {
    id: newId,
    title: title,
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
    if (file.type !== 'application/pdf' && !/\.pdf$/i.test(file.name)) {
      toast('⚠️ پەقەت PDF ھۆججەت تاللىيالايسىز!', 'err')
      return
    }
    if (file.size > MAX_PDF_BYTES) {
      toast('⚠️ PDF ھۆججەت ' + Math.round(MAX_PDF_BYTES / 1024 / 1024) + 'MB دىن چوڭ بولماسلىقى كېرەك.', 'err')
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
      <p class="hint">بارلىق دەرسلىكلەرنىڭ PDF كىتابلىرىنىڭ ھالىتىنى تەكشۈرەلەيسىز، يېڭى PDF كىتاب كىرگۈزەلەيسىز ياكى تەھرىرلەيەلەيسىز.</p>
    </div>

    <div class="card">
      <div class="card-head">
        <h3>📚 بارلىق دەرسلىك PDF كىتابلىرى ({{ lessons.length }})</h3>
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
          <a
            v-if="hasPdf(L)"
            class="btn btn-teal btn-sm"
            :href="pdfUrlOf(L)"
            target="_blank"
            rel="noopener"
          >👁️ كۆرۈش</a>
          <button class="btn btn-line btn-sm" @click="editLesson(L)">✏️ تەھرىرلەش</button>
        </div>
      </div>
    </div>

    <!-- ADD NEW PDF BOOK MODAL -->
    <div v-if="showAdd" class="overlay" @click.self="closeAdd">
      <div class="modal add-modal">
        <h3>➕ يېڭى PDF كىتاب كىرگۈزۈش (قوشۇش)</h3>
        <div class="fld">
          <label>PDF كىتاب نامى (Title)</label>
          <input v-model="titleInp" class="input" type="text" placeholder="مەسىلەن: 12-دەرسلىك: ئۇيغۇر تېبابىتى تېراپىيەسى">
        </div>
        <div class="fld">
          <label>قىسقا تېما ئىزاھاتى (Description)</label>
          <input v-model="descInp" class="input" type="text" placeholder="مەسىلەن: تېبابەت تەتقىقاتى ئەسلى PDF كىتابى">
        </div>
        <div class="fld">
          <label>PDF ھۆججىتى تاللاش (.pdf)</label>
          <input ref="fileInp" class="input" type="file" accept="application/pdf">
          <small class="hint">تېلېفون ياكى كومپيوتېرىڭىزدىن ھەر قانداق .pdf ھۆججەتنى تاللىسىڭىز بولىدۇ. (ئەڭ چوڭ: 2MB)</small>
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
.bk-id { flex: none; width: 40px; height: 46px; border-radius: 10px; background: linear-gradient(160deg, var(--gold), #a8861c); color: #2e2200; display: grid; place-items: center; box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .25); }
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