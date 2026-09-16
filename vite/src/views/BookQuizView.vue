<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { MIZAJ_BOOK, mizajQuiz } from '../data/mizaj'
import { FARHIZ_BOOK } from '../data/farhiz'
const route = useRoute()
const book = computed(() => route.path.startsWith('/farhiz') ? FARHIZ_BOOK : MIZAJ_BOOK)
const questions = computed(() => mizajQuiz(route.query.section))
const index = ref(0); const picked = ref(null); const checked = ref(false); const score = ref(0)
const current = computed(() => questions.value[index.value])
function choose(i) { if (!checked.value) picked.value = i }
function check() { if (picked.value === null) return; checked.value = true; if (picked.value === current.value.a) score.value++ }
function next() { index.value++; picked.value = null; checked.value = false }
</script>
<template><section v-if="book && questions.length"><RouterLink :to="route.path.startsWith('/farhiz') ? '/farhiz' : '/mizaj'" class="back">‹ كىتابقا قايتىش</RouterLink><h2 class="pagettl">📝 {{ book.title }} quiz</h2><p class="pagesub">{{ index + 1 }} / {{ questions.length }} · بۆلەك تېمىلىرى ۋە مەنبە بەتلىرى</p><div class="card qcard"><h3>{{ current.q }}</h3><button v-for="(option,i) in current.opts" :key="option" class="option" :class="{selected:picked===i,correct:checked&&i===current.a,wrong:checked&&picked===i&&i!==current.a}" @click="choose(i)">{{ option }}</button><p v-if="checked" class="explain">{{ current.exp }}</p><button v-if="!checked" class="btn btn-teal" :disabled="picked===null" @click="check">تەكشۈرۈش</button><button v-else-if="index < questions.length-1" class="btn btn-teal" @click="next">كېيىنكى ›</button><div v-else class="result">نەتىجە: {{ score }} / {{ questions.length }}</div></div></section></template>
<style scoped>.back{display:inline-block;margin-bottom:.7rem;color:var(--accent-ink)}.qcard{display:grid;gap:.7rem}.option{padding:.8rem;text-align:start;border:1px solid var(--line);border-radius:var(--radius);background:var(--card);color:inherit;cursor:pointer}.option.selected{outline:2px solid var(--teal)}.option.correct{background:#dff4e5}.option.wrong{background:#ffe2e2}.explain{line-height:1.8}.result{font-weight:700;color:var(--teal)}</style>
