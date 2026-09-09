<script setup>
import { ref, computed } from 'vue'
import { useProgress } from '../stores/progress'
import { getLessons } from '../data/loader'

const progress = useProgress()
const LESSONS = getLessons()
const q = ref('')
const pdfOnly = ref(false)

function norm(s) {
  return String(s || '')
    .replace(/ي/g, 'ى').replace(/ک/g, 'ك')
    .replace(/[\u200c\u200d\u064b-\u0652]/g, '')
    .replace(/\s+/g, ' ').trim()
}

const filtered = computed(() => {
  const kw = norm(q.value)
  return LESSONS.filter(L => {
    if (pdfOnly.value && !(L.pdfUrl || L.pdfData)) return false
    if (kw && norm(`${L.title} ${L.desc || ''} ${L.id}`).indexOf(kw) < 0) return false
    return true
  })
})
</script>

<template>
  <section>
    <h2 class="pagettl">📚 دەرسلەر</h2>
    <p class="pagesub">تەرتىپ بويىچە ئۆگىنىڭ — نەزەرىيە بۆلەكلەر، ئاتالغۇلار، زېھىن خەرىتىسى ۋە مەشىقلەر</p>

    <div class="sbox">
      <span class="ic-s">🔍</span>
      <input v-model="q" class="input" placeholder="دەرس ئىزدەش… (مەسىلەن: ساقلىقنى ساقلاش، مىزاج، خام دورىلار)">
    </div>

    <div class="filters">
      <button class="btn btn-sm" :class="!pdfOnly ? 'btn-teal' : 'btn-ghost'" @click="pdfOnly = false">ھەممىسى</button>
      <button class="btn btn-sm" :class="pdfOnly ? 'btn-gold' : 'btn-ghost'" @click="pdfOnly = true">PDF كىتابلىق</button>
    </div>

    <div class="llist">
      <RouterLink v-for="L in filtered" :key="L.id" class="lrow" :class="{ done: progress.isRead(L.id) }" :to="'/lesson/' + L.id">
        <div class="lnum">{{ progress.isRead(L.id) ? '✓' : L.id }}</div>
        <div class="linfo">
          <b>{{ L.id }}-دەرس: {{ L.title }}</b>
          <small>{{ L.desc || '' }}</small>
          <div class="lmeta">
            <span class="badge">{{ L.quiz.length }} سوئال</span>
            <span v-if="progress.bestFor(L.id) != null" class="badge" :class="{ done: progress.bestFor(L.id) >= 60 }">%{{ progress.bestFor(L.id) }}</span>
            <span v-if="progress.isRead(L.id)" class="badge done">ئوقۇلغان</span>
          </div>
        </div>
        <span class="lgo">‹</span>
      </RouterLink>
      <p v-if="!filtered.length" class="muted empty">ھېچقانداق دەرس تېپىلمىدى.</p>
    </div>
  </section>
</template>

<style scoped>
.filters { display: flex; gap: 8px; margin: 12px 0 4px; }
.llist { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.lrow {
  display: flex; align-items: center; gap: 12px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  padding: 13px 14px; box-shadow: var(--shadow);
  transition: transform .14s ease, border-color .2s ease;
}
.lrow:active { transform: scale(.985); }
.lrow.done { border-color: rgba(30,142,77,.5); }
.lnum {
  flex: none; width: 42px; height: 42px; border-radius: 13px;
  display: grid; place-items: center;
  background: linear-gradient(135deg, var(--teal), var(--teal-deep)); color: #fff; font-weight: 800; font-size: 1.05rem;
}
.lrow.done .lnum { background: linear-gradient(135deg, var(--green), #14683a); }
.linfo { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.linfo b { font-size: .93rem; line-height: 1.35; }
.linfo small { color: var(--muted); font-size: .78rem; margin: 2px 0 6px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; }
.lmeta { display: flex; gap: 6px; flex-wrap: wrap; }
.badge { font-size: .68rem; font-weight: 700; padding: 2px 9px; border-radius: 999px; background: var(--card-2); color: var(--muted); border: 1px solid var(--line); }
.badge.done { background: rgba(30,142,77,.14); color: var(--green); border-color: transparent; }
.lgo { color: var(--teal); font-size: 1.3rem; font-weight: 800; }
.empty { text-align: center; padding: 2rem .5rem; }
</style>