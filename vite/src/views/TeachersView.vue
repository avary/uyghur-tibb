<script setup>
import { getTeachers } from '../data/loader'
const TEACHERS = getTeachers()
</script>

<template>
  <section>
    <h2 class="pagettl">👨‍🏫 ئۇستازلار</h2>
    <p class="pagesub">ئۇيغۇر تېبابىتىنىڭ ئۇلۇغ ئۇستازلىرى، پېشۋالىرى ۋە زامانىۋى ئالىملىرى</p>

    <div class="tcard card" v-for="(t, i) in TEACHERS" :key="i">
      <div class="trow">
        <div class="tav">{{ t.name.trim().slice(0, 1) }}</div>
        <div class="tmain">
          <div class="thead"><b class="tname">{{ t.name }}</b><span class="pill gold">{{ t.tag }}</span></div>
          <div class="tmeta">{{ t.years }} • {{ t.field }}</div>
        </div>
      </div>
      <p class="tbio">{{ t.bio }}</p>
      <div v-if="t.works" class="tworks">📚 <b>ئەسەرلىرى:</b> {{ t.works }}</div>
    </div>
  </section>
</template>

<style scoped>
.tcard { margin-bottom: 12px; }
.trow { display: flex; gap: 12px; align-items: center; }
.tav {
  flex: none; width: 52px; height: 52px; border-radius: 15px;
  background: linear-gradient(135deg, var(--teal), var(--teal-deep)); color: #fff;
  display: grid; place-items: center; font-size: 1.4rem; font-weight: 800;
}
.tmain { flex: 1; min-width: 0; }
.thead { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.tname { font-size: 1.02rem; }
.tmeta { font-size: .78rem; color: var(--muted); margin-top: 2px; }
.tbio { font-size: .88rem; margin-top: 10px; }
.tworks { margin-top: 8px; font-size: .84rem; background: var(--card-2); border: 1px solid var(--line); border-radius: 11px; padding: 9px 12px; }
</style>