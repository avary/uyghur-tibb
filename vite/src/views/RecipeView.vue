<script setup>
import { computed, ref, onMounted } from 'vue'
import { findRecipe, recipeProgress, toggleRecipeSaved, markRecipeStudied, recipeQuiz } from '../data/recipes'
import { useApi } from '../stores/api'
const props = defineProps({ id: String }); const recipe = computed(() => findRecipe(props.id)); const remote = ref(null); const refresh = ref(0); const api = useApi()
onMounted(async () => { const rows = await api.getRecipes(); if (!Array.isArray(rows)) return; const found = rows.find(row => row.id === props.id); if (found) remote.value = { ...found, disease: found.disease || found.disease_name, recipeNumber: found.recipeNumber || found.recipe_number, originalText: found.originalText || found.original_text, sourcePageStart: found.sourcePageStart || found.source_page_start, sourcePageEnd: found.sourcePageEnd || found.source_page_end } })
const displayedRecipe = computed(() => remote.value || recipe.value)
const state = computed(() => { refresh.value; return displayedRecipe.value ? recipeProgress(displayedRecipe.value.id) : {} })
const quiz = computed(() => recipeQuiz(displayedRecipe.value))
const safetyItems = computed(() => { const r = displayedRecipe.value || {}; return [r.contraindications, r.warnings, r.safetyNotes, r.safety_notes, r.interactions].flatMap(value => Array.isArray(value) ? value : (value ? [value] : [])).map(String).map(value => value.trim()).filter(Boolean) })
const safetyReviewed = computed(() => (displayedRecipe.value || {}).safetyStatus === 'reviewed' || (displayedRecipe.value || {}).safety_status === 'reviewed')
function save() { toggleRecipeSaved(displayedRecipe.value.id); refresh.value++ }
function study() { markRecipeStudied(displayedRecipe.value.id); refresh.value++ }
</script>
<template>
  <section v-if="displayedRecipe">
    <RouterLink to="/recipes" class="back">‹ رېتسېپلارغا قايتىش</RouterLink>
    <h2 class="pagettl">{{ displayedRecipe.disease }}</h2>
    <p class="pagesub">{{ displayedRecipe.category }} · {{ displayedRecipe.recipeNumber }}-رېتسېپ · {{ displayedRecipe.sourcePageStart }}–{{ displayedRecipe.sourcePageEnd }}-بەت</p>
    <div class="notice" :class="{ reviewed: safetyReviewed }">{{ safetyReviewed ? '✅ بىخەتەرلىك ھالىتى: تەكشۈرۈلگەن. يەنىلا تەربىيەۋى مەقسەتتە ئىشلىتىڭ.' : '⚠️ ئەسلى OCR تېكىستى؛ بىخەتەرلىك تەكشۈرۈشى تېخى تاماملانمىدى.' }}</div>
    <div v-if="safetyItems.length" class="safety card"><h3>🛡️ بىخەتەرلىك خاتىرىلىرى</h3><ul><li v-for="(item, i) in safetyItems" :key="i">{{ item }}</li></ul><small>بۇ خاتىرىلەر تەربىيەۋى مەقسەتتە؛ ئىشلىتىشتىن بۇرۇن لاياقەتلىك دوختۇر بىلەن مەسلىھەتلىشىڭ.</small></div>
    <article class="recipe-text">{{ displayedRecipe.originalText }}</article>
    <div class="recipe-actions"><button class="btn btn-teal" @click="save">{{ state.saved ? '★ ساقلانغان' : '☆ ساقلاش' }}</button><button class="btn btn-ghost" @click="study">{{ state.studied ? '✓ ئۆگىنىلدى' : 'ئۆگىنىلدى دەپ بەلگىلەش' }}</button><a class="btn btn-ghost" :href="'/pdf/100-keselge-1000-retsip.pdf#page=' + displayedRecipe.sourcePageStart" target="_blank" rel="noopener">📖 ئەسلى بەت</a></div>
    <div class="study-card"><h3>🧠 ئۆگىنىش سوئاللىرى</h3><div v-for="item in quiz" :key="item.q" class="study-row"><b>{{ item.q }}</b><details><summary>جاۋابنى كۆرۈش</summary><span>{{ item.a }}</span></details></div></div>
  </section>
  <section v-else><h2 class="pagettl">رېتسېپ تېپىلمىدى</h2><RouterLink to="/recipes">رېتسېپلارغا قايتىش</RouterLink></section>
</template>
<style scoped>
.back{display:inline-block;margin-bottom:.7rem;color:var(--accent-ink)}.notice{padding:.8rem 1rem;background:#fff4d6;border:1px solid #e5c878;border-radius:var(--radius);font-size:.82rem;line-height:1.7}.notice.reviewed{background:rgba(30,142,77,.12);border-color:rgba(30,142,77,.4)}.safety{margin-top:1rem;border-inline-start:4px solid var(--red)}.safety h3{font-size:.95rem}.safety ul{margin:.5rem 0;padding-inline-start:1.2rem}.safety li{margin:.35rem 0;font-size:.86rem}.safety small{color:var(--muted)}.recipe-text{white-space:pre-wrap;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);padding:1rem;line-height:2;font-size:.95rem;margin-top:1rem}.recipe-actions{display:flex;gap:.5rem;flex-wrap:wrap;margin-top:1rem}.recipe-actions a{text-decoration:none}.study-card{margin-top:1rem;padding:1rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius)}.study-row{padding:.7rem 0;border-bottom:1px solid var(--line);line-height:1.7}.study-row:last-child{border-bottom:0}.study-row details{margin-top:.35rem;color:var(--teal-dark)}.study-row summary{cursor:pointer}
</style>
