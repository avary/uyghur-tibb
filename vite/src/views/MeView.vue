<script setup>
import { computed } from 'vue'
import { useProgress } from '../stores/progress'
import { getLessons, countQuestions } from '../data/loader'

const progress = useProgress()
const LESSONS = getLessons()
const totalQ = countQuestions()
const autoQ = countQuestions(q => q.type !== 'essay')

const wrongCount = computed(() => progress.wrong.length)
const bestAvg = computed(() => {
  const vals = LESSONS.map(L => progress.bestFor(L.id)).filter(v => v != null)
  if (!vals.length) return 0
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
})
</script>

<template>
  <section>
    <h2 class="pagettl">👤 مەن</h2>

    <div class="me hero">
      <div class="mh-logo"><img src="/icon.svg" alt=""></div>
      <div class="mh-info">
        <b>{{ progress.user?.name || 'ئەزا' }}</b>
        <small v-if="progress.user?.phone">تېلېفون: {{ progress.user.phone }}</small>
        <small v-else class="muted">تىزىملىتىپ ئەپتىن تولۇق پايدىلىنىڭ</small>
      </div>
      <button class="btn btn-gold btn-sm" @click="$router.push('/me')">تىزىملىتىش</button>
    </div>

    <div class="stat-grid">
      <RouterLink to="/lessons" class="stat">
        <b>{{ progress.lessonsRead }}/{{ LESSONS.length }}</b><span>دەرس ئوقۇدى</span>
        <i :style="{ width: progress.pctRead + '%' }"></i>
      </RouterLink>
      <RouterLink to="/exam" class="stat">
        <b>{{ progress.exams.length }}</b><span>سىناق ئىشلىدى</span>
      </RouterLink>
      <RouterLink to="/me" class="stat">
        <b>{{ autoQ }}</b><span>ئاپتومات سوئال</span>
      </RouterLink>
      <RouterLink to="/me" class="stat">
        <b>🔥{{ progress.streak.n || 0 }}</b><span>كۈن داۋام</span>
        <small v-if="progress.streak.best" class="sub">ئەڭ ياخشى: {{ progress.streak.best }}</small>
      </RouterLink>
    </div>

    <!-- wrong answers -->
    <div class="secttl">❌ خاتا سوئاللىرىم ({{ wrongCount }})</div>
    <div v-if="progress.wrong.length" class="wlist">
      <div v-for="(w, i) in progress.wrong" :key="i" class="w card">
        <div class="w-top"><b>{{ w.q }}</b><span class="pill">{{ w.type }}</span></div>
        <div class="muted" style="font-size:.82rem">{{ w.exp || w.model }}</div>
        <button class="btn btn-ghost btn-sm" style="align-self:flex-start" @click="progress.removeWrong(w)">✓ بىلىپ قويدۇم</button>
      </div>
    </div>
    <p v-else class="muted" style="text-align:center;padding:1rem">خاتا سوئال يوق — جۇدە ئوبدان! 🌟</p>

    <div class="secttl">📊 ئومۇمىي ئەھۋال</div>
    <div class="stats-lines">
      <div class="line"><span>دەرس تاماملاش</span><b>%{{ progress.pctRead }}</b></div>
      <div class="line"><span>ئوتتۇرىچە يۇقىرى نەتىجە</span><b>%{{ bestAvg }}</b></div>
    </div>
  </section>
</template>

<style scoped>
.hero {
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, var(--teal), var(--teal-deep)); color: #fff;
  border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-lg);
}
.mh-logo { width: 54px; height: 54px; border-radius: 15px; background: var(--card); display: grid; place-items: center; overflow: hidden; }
.mh-logo img { width: 50px; height: 50px; }
.mh-info { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.35; }
.mh-info b { font-size: 1.05rem; }
.mh-info small { font-size: .78rem; opacity: .9; }
.stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px; }
.stat {
  position: relative; display: flex; flex-direction: column; gap: 3px;
  background: var(--card); border: 1px solid var(--line); border-radius: var(--radius-sm);
  padding: 14px; box-shadow: var(--shadow); overflow: hidden;
}
.stat b { font-size: 1.35rem; color: var(--teal-dark); }
[data-theme="dark"] .stat b { color: var(--teal); }
.stat span { font-size: .76rem; color: var(--muted); }
.stat > i { position: absolute; right: 0; bottom: 0; height: 4px; background: linear-gradient(90deg, var(--gold), var(--teal)); border-radius: 4px 0 0 0; transition: width .5s ease; }
.sub { font-size: .72rem; color: var(--muted); }
.wlist { display: flex; flex-direction: column; gap: 10px; }
.w { display: flex; flex-direction: column; gap: 8px; }
.w-top { display: flex; justify-content: space-between; gap: 10px; align-items: flex-start; }
.w-top b { font-size: .9rem; line-height: 1.4; }
.stats-lines { display: flex; flex-direction: column; gap: 8px; }
.line { display: flex; justify-content: space-between; background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 12px 14px; font-size: .88rem; box-shadow: var(--shadow); }
.line b { color: var(--teal-dark); }
[data-theme="dark"] .line b { color: var(--teal); }
</style>