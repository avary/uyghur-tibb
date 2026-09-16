<script setup>
import { computed, ref } from 'vue'
import { getLessons } from '../data/loader'
import { useToast } from '../composables/toast'
import { openPdfViewer } from '../composables/pdfViewer'
import {
  getCustomPdfBooks,
  resolvePdfUrl,
  dataUrlToBlobUrl,
  bookSource
} from '../data/books'
import { FARHIZ_BOOK } from '../data/farhiz'
import { MIZAJ_BOOK } from '../data/mizaj'

const LESSONS = getLessons()
const { toast } = useToast()
const q = ref('')

const lessonBooks = computed(() => LESSONS.filter(L => L.pdfUrl || L.pdfData))
const extraBooks = computed(() => getCustomPdfBooks())

const items = computed(() => {
  const term = q.value.toLowerCase().trim()
  const rows = ([]).concat(
    lessonBooks.value
      .filter(L => {
        if (!term) return true
        return [L.id, L.title, L.subtitle, L.pdfTitle].join(' ').toLowerCase().indexOf(term) >= 0
      })
      .map(L => ({ kind: 'lesson', item: L }))
  ).concat(
    extraBooks.value
      .filter(b => {
        if (!term) return true
        return [b.title, b.subtitle, b.pdfTitle].join(' ').toLowerCase().indexOf(term) >= 0
      })
      .map(b => ({ kind: 'book', item: b }))
  )
  if (FARHIZ_BOOK && (!term || [FARHIZ_BOOK.title, FARHIZ_BOOK.subtitle].join(' ').toLowerCase().includes(term))) rows.push({ kind: 'farhiz', item: FARHIZ_BOOK })
  if (MIZAJ_BOOK && (!term || [MIZAJ_BOOK.title, MIZAJ_BOOK.subtitle].join(' ').toLowerCase().includes(term))) rows.push({ kind: 'mizaj', item: MIZAJ_BOOK })
  return rows
})

async function openBook(row) {
  const { kind, item } = row
  try {
    if (kind === 'farhiz' || kind === 'mizaj') {
      window.location.hash = kind === 'mizaj' ? '#/mizaj' : '#/farhiz'
    } else if (kind === 'book') {
      const src = await bookSource(item)
      if (!src) return toast('⚠️ كىتاب ھۆججىتى تېپىلمىدى.', 'err')
      openPdfViewer(src, item.title || 'PDF كىتابى')
    } else {
      const idNum = parseInt(item.id, 10)
      const src = item.pdfData && item.pdfData.indexOf('data:') === 0
        ? dataUrlToBlobUrl(item.pdfData)
        : resolvePdfUrl(idNum >= 1 && idNum <= 11 ? { ...item, id: idNum } : item)
      if (!src || src === '#') return toast('⚠️ كىتاب ھۆججىتى تېپىلمىدى.', 'err')
      openPdfViewer(src, item.pdfTitle || item.title || (item.id + '-دەرس كىتابى'))
    }
  } catch (e) {
    toast('⚠️ كىتابنى ئېچىشتا خاتالىق — قايتا سىناڭ.', 'err')
  }
}
</script>

<template>
  <section>
    <h2 class="pagettl">📖 PDF كۇتۇپخانىسى</h2>
    <p class="pagesub">تۇلۇق دەرسلىك PDF كىتابلىرى ۋە قوشۇمچە تېبابەت كىتابلىرى — تېلېفون ياكى كومپيۇتېردا ئوقۇڭ</p>

    <div class="search">
      <input
        v-model="q"
        class="input"
        type="search"
        placeholder="🔍 كىتاب نامى ياكى دەرس نۇمۇرى بويىچە ئىزدەش..."
      >
    </div>

    <div class="book-grid">
      <div v-for="row in items" :key="(row.kind === 'lesson' ? 'L' : 'B') + row.item.id" class="book">
        <div class="book-cover" :class="{ extra: row.kind === 'book' }">
          <span v-if="row.kind === 'lesson'"><b>{{ row.item.id }}</b></span>
          <span v-else>📘</span>
        </div>
        <div class="book-info">
          <span class="tbadge" :class="row.kind === 'lesson' ? 'b-lesson' : 'b-extra'">
            {{ row.kind === 'lesson' ? '📄 دەرسلىك كىتابى' : row.kind === 'mizaj' ? '🧭 مىزاج ئۆگىنىش كىتابى' : row.kind === 'farhiz' ? '📘 OCR ئۆگىنىش كىتابى' : '📖 قوشۇمچە كىتاب' }}
          </span>
          <b>{{ row.kind === 'lesson' ? (row.item.id + '-دەرس: ' + row.item.title) : row.item.title }}</b>
          <small>{{ row.kind === 'farhiz' || row.kind === 'mizaj' ? `${row.item.pages.length} بەت · ${row.item.sections?.length || 0} بۆلەك · ئىزدەش ۋە quiz${row.item.canonicalOf ? ' · مىزاج بىلەن ئوخشاش مەزمۇن' : ''}` : (row.item.pdfTitle || row.item.subtitle || row.item.desc) }}</small>
        </div>
        <div class="book-actions">
          <button class="btn btn-teal" @click="openBook(row)">📖 ئوقۇش</button>
          <a
            class="btn btn-ghost"
            :href="row.kind === 'farhiz' ? '#/farhiz' : row.kind === 'mizaj' ? '#/mizaj' : row.item.pdfData && row.item.pdfData.indexOf('data:') === 0 ? row.item.pdfData : resolvePdfUrl(row.item)"
            target="_blank"
            rel="noopener"
            title="يېڭى كۆزنەكتە ئېچىش"
          >↗</a>
        </div>
      </div>
    </div>

    <p v-if="!items.length" class="muted" style="text-align:center;padding:2rem">كىتابلار تېپىلمىدى.</p>
  </section>
</template>

<style scoped>
.search { margin: .2rem 0 1rem; }
.search .input { width: 100%; }

.book-grid { display: flex; flex-direction: column; gap: 10px; }

.book {
  display: flex; align-items: center; gap: 12px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 12px 14px; box-shadow: var(--shadow);
}
.book-cover {
  flex: none; width: 46px; height: 60px; border-radius: 8px;
  background: linear-gradient(160deg, var(--gold), var(--accent-dark));
  color: var(--accent-btn-ink); font-weight: 900; font-size: 1.1rem;
  display: grid; place-items: center;
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, .25);
}
.book-cover.extra { background: linear-gradient(160deg, var(--teal), var(--brand-dark)); }
.book-cover.extra span { font-size: 1.35rem; }

.book-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.book-info b { font-size: .9rem; line-height: 1.35; }
.book-info small { color: var(--muted); font-size: .75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.tbadge { display: inline-block; width: fit-content; border-radius: 20px; padding: .12rem .55rem; font-size: .68rem; }
.b-lesson { background: rgba(var(--accent-rgb), .16); color: var(--accent-ink); }
.b-extra { background: var(--teal-light); color: var(--teal-dark); }

.book-actions { flex: none; display: flex; gap: .4rem; align-items: center; }
.book-actions a { text-decoration: none; }
</style>
