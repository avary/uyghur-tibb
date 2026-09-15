<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useProgress } from '../stores/progress'
import { LEARNING_PATHS, pathProgress, pathLessons } from '../data/paths'

const progress = useProgress()
const paths = computed(() => LEARNING_PATHS.map(path => ({ ...path, stats: pathProgress(path, progress), lessons: pathLessons(path) })))
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[ch])) }
function printCertificate(path) {
  const name = progress.user?.name || 'ئۆگەنگۈچى'
  const date = new Date().toLocaleDateString()
  const w = window.open('', '_blank', 'width=720,height=540,noopener,noreferrer')
  if (!w) return
  w.document.write(`<html dir="rtl"><head><title>ئۆگىنىش گۇۋاھنامىسى</title><style>body{font-family:serif;text-align:center;padding:70px;color:#173b36}h1{font-size:32px}h2{font-size:25px;color:#187b70}p{font-size:18px;line-height:1.8}.seal{font-size:50px;margin:25px}</style></head><body><div class="seal">🏅</div><h1>ئۆگىنىش گۇۋاھنامىسى</h1><p>بۇ گۇۋاھنامە</p><h2>${escapeHtml(name)}</h2><p>«${escapeHtml(path.title)}» ئۆگىنىش يولىنى تولۇق تاماملىغانلىقىنى خاتىرىلەيدۇ.</p><p>${escapeHtml(date)}</p><small>ئۆگىنىش مەقسىتىدىكى يەرلىك گۇۋاھنامە — كەسپىي ئىجازەت ياكى داۋالاش سالاھىيىتى ئەمەس.</small><script>window.onload=()=>window.print()<\/script></body></html>`)
  w.document.close()
}
</script>

<template>
  <section>
    <RouterLink to="/" class="back">‹ باش بەتكە قايتىش</RouterLink>
    <h2 class="pagettl">🧭 يېتەكلەنگەن ئۆگىنىش يوللىرى</h2>
    <p class="pagesub">قەدەممۇ-قەدەم مېڭىپ، ھەر باسقۇچنى ئۆز ئىگىلىكىڭىزگە ئېلىڭ.</p>
    <div class="path-grid">
      <article v-for="path in paths" :key="path.id" class="card path-card">
        <h3>{{ path.title }}</h3>
        <p class="muted">{{ path.description }}</p>
        <div class="path-progress" role="progressbar" :aria-label="path.title + ' تاماملىنىش نىسبىتى'" :aria-valuenow="path.stats.percent" aria-valuemin="0" aria-valuemax="100"><i :style="{ width: path.stats.percent + '%' }"></i></div>
        <div class="path-meta"><span>{{ path.stats.done }}/{{ path.stats.total }} دەرس</span><b>%{{ path.stats.percent }}</b></div>
        <button v-if="path.stats.percent === 100" class="btn btn-teal btn-sm certificate" @click="printCertificate(path)">🏅 گۇۋاھنامە بېسىش</button>
        <div class="path-lessons">
          <RouterLink v-for="lesson in path.lessons" :key="lesson.id" :to="'/lesson/' + lesson.id" class="path-lesson">
            <span>{{ progress.isRead(lesson.id) ? '✓' : lesson.id }}</span>{{ lesson.title }}
          </RouterLink>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.path-grid { display:grid; gap:1rem; }
.path-card h3 { margin-bottom:.35rem; }
.path-progress { height:8px; background:var(--surface); border-radius:99px; overflow:hidden; margin:1rem 0 .4rem; }
.path-progress i { display:block; height:100%; background:var(--teal); border-radius:inherit; }
.path-meta { display:flex; justify-content:space-between; font-size:.82rem; color:var(--muted); }
.path-lessons { display:grid; gap:.35rem; margin-top:.8rem; }
.path-lesson { display:flex; gap:.5rem; align-items:center; padding:.45rem .55rem; border-radius:8px; background:var(--surface); color:inherit; text-decoration:none; font-size:.88rem; }
.path-lesson span { color:var(--teal); font-weight:700; min-width:1.2rem; }
</style>
