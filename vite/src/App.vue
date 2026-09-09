<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProgress } from './stores/progress'
import { useTheme } from './composables/theme'
import { useToastRender } from './composables/toast'

const route = useRoute()
const progress = useProgress()
const theme = useTheme()
const { toasts } = useToastRender()

onMounted(() => {
  theme.init()
  progress.updateStreak()
})

const tabs = [
  { to: '/', t: 'home', ic: '🏠', label: 'باش بەت' },
  { to: '/lessons', t: 'lessons', ic: '📚', label: 'دەرسلەر' },
  { to: '/books', t: 'books', ic: '📖', label: 'PDF', gold: true },
  { to: '/exam', t: 'exam', ic: '📝', label: 'سىناق' },
  { to: '/teachers', t: 'teachers', ic: '👨‍🏫', label: 'ئۇستازلار' },
  { to: '/me', t: 'me', ic: '👤', label: 'مەن' }
]

const activeTab = computed(() => {
  const h = route.path
  if (h.startsWith('/lesson')) return 'lessons'
  const hit = tabs.find(t => h === t.to)
  return hit ? hit.t : ''
})
</script>

<template>
  <div class="phone">
    <header class="appbar">
      <div class="appbar-in">
        <div class="alogo"><img src="/icon.svg" alt=""></div>
        <div class="abrand">
          <b>ئۇيغۇر تېبابىتى ئۆگىنىش</b>
          <small>{{ progress.lessonsTotal }} دەرس • نەزەرىيە قىسمى</small>
        </div>
        <button class="aicon gold" @click="$router.push('/install')">📲 قاچىلاش</button>
        <button class="aicon" title="كېچە / كۈندۈز ھالى" @click="theme.toggle()">{{ theme.dark.value ? '☀️' : '🌙' }}</button>
      </div>
    </header>

    <main class="main">
      <router-view />
    </main>

    <nav class="tabbar">
      <RouterLink
        v-for="t in tabs"
        :key="t.t"
        class="tabitem"
        :class="{ on: activeTab === t.t }"
        :to="t.to"
      >
        <span class="ic">{{ t.ic }}</span>{{ t.label }}
      </RouterLink>
    </nav>

    <div class="toast-wrap">
      <div v-for="tt in toasts" :key="tt.id" class="toast" :class="{ err: tt.type === 'err' }">{{ tt.msg }}</div>
    </div>
  </div>
</template>