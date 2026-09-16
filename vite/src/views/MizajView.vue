<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { MIZAJ_BOOK, mizajSections, searchMizaj, mizajQuiz } from '../data/mizaj'
import { markTopicStudied, toggleTopicSaved, topicProgress } from '../data/topicProgress'
import { relatedHerbs, relatedRecipes } from '../data/bookLinks'
const q = ref(''); const selected = ref(null); const showQuiz = ref(false); const reader = ref(null)
const route = useRoute()
const pages = computed(() => searchMizaj(q.value))
const sections = computed(() => mizajSections().slice(0, 60))
const selectedState = computed(() => selected.value ? topicProgress(selected.value.id) : {})
const linkedRecipes = computed(() => relatedRecipes(selected.value))
const linkedHerbs = computed(() => relatedHerbs(selected.value))
function openPage(page) { selected.value = page; showQuiz.value = false; requestAnimationFrame(() => reader.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
function openSection(section) { selected.value = section; q.value = ''; showQuiz.value = false; requestAnimationFrame(() => reader.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
function movePage(delta) { const i = MIZAJ_BOOK.pages.findIndex(page => page.pageNumber === selected.value?.pageNumber); openPage(MIZAJ_BOOK.pages[Math.max(0, Math.min(MIZAJ_BOOK.pages.length - 1, i + delta))]) }
function startQuiz() { showQuiz.value = true; selected.value = null }
onMounted(() => { const section = MIZAJ_BOOK.sections?.find(item => item.id === route.query.section); if (section) openSection(section) })
function saveTopic() { toggleTopicSaved(selected.value.id); selected.value = { ...selected.value } }
function studyTopic() { markTopicStudied(selected.value.id); selected.value = { ...selected.value } }
</script>
<template>
  <section v-if="MIZAJ_BOOK">
    <RouterLink to="/books" class="back">‹ كىتابلارغا قايتىش</RouterLink>
    <h2 class="pagettl">🧭 {{ MIZAJ_BOOK.title }}</h2>
    <p class="pagesub">{{ MIZAJ_BOOK.subtitle }} · {{ MIZAJ_BOOK.pages.length }} بەت</p>
    <div class="notice">⚠️ بۇ مەنبە ئۆگىنىش ۋە تارىخىي بىلىم ئۈچۈندۇر؛ كېسەللىك ياكى پەرھىز قارارىنى مۇتەخەسسىس بىلەن مەسلىھەتلىشىپ چىقىڭ.</div>
    <div class="actions"><button class="btn btn-teal" @click="startQuiz">📝 بۆلەك تېمىلىرى بويىچە quiz ({{ mizajQuiz().length }})</button></div>
    <div v-if="selected" ref="reader" class="reader card"><div class="reader-head"><div><h3>{{ selected.title }}</h3><small>{{ selected.startPage }}–{{ selected.endPage }}-بەت</small></div><button class="btn btn-ghost btn-sm" @click="selected = null">×</button></div><article>{{ selected.text || 'بوش بەت' }}</article><div class="reader-actions"><button class="btn btn-teal" @click="saveTopic">{{ selectedState.saved ? '★ ساقلانغان' : '☆ ساقلاش' }}</button><button class="btn btn-ghost" @click="studyTopic">{{ selectedState.studied ? '✓ ئۆگىنىلدى' : 'ئۆگىنىلدى دەپ بەلگىلەش' }}</button></div><div v-if="linkedRecipes.length || linkedHerbs.length" class="links"><h4>🔗 مۇناسىۋەتلىك مەزمۇن</h4><RouterLink v-for="r in linkedRecipes" :key="r.id" :to="'/recipe/' + r.id">🌿 {{ r.disease }}</RouterLink><RouterLink v-for="h in linkedHerbs" :key="h.name" :to="'/herb/' + encodeURIComponent(h.name)">🌱 {{ h.name }}</RouterLink></div></div>
    <div v-if="!q" class="toc card"><b>بۆلەك يولباشچىسى</b><button v-for="s in sections" :key="s.id" @click="openSection(s)">{{ s.title }} <small>{{ s.startPage }}–{{ s.endPage }}-بەت</small></button></div>
    <input v-model="q" class="input" type="search" placeholder="كىتاب ئىچىدىن ئىزدەش..." aria-label="مىزاج كىتابىدىن ئىزدەش">
    <div class="page-list"><button v-for="page in pages" :key="page.pageNumber" class="card page-row" @click="openPage(page)"><b>{{ page.displayPageNumber }}-بەت</b><span>{{ page.text.slice(0, 220) || 'بوش بەت' }}{{ page.text.length > 220 ? '…' : '' }}</span></button></div>
    <p v-if="!pages.length" class="muted">بۇ سۆز بىلەن نەتىجە تېپىلمىدى.</p>
    <div v-if="showQuiz" class="quiz-box card"><h3>بۆلەك تېمىلىرى</h3><p>كىتابنىڭ بۆلەك ناملىرىنى ئەسلەش ۋە مەنبە بەتلىرىنى تېپىش مەشىقى.</p><RouterLink class="btn btn-teal" to="/mizaj/quiz">Quiz نى ئېچىش</RouterLink></div>
  </section>
  <section v-else><h2 class="pagettl">مىزاج كىتابى تېپىلمىدى</h2><p class="muted">mizaj.json نى يەرلىك ھالدا ئىمپورت قىلىڭ.</p></section>
</template>
<style scoped>.back{display:inline-block;margin-bottom:.7rem;color:var(--accent-ink)}.notice{padding:.8rem 1rem;margin:.8rem 0;background:#fff4d6;border:1px solid #e5c878;border-radius:var(--radius);font-size:.82rem;line-height:1.7}.actions{margin:.8rem 0}.toc{display:grid;gap:.4rem;margin:.8rem 0;padding:1rem}.toc button{border:0;background:transparent;text-align:start;color:inherit;cursor:pointer;padding:.25rem}.toc small{color:var(--muted);margin-inline-start:.4rem}.page-list{display:grid;gap:.6rem;margin-top:1rem}.page-row{display:grid;gap:.35rem;text-align:start;border:1px solid var(--line);color:inherit;cursor:pointer;line-height:1.7}.page-row b{color:var(--teal)}.page-row span{font-size:.82rem}.reader,.quiz-box{margin-top:1rem}.reader{scroll-margin-top:1rem}.reader-head{display:flex;justify-content:space-between;align-items:center}.reader article{white-space:pre-wrap;line-height:2;font-size:.95rem;margin-top:.7rem}.reader-nav{display:flex;gap:.5rem;margin-top:1rem}.reader-nav .btn{flex:1}</style>
