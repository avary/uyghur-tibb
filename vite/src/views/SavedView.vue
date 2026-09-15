<script setup>
import { computed, ref } from 'vue'
import { publishedRecipes, recipeProgress } from '../data/recipes'
import { savedHerbs } from '../data/herbs'

const refresh = ref(0)
const saved = computed(() => { refresh.value; return publishedRecipes().filter(recipe => recipeProgress(recipe.id).saved) })
const herbs = computed(() => { refresh.value; return savedHerbs() })
</script>

<template>
  <section>
    <h2 class="pagettl">★ ساقلانغان رېتسېپلار</h2>
    <p class="pagesub">كېيىن قايتىپ كۆرۈش ئۈچۈن ساقلىغان مەزمۇنلىرىڭىز.</p>
    <div v-if="saved.length" class="saved-list">
      <RouterLink v-for="recipe in saved" :key="recipe.id" class="saved-card card" :to="'/recipe/' + recipe.id">
        <div><b>{{ recipe.disease }}</b><small>{{ recipe.category }} · {{ recipe.recipeNumber }}-رېتسېپ</small></div><span>›</span>
      </RouterLink>
    </div>
    <div v-else class="empty card"><p>تېخى ساقلانغان رېتسېپ يوق.</p><RouterLink class="btn btn-teal btn-sm" to="/recipes">رېتسېپلارنى كۆرۈش</RouterLink></div>
    <h3 class="secttl">🌱 ساقلانغان خام دورىلار</h3>
    <div v-if="herbs.length" class="saved-list"><RouterLink v-for="herb in herbs" :key="herb.name" class="saved-card card" :to="'/herb/' + encodeURIComponent(herb.name)"><div><b>{{ herb.name }}</b><small>{{ herb.recipeIds.length }} رېتسېپ بىلەن باغلانغان</small></div><span>›</span></RouterLink></div>
    <div v-else class="empty card"><p>تېخى ساقلانغان خام دورا يوق.</p><RouterLink class="btn btn-teal btn-sm" to="/herbs">خام دورىلارنى كۆرۈش</RouterLink></div>
  </section>
</template>

<style scoped>
.saved-list { display:grid; gap:10px; }.saved-card { display:flex; justify-content:space-between; align-items:center; gap:1rem; color:inherit; text-decoration:none; }.saved-card b { display:block; }.saved-card small { display:block; color:var(--muted); margin-top:.25rem; }.saved-card span { color:var(--teal); font-size:1.4rem; }.empty { text-align:center; padding:2rem 1rem; }.empty p { color:var(--muted); margin-bottom:1rem; }
</style>
