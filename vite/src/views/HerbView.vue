<script setup>
import { computed, onMounted, ref } from 'vue'
import { findHerb, recipesForHerb, herbIsSaved, toggleHerbSaved } from '../data/herbs'
import { useApi } from '../stores/api'
const props = defineProps({ name: String }); const api = useApi(); const remote = ref(null); const refresh = ref(0)
onMounted(async () => { const rows = await api.getHerbs(); remote.value = Array.isArray(rows) ? rows.find(h => h.name === props.name) || null : null })
const herb = computed(() => { refresh.value; if (!remote.value) return findHerb(props.name); const h = remote.value; return { ...h, latinName: h.latin_name, usedPart: h.used_part, safetyStatus: h.safety_status, recipeIds: [], pages: [h.source_page_start].filter(Boolean), imported: true } })
const recipes = computed(() => recipesForHerb(props.name))
function save() { toggleHerbSaved(herb.value.name); refresh.value++ }
</script>
<template>
  <section v-if="herb">
    <RouterLink to="/herbs" class="back">‹ خام دورىلار قامۇسىغا قايتىش</RouterLink><h2 class="pagettl">🌱 {{ herb.name }}</h2>
    <p class="pagesub">{{ herb.recipeIds.length }} رېتسېپتا ئىشلىتىلگەن · مەنبە بەتلىرى: {{ herb.pages.join('، ') || '—' }}</p>
    <div class="notice">⚠️ بۇ مەزمۇن مەنبە كىتابتىن كەلگەن. نام، خۇسۇسىيەت ۋە بىخەتەرلىك ئۇچۇرى مۇتەخەسسىس تەرىپىدىن تەستىقلانمىغۇچە داۋالاش تەۋسىيەسى ئەمەس.</div>
    <div v-if="herb.safetyStatus === 'reviewed'" class="notice" role="status">✓ بىخەتەرلىك ئۇچۇرى مۇتەخەسسىس تەرىپىدىن تەكشۈرۈلگەن (ئۆگىنىش مەقسىتىدە).</div>
    <dl v-if="herb.imported" class="herb-facts"><template v-if="herb.latinName"><dt>لاتىنچە نام</dt><dd>{{ herb.latinName }}</dd></template><template v-if="herb.usedPart"><dt>ئىشلىتىلىدىغان قىسمى</dt><dd>{{ herb.usedPart }}</dd></template><template v-if="herb.properties"><dt>خۇسۇسىيىتى</dt><dd>{{ herb.properties }}</dd></template><template v-if="herb.preparation"><dt>تەييارلاش / ئىشلىتىش</dt><dd>{{ herb.preparation }}</dd></template><template v-if="herb.warnings"><dt>ئاگاھلاندۇرۇش</dt><dd>{{ herb.warnings }}</dd></template></dl>
    <button class="btn btn-teal btn-sm" @click="save">{{ herbIsSaved(herb.name) ? '★ ساقلانغان' : '☆ ساقلاش' }}</button>
    <h3>باغلانغان تەستىقلانغان رېتسېپلەر</h3><div class="recipe-list"><RouterLink v-for="r in recipes" :key="r.id" class="recipe-card" :to="'/recipe/' + r.id"><b>{{ r.disease }}</b><small>{{ r.recipeNumber }} · {{ r.sourcePageStart }}–{{ r.sourcePageEnd }}-بەت</small></RouterLink></div><p v-if="!recipes.length" class="muted">ھازىر تەستىقلانغان رېتسېپ يوق.</p>
  </section><section v-else><h2 class="pagettl">خام دورا تېپىلمىدى</h2><RouterLink to="/herbs">قامۇسقا قايتىش</RouterLink></section>
</template>
<style scoped>.back{display:inline-block;margin-bottom:.7rem;color:var(--accent-ink)}.notice{padding:.8rem 1rem;background:#fff4d6;border:1px solid #e5c878;border-radius:var(--radius);font-size:.82rem;line-height:1.7;margin:.8rem 0}.herb-facts{display:grid;grid-template-columns:auto 1fr;gap:.55rem .8rem;padding:1rem;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);line-height:1.7}.herb-facts dt{font-weight:700;color:var(--teal)}.herb-facts dd{margin:0;white-space:pre-wrap}.recipe-list{display:grid;gap:10px}.recipe-card{display:block;padding:12px 14px;background:var(--card);border:1px solid var(--line);border-radius:var(--radius);color:inherit;text-decoration:none}.recipe-card small{display:block;color:var(--muted);margin-top:.3rem}</style>
