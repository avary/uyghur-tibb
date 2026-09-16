<script setup>
import { computed, ref } from 'vue'
import { MIZAJ_BOOK, mizajQuiz } from '../data/mizaj'
const questions = mizajQuiz(); const index = ref(0); const picked = ref(null); const checked = ref(false); const score = ref(0)
const current = computed(() => questions[index.value])
function choose(i) { if (!checked.value) picked.value = i }
function check() { if (picked.value === null) return; checked.value = true; if (picked.value === current.value.a) score.value++ }
function next() { index.value++; picked.value = null; checked.value = false }
</script>
<template><section v-if="questions.length"><RouterLink to="/mizaj" class="back">‹ مىزاج كىتابىغا قايتىش</RouterLink><h2 class="pagettl">📝 مىزاج كىتابى quiz</h2><p class="pagesub">{{ index + 1 }} / {{ questions.length }} · {{ MIZAJ_BOOK.title }}</p><div class="card qcard"><h3>{{ current.q }}</h3><button v-for="(option,i) in current.opts" :key="option" class="option" :class="{selected:picked===i,correct:checked&&i===current.a,wrong:checked&&picked===i&&i!==current.a}" @click="choose(i)">{{ option }}</button><p v-if="checked" class="explain">{{ current.exp }}</p><button v-if="!checked" class="btn btn-teal" :disabled="picked===null" @click="check">تەكشۈرۈش</button><button v-else-if="index < questions.length-1" class="btn btn-teal" @click="next">كېيىنكى ›</button><div v-else class="result">نەتىجە: {{ score }} / {{ questions.length }}</div></div></section><section v-else><h2 class="pagettl">Quiz تېپىلمىدى</h2><p>mizaj:import نى ئىجرا قىلىپ مەنبەنى يەرلىك ھالدا تەييارلاڭ.</p></section></template>
<style scoped>.back{display:inline-block;margin-bottom:.7rem;color:var(--accent-ink)}.qcard{display:grid;gap:.7rem}.option{padding:.8rem;text-align:start;border:1px solid var(--line);border-radius:var(--radius);background:var(--card);color:inherit;cursor:pointer}.option.selected{outline:2px solid var(--teal)}.option.correct{background:#dff4e5}.option.wrong{background:#ffe2e2}.explain{line-height:1.8}.result{font-weight:700;color:var(--teal)}</style>
