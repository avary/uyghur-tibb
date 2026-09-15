<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProgress } from '../stores/progress'
import { lessonById } from '../data/loader'
import { useToast } from '../composables/toast'
import { sanitizeHtml } from '../utils/sanitize'
import { useLocale } from '../composables/locale'

const props = defineProps({ id: { type: [String, Number], required: true } })
const progress = useProgress()
const route = useRoute()
const { toast } = useToast()
const locale = useLocale()

const preview = computed(() => route.query.preview === '1')
const lesson = computed(() => lessonById(props.id, preview.value))
function textFor(value, field) { return value?.translations?.[locale.current.value]?.[field] || value?.[field] || '' }
const showMind = ref(false)

onMounted(() => {
  if (lesson.value) {
    progress.markRead(lesson.value.id)
    progress.trackActivity('lessonsOpened')
    progress.saveLast(lesson.value.id)
  }
})

function goQuiz() {
  if (lesson.value) progress.saveLast(lesson.value.id)
  toast('مەشىق باشلاندى!')
}

function mediaUrl(value) {
  const url = String(value || '').trim()
  if (!url || /^(javascript|data|vbscript):/i.test(url)) return ''
  return url
}
</script>

<template>
  <section v-if="lesson">
    <div v-if="preview && lesson.status === 'draft'" class="preview-banner">👁️ بۇ تەھرىرلىگۈچىنىڭ ئالدىن كۆرۈشى — بۇ دەرس تېخى ئوقۇغۇچىلارغا ئېلان قىلىنمىدى.</div>
    <div class="hero">
      <div class="hero-top">
        <span class="pill teal">{{ lesson.id }}-دەرس</span>
        <span class="pill gold">{{ lesson.quiz.length }} سوئال</span>
      </div>
      <h1>{{ textFor(lesson, 'title') }}</h1>
      <p v-if="textFor(lesson, 'subtitle')" class="hero-sub">{{ textFor(lesson, 'subtitle') }}</p>
      <div class="hero-actions">
        <RouterLink class="btn btn-gold btn-sm" :to="'/lesson/' + lesson.id + '/quiz'" @click="goQuiz">📝 مەشىق باشلاش</RouterLink>
        <a
          v-if="lesson.pdfUrl"
          class="btn btn-ghost btn-sm"
          :href="lesson.pdfUrl"
          target="_blank"
          rel="noopener"
        >📖 PDF (تولۇق)</a>
      </div>
    </div>

    <div v-if="lesson.goals && lesson.goals.length" class="goal card">
      <div class="secttl">🎯 بۇ دەرستە تۆۋەندىكىلەرنى ئۆگىنىسىز</div>
      <ul>
        <li v-for="(g, i) in lesson.goals" :key="i">{{ g }}</li>
      </ul>
    </div>

    <div v-if="lesson.media && lesson.media.length" class="media-grid">
      <figure v-for="(item, i) in lesson.media" :key="i" class="media-card card">
        <img v-if="item.type === 'image' && mediaUrl(item.url)" :src="mediaUrl(item.url)" :alt="item.alt || lesson.title">
        <audio v-else-if="item.type === 'audio' && mediaUrl(item.url)" controls :src="mediaUrl(item.url)"></audio>
        <video v-else-if="item.type === 'video' && mediaUrl(item.url)" controls preload="metadata" :src="mediaUrl(item.url)"></video>
        <figcaption v-if="item.caption">{{ item.caption }}</figcaption>
      </figure>
    </div>

    <button class="mind-toggle" @click="showMind = !showMind">🧠 زېھىن خەرىتىسى {{ showMind ? '— يېپىش' : '— ئېچىش' }}</button>
    <div v-if="showMind && lesson.mindmap" class="mind card">
      <TreeItem :node="lesson.mindmap" />
    </div>

    <article v-for="(sec, i) in lesson.sections" :key="i" class="sec card">
      <h3>{{ sec.h }}</h3>
      <div class="lesson-body" v-html="sanitizeHtml(sec.body)"></div>
      <div v-if="sec.media && sec.media.length" class="media-grid section-media">
        <figure v-for="(item, j) in sec.media" :key="j" class="media-card">
          <img v-if="item.type === 'image' && mediaUrl(item.url)" :src="mediaUrl(item.url)" :alt="item.alt || sec.h">
          <audio v-else-if="item.type === 'audio' && mediaUrl(item.url)" controls :src="mediaUrl(item.url)"></audio>
          <video v-else-if="item.type === 'video' && mediaUrl(item.url)" controls preload="metadata" :src="mediaUrl(item.url)"></video>
          <figcaption v-if="item.caption">{{ item.caption }}</figcaption>
        </figure>
      </div>
      <details v-if="sec.points && sec.points.length" class="points">
        <summary>⭐ مۇھىم نۇقتىلار</summary>
        <ul><li v-for="(p, j) in sec.points" :key="j">{{ p }}</li></ul>
      </details>
    </article>

    <div class="end-actions">
      <RouterLink class="btn btn-teal btn-block" :to="'/lesson/' + lesson.id + '/quiz'">📝 بۇ دەرسنىڭ مەشىقىنى ئىشلەش</RouterLink>
      <RouterLink class="btn btn-ghost btn-block" :to="'/lessons'">← دەرسلەر تىزىملىكىگە</RouterLink>
    </div>
  </section>

  <section v-else class="notfound">
    <p>دەرس تېپىلمىدى.</p>
    <RouterLink class="btn btn-teal btn-sm" to="/lessons">دەرسلەرگە قايتىش</RouterLink>
  </section>
</template>

<script>
import { defineComponent, h } from 'vue'
const TreeItem = defineComponent({
  name: 'TreeItem',
  props: { node: { type: Object, required: true } },
  render() {
    const node = this.node
    const kids = (node.c || []).map(k => h(TreeItem, { node: k, key: k.t }))
    return h('div', { class: 'mind-node' }, [
      h('div', { class: 'mind-t' }, node.t),
      ...(kids.length ? [h('div', { class: 'mind-kids' }, kids)] : [])
    ])
  }
})
export default { components: { TreeItem } }
</script>

<style scoped>
.hero {
  padding: 20px 18px; border-radius: var(--radius);
  background: linear-gradient(135deg, var(--teal), var(--teal-deep));
  color: #fff; box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; gap: 10px;
}
.preview-banner { margin-bottom: 10px; padding: .65rem .8rem; border: 1px solid var(--gold); border-radius: var(--radius); background: var(--gold-soft); color: var(--ink); font-size: .8rem; }
.hero-top { display: flex; gap: 8px; }
.hero h1 { font-size: 1.28rem; line-height: 1.35; }
.hero-sub { font-size: .82rem; opacity: .9; }
.hero-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 4px; }

.goal ul { margin: 0; padding-inline-start: 1.2rem; }
.goal li { margin-bottom: 6px; font-size: .9rem; }

.mind-toggle {
  margin-top: 16px; width: 100%;
  background: linear-gradient(135deg, var(--gold), var(--accent-dark)); color: var(--accent-btn-ink);
  border: none; border-radius: 13px; padding: .7rem; font-weight: 800; font-size: .9rem; cursor: pointer;
}
.mind { margin-top: 10px; }

.sec { margin-top: 16px; }
.media-grid { display:grid; gap:10px; margin-top:16px; }
.media-card { margin:0; overflow:hidden; }
.media-card img, .media-card video { display:block; width:100%; max-height:360px; object-fit:contain; background:var(--card-2); }
.media-card audio { width:100%; }
.media-card figcaption { padding:.5rem .7rem; color:var(--muted); font-size:.8rem; }
.section-media { margin-top:12px; }
.sec h3 { font-size: 1.08rem; margin-bottom: 12px; color: var(--teal-dark); display: flex; align-items: center; gap: .5rem; }
[data-theme="dark"] .sec h3 { color: var(--teal); }
.sec h3::before { content: "◈"; color: var(--gold); }

.points { margin-top: 14px; }
.points summary {
  cursor: pointer; font-weight: 800; font-size: .84rem; color: var(--gold);
  background: var(--gold-soft); border-radius: 10px; padding: 8px 12px; user-select: none;
}
.points ul { margin: 10px 0 0; padding-inline-start: 1.2rem; }
.points li { font-size: .88rem; margin-bottom: 5px; }

.end-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 22px; }
.notfound { text-align: center; padding: 3rem 1rem; display: flex; flex-direction: column; gap: 14px; align-items: center; }

.mind-node { display: flex; flex-direction: column; gap: 8px; }
.mind-t {
  background: var(--card-2); border: 1px solid var(--line); border-radius: 12px;
  padding: 10px 14px; font-weight: 700; font-size: .88rem;
}
.mind-kids { display: flex; flex-direction: column; gap: 6px; padding-inline-start: 16px; border-inline-start: 2px dashed var(--line); }
</style>
