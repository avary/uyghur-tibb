<script setup>
import { computed } from 'vue'
import { MIZAJ_BOOK } from '../data/mizaj'
import { FARHIZ_BOOK } from '../data/farhiz'
import { topicProgress } from '../data/topicProgress'
const topics = computed(() => [MIZAJ_BOOK, FARHIZ_BOOK].flatMap(book => (book?.sections || []).filter(section => topicProgress(section.id).saved).map(section => ({ ...section, bookTitle: book.title, path: book.id.startsWith('farhiz') ? '/farhiz' : '/mizaj' }))) )
</script>
<template><div v-if="topics.length" class="saved-topics card"><h3>📚 ساقلانغان كىتاب بۆلەكلىرى</h3><RouterLink v-for="topic in topics" :key="topic.id" :to="topic.path + '?section=' + topic.id" class="saved-topic"><b>{{ topic.title }}</b><small>{{ topic.bookTitle }} · {{ topic.startPage }}–{{ topic.endPage }}-بەت</small></RouterLink></div></template>
<style scoped>.saved-topics{margin-bottom:1rem}.saved-topics h3{margin-top:0;font-size:.95rem}.saved-topic{display:block;padding:.6rem 0;border-top:1px solid var(--line);color:inherit;text-decoration:none}.saved-topic small{display:block;color:var(--muted);margin-top:.2rem;font-size:.75rem}</style>
