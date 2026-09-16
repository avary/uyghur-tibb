<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { FARHIZ_BOOK, searchFarhiz, farhizSections } from '../data/farhiz'
import { markTopicStudied, toggleTopicSaved, topicProgress } from '../data/topicProgress'
import { relatedHerbs, relatedRecipes } from '../data/bookLinks'
const q = ref(''); const selected = ref(null); const reader = ref(null)
const route = useRoute()
const pages = computed(() => searchFarhiz(q.value))
const sections = computed(() => farhizSections().slice(0, 60))
const selectedState = computed(() => selected.value ? topicProgress(selected.value.id) : {})
const linkedRecipes = computed(() => relatedRecipes(selected.value))
const linkedHerbs = computed(() => relatedHerbs(selected.value))
function openPage(page) { selected.value = page; requestAnimationFrame(() => reader.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
function openSection(section) { selected.value = section; q.value = ''; requestAnimationFrame(() => reader.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })) }
function movePage(delta) { const i = FARHIZ_BOOK.pages.findIndex(page => page.pageNumber === selected.value?.pageNumber); openPage(FARHIZ_BOOK.pages[Math.max(0, Math.min(FARHIZ_BOOK.pages.length - 1, i + delta))]) }
function saveTopic() { toggleTopicSaved(selected.value.id); selected.value = { ...selected.value } }
function studyTopic() { markTopicStudied(selected.value.id); selected.value = { ...selected.value } }
onMounted(() => { const section = FARHIZ_BOOK.sections?.find(item => item.id === route.query.section); if (section) openSection(section) })
</script>
<template>
  <section v-if="FARHIZ_BOOK">
    <RouterLink to="/books" class="back">‹ كىتابلارغا قايتىش</RouterLink>
    <h2 class="pagettl">📘 {{ FARHIZ_BOOK.title }}</h2>
    <p class="pagesub">{{ FARHIZ_BOOK.subtitle }} · {{ FARHIZ_BOOK.pages.length }} OCR بەت</p>
    <div class="notice">⚠️ مەنبە OCR تېكىستى ئۆگىنىش ئۈچۈندۇر؛ پەرھىز ياكى داۋالاش قارارىنى مۇتەخەسسىس ۋە دوختۇر بىلەن مەسلىھەتلىشىپ چىقىڭ.</div>
    <div class="actions"><RouterLink class="btn btn-teal" to="/farhiz/quiz">📝 بۆلەك تېمىلىرى بويىچە quiz</RouterLink></div>
    <input v-model="q" class="input" type="search" placeholder="كىتاب ئىچىدىن ئىزدەش..." aria-label="فەرھىز كىتابىدىن ئىزدەش">
    <div v-if="selected" ref="reader" class="reader card"><div class="reader-head"><div><h3>{{ selected.title }}</h3><small>{{ selected.startPage }}–{{ selected.endPage }}-بەت</small></div><button class="btn btn-ghost btn-sm" @click="selected = null">×</button></div><article>{{ selected.text || 'بوش بەت' }}</article><div class="reader-actions"><button class="btn btn-teal" @click="saveTopic">{{ selectedState.saved ? '★ ساقلانغان' : '☆ ساقلاش' }}</button><button class="btn btn-ghost" @click="studyTopic">{{ selectedState.studied ? '✓ ئۆگىنىلدى' : 'ئۆگىنىلدى دەپ بەلگىلەش' }}</button><RouterLink class="btn btn-ghost" :to="'/farhiz/quiz?section=' + selected.id">📝 بۇ بۆلەك quiz</RouterLink></div><div v-if="linkedRecipes.length || linkedHerbs.length" class="links"><h4>🔗 مۇناسىۋەتلىك مەزمۇن</h4><RouterLink v-for="r in linkedRecipes" :key="r.id" :to="'/recipe/' + r.id">🌿 {{ r.disease }}</RouterLink><RouterLink v-for="h in linkedHerbs" :key="h.name" :to="'/herb/' + encodeURIComponent(h.name)">🌱 {{ h.name }}</RouterLink></div></div>
    <div v-if="!q && sections.length" class="toc card"><b>بۆلەك يولباشچىسى</b><button v-for="s in sections" :key="s.id" @click="openSection(s)">{{ s.title }} <small>{{ s.startPage }}–{{ s.endPage }}-بەت</small></button></div>
    <div class="page-list"><button v-for="page in pages" :key="page.pageNumber" class="card page-row" @click="openPage(page)"><b>{{ page.displayPageNumber }}-بەت</b><span>{{ page.text.slice(0, 220) || 'بوش بەت' }}{{ page.text.length > 220 ? '…' : '' }}</span></button></div>
    <p v-if="!pages.length" class="muted">بۇ سۆز بىلەن نەتىجە تېپىلمىدى.</p>
  </section>
  <section v-else><h2 class="pagettl">كىتاب تېپىلمىدى</h2><p class="muted">فەرھىز كىتابىنى يەرلىك ھالدا ئىمپورت قىلىڭ.</p></section>
</template>
<style scoped>.back{display:inline-block;margin-bottom:.7rem;color:var(--accent-ink)}.notice{padding:.8rem 1rem;margin:.8rem 0;background:#fff4d6;border:1px solid #e5c878;border-radius:var(--radius);font-size:.82rem;line-height:1.7}.toc{display:grid;gap:.4rem;margin:.8rem 0;padding:1rem}.toc button{border:0;background:transparent;text-align:start;color:inherit;cursor:pointer;padding:.25rem}.toc small{color:var(--muted);margin-inline-start:.4rem}.page-list{display:grid;gap:.6rem;margin-top:1rem}.page-row{display:grid;gap:.35rem;text-align:start;border:1px solid var(--line);color:inherit;cursor:pointer;line-height:1.7}.page-row b{color:var(--teal)}.page-row span{font-size:.82rem}.reader{margin-top:1rem;scroll-margin-top:1rem}.reader-head{display:flex;justify-content:space-between;align-items:center}.reader article{white-space:pre-wrap;line-height:2;font-size:.95rem;margin-top:.7rem}.reader-nav{display:flex;gap:.5rem;margin-top:1rem}.reader-nav .btn{flex:1}</style>
