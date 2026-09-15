<script setup>
import { computed, onMounted, ref } from 'vue'
import { herbIndex } from '../data/herbs'
import { useApi } from '../stores/api'

const q = ref('')
const api = useApi()
const serverRecipes = ref(null)
const serverHerbs = ref(null)

const herbs = computed(() => {
  if (serverHerbs.value !== null) return serverHerbs.value.map(h => ({ ...h, recipeIds: [], pages: [h.source_page_start].filter(Boolean), imported: true, latinName: h.latin_name, usedPart: h.used_part, reviewStatus: h.review_status, safetyStatus: h.safety_status }))
  return herbIndex(serverRecipes.value || undefined)
})

onMounted(async () => {
  const [rows, remoteHerbs] = await Promise.all([api.getRecipes(), api.getHerbs()])
  if (Array.isArray(rows) && rows.length) serverRecipes.value = rows.map(r => ({ ...r, disease: r.disease || r.disease_name, sourcePageStart: r.sourcePageStart || r.source_page_start }))
  if (Array.isArray(remoteHerbs)) serverHerbs.value = remoteHerbs
})

const items = computed(() => {
  const term = q.value.trim().toLowerCase()
  return herbs.value.filter(h => !term || [h.name, h.latinName, h.aliases].join(' ').toLowerCase().includes(term))
})
</script>

<template>
  <section>
    <h2 class="pagettl">🌱 خام دورىلار قامۇسى</h2>
    <p class="pagesub">مەنبە كىتابلىرىدىن توپلانغان خام دورا خاتىرىلىرى · مۇتەخەسسىس تەكشۈرۈشى لازىم</p>
    <div class="notice">⚠️ تەستىقلانمىغان خاتىرە پەقەت ئۆگىنىش ۋە تەكشۈرۈش ئۈچۈندۇر؛ داۋالاش تەۋسىيەسى ئەمەس.</div>
    <input v-model="q" class="input" type="search" placeholder="🔍 خام دورا، لاتىنچە نام ياكى باشقا نام ئىزدەش...">
    <div class="herb-grid">
      <RouterLink v-for="h in items" :key="h.id" class="card herb-card" :to="'/herb/' + encodeURIComponent(h.name)">
        <b>{{ h.name }}</b>
        <small v-if="h.latinName">{{ h.latinName }}</small>
        <small>{{ h.recipeIds.length }} رېتسېپ · مەنبە بەت: {{ h.pages.slice(0, 5).join('، ') || '—' }}</small>
        <div class="muted">{{ h.imported ? 'كىتاب خاتىرىسى · ' : 'OCR تەركىب نامزاتى · ' }}{{ h.reviewStatus === 'approved' && h.safetyStatus === 'reviewed' ? 'مەزمۇن ۋە بىخەتەرلىك تەستىقلاندى' : h.reviewStatus === 'approved' ? 'مەزمۇن تەستىقلاندى · بىخەتەرلىك كۈتۈۋاتىدۇ' : 'تەكشۈرۈش كۈتۈۋاتىدۇ' }}</div>
      </RouterLink>
    </div>
    <p v-if="!items.length" class="muted">خام دورا تېپىلمىدى.</p>
  </section>
</template>

<style scoped>
.notice { padding: .8rem 1rem; margin: .8rem 0; background: #fff4d6; border: 1px solid #e5c878; border-radius: var(--radius); font-size: .82rem; line-height: 1.7; }
.herb-grid { display: grid; gap: 10px; margin-top: 1rem; }
.herb-card { margin: 0; }
.herb-card small { display: block; color: var(--muted); margin: .3rem 0; font-size: .75rem; }
.herb-card .muted { font-size: .75rem; }
</style>
