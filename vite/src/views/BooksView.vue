<script setup>
import { computed } from 'vue'
import { useProgress } from '../stores/progress'
import { getLessons } from '../data/loader'

const LESSONS = getLessons()
const progress = useProgress()
const books = computed(() => LESSONS.filter(L => L.pdfUrl || L.pdfData))
</script>

<template>
  <section>
    <h2 class="pagettl">📖 PDF كۇتۇپخانىسى</h2>
    <p class="pagesub">تۇلۇق دەرسلىك PDF كىتابلىرى — تېلېفون ياكى كومپيۇتېردا ئوقۇڭ</p>

    <div class="book-grid">
      <a
        v-for="L in books"
        :key="L.id"
        class="book"
        :href="L.pdfUrl || L.pdfData"
        target="_blank"
        rel="noopener"
      >
        <div class="book-cover"><b>{{ L.id }}</b></div>
        <div class="book-info">
          <b>{{ L.id }}-دەرس: {{ L.title }}</b>
          <small>{{ L.pdfTitle || L.desc }}</small>
        </div>
        <span class="book-btn">PDF</span>
      </a>
    </div>

    <p v-if="!books.length" class="muted" style="text-align:center;padding:2rem">كىتابلار تېپىلمىدى.</p>
  </section>
</template>

<style scoped>
.book-grid { display: flex; flex-direction: column; gap: 10px; }
.book {
  display: flex; align-items: center; gap: 12px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 12px 14px; box-shadow: var(--shadow);
  transition: transform .14s ease, border-color .2s ease;
}
.book:active { transform: scale(.985); }
.book-cover {
  flex: none; width: 46px; height: 60px; border-radius: 8px;
  background: linear-gradient(160deg, var(--gold), #a8861c);
  color: #2e2200; font-weight: 900; font-size: 1.1rem;
  display: grid; place-items: center;
  box-shadow: inset 0 0 0 2px rgba(255,255,255,.25);
}
.book-info { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.book-info b { font-size: .9rem; line-height: 1.35; }
.book-info small { color: var(--muted); font-size: .75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-btn { flex: none; font-size: .72rem; font-weight: 800; color: var(--teal); background: var(--teal-light); border-radius: 10px; padding: .4rem .7rem; }
[data-theme="dark"] .book-btn { color: var(--teal); }
</style>