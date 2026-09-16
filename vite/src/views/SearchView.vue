<script setup>
import { computed, onMounted, ref } from 'vue'
import { getLessons } from '../data/loader'
import { getCustomPdfBooks } from '../data/books'
import { publishedRecipes } from '../data/recipes'
import { herbIndex } from '../data/herbs'
import { useApi } from '../stores/api'
import { MIZAJ_BOOK, mizajPages } from '../data/mizaj'

const api = useApi(); const q = ref(''); const remoteRecipes = ref(null); const remoteHerbs = ref(null)
const norm = value => String(value || '').toLocaleLowerCase().replace(/[ًٌٍَُِّْـ]/g, '').trim()
const search = computed(() => norm(q.value))
const records = computed(() => {
  const lessons = getLessons().map(l => ({ type:'lesson', icon:'📚', title:l.title, text:[l.subtitle,l.description,(l.sections||[]).map(s => s.title).join(' ')].join(' '), to:'/lesson/'+l.id }))
  const books = getCustomPdfBooks().map(b => ({ type:'book', icon:'📖', title:b.title, text:b.subtitle, to:'/books' }))
  const recipes = (remoteRecipes.value?.length ? remoteRecipes.value : publishedRecipes()).map(r => ({ type:'recipe', icon:'🌿', title:r.disease || r.disease_name, text:[r.category,r.recipeNumber,r.recipe_number,r.originalText,r.original_text].join(' '), to:'/recipe/'+r.id }))
  const herbs = (remoteHerbs.value?.length ? remoteHerbs.value : herbIndex()).map(h => ({ type:'herb', icon:'🌱', title:h.name, text:[h.latinName,h.latin_name,h.aliases,h.properties].join(' '), to:'/herb/'+encodeURIComponent(h.name) }))
  const questions = getLessons().flatMap(l => (l.quiz||[]).map((item,i) => ({ type:'question', icon:'❓', title:item.q || item.question || 'سوئال', text:[item.a,item.answer,item.explain,item.explanation].join(' '), to:'/lesson/'+l.id+'/quiz?question='+i })))
  const mizaj = MIZAJ_BOOK ? [{ type:'book', icon:'🧭', title:MIZAJ_BOOK.title, text:[MIZAJ_BOOK.subtitle, ...mizajPages().slice(0, 30).map(p => p.text)].join(' '), to:'/mizaj' }] : []
  return [...lessons,...books,...mizaj,...recipes,...herbs,...questions]
})
const results = computed(() => { if (!search.value) return []; return records.value.filter(r => norm([r.title,r.text].join(' ')).includes(search.value)).slice(0,100) })
onMounted(async () => { const [recipes, herbs] = await Promise.all([api.getRecipes(), api.getHerbs()]); if (recipes?.length) remoteRecipes.value=recipes; if (herbs?.length) remoteHerbs.value=herbs })
</script>
<template><section><RouterLink to="/" class="back">‹ باش بەتكە قايتىش</RouterLink><h2 class="pagettl">🔎 ئومۇمىي ئىزدەش</h2><p class="pagesub">دەرس، كىتاب، رېتسېپ، خام دورا ۋە سوئاللار ئىچىدىن ئىزدەڭ</p><input v-model="q" autofocus class="input search-input" type="search" placeholder="ئىزدەش..." aria-label="ئومۇمىي ئىزدەش"><p v-if="search" class="muted">{{results.length}} نەتىجە</p><div class="results"><RouterLink v-for="r in results" :key="r.type+r.to+r.title" class="result card" :to="r.to"><span>{{r.icon}}</span><div><b>{{r.title}}</b><small>{{r.type==='lesson'?'دەرس':r.type==='book'?'كىتاب':r.type==='recipe'?'رېتسېپ':r.type==='herb'?'خام دورا':'سوئال'}}</small></div></RouterLink></div><p v-if="search&&!results.length" class="muted">نەتىجە تېپىلمىدى.</p><p v-if="!search" class="empty">ئىزدەش ئۈچۈن سۆز كىرگۈزۈڭ.</p></section></template>
<style scoped>.back{display:inline-block;margin-bottom:.7rem;color:var(--accent-ink)}.search-input{font-size:1.05rem}.results{display:grid;gap:8px;margin-top:1rem}.result{display:flex;gap:.8rem;align-items:center;margin:0;color:inherit;text-decoration:none}.result>span{font-size:1.4rem}.result small{display:block;color:var(--muted);margin-top:.2rem}.empty{padding:2rem;text-align:center;color:var(--muted)}</style>
