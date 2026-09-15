<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useProgress } from '../stores/progress'
import { LEARNING_PATHS, pathProgress, pathLessons } from '../data/paths'

const progress = useProgress()
const paths = computed(() => LEARNING_PATHS.map(path => ({ ...path, stats: pathProgress(path, progress), lessons: pathLessons(path) })))
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
        <div class="path-progress"><i :style="{ width: path.stats.percent + '%' }"></i></div>
        <div class="path-meta"><span>{{ path.stats.done }}/{{ path.stats.total }} دەرس</span><b>%{{ path.stats.percent }}</b></div>
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
