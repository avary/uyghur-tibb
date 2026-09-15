<script setup>
import { onMounted, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useProgress } from './stores/progress'
import { useTheme } from './composables/theme'
import { useView } from './composables/view'
import { useToastRender } from './composables/toast'
import PdfViewerModal from './views/PdfViewerModal.vue'
import { useAccessibility } from './composables/accessibility'

const route = useRoute()
const progress = useProgress()
const theme = useTheme()
const view = useView()
const { toasts } = useToastRender()
const accessibility = useAccessibility()

onMounted(() => {
  theme.init()
  view.init()
  accessibility.init()
  progress.updateStreak()
})

const tabs = [
  { to: '/', t: 'home', ic: '🏠', label: 'باش بەت' },
  { to: '/lessons', t: 'lessons', ic: '📚', label: 'دەرسلەر' },
  { to: '/books', t: 'books', ic: '📖', label: 'PDF', gold: true },
  { to: '/recipes', t: 'recipes', ic: '🌿', label: 'رېتسېپلار' },
  { to: '/herbs', t: 'herbs', ic: '🌱', label: 'خام دورىلار' },
  { to: '/study', t: 'study', ic: '🧠', label: 'تەكرارلاش' },
  { to: '/exam', t: 'exam', ic: '📝', label: 'سىناق' },
  { to: '/teachers', t: 'teachers', ic: '👨‍🏫', label: 'ئۇستازلار' },
  { to: '/me', t: 'me', ic: '👤', label: 'مەن' }
]

const activeTab = computed(() => {
  const h = route.path
  if (h.startsWith('/lesson')) return 'lessons'
  if (h.startsWith('/recipe')) return 'recipes'
  if (h.startsWith('/herb')) return 'herbs'
  if (h.startsWith('/study')) return 'study'
  const hit = tabs.find(t => h === t.to)
  return hit ? hit.t : ''
})

const bare = computed(() => !!route.meta.bare)

const currentPal = computed(() => theme.currentPalette())
</script>

<template>
  <a class="skip-link" href="#main-content">ئاساسىي مەزمۇنغا ئۆتۈش</a>
  <div v-if="bare" class="phone bare">
    <router-view />
    <div class="toast-wrap">
      <div v-for="tt in toasts" :key="tt.id" class="toast" :class="{ err: tt.type === 'err' }">{{ tt.msg }}</div>
    </div>
  </div>

  <div v-else class="phone">
    <header class="appbar">
      <div class="appbar-in">
        <div class="alogo"><img src="/icon.svg" alt=""></div>
        <div class="abrand">
          <b>ئۇيغۇر تېبابىتى ئۆگىنىش</b>
          <small>{{ progress.lessonsTotal }} دەرس • نەزەرىيە قىسمى</small>
        </div>
        <button class="aicon gold" title="ئەپنى قاچىلاش" @click="$router.push('/install')">📲 قاچىلاش</button>
        <button class="aicon" title="خەت چوڭلۇقىنى ئۆزگەرتىش" @click="accessibility.cycle()">A{{ accessibility.scale === 'normal' ? '' : '+' }}</button>
        <button class="aicon viewbtn" id="viewModeBtn" title="ئېكران ھالىتى (تېلېفون / كەڭ ئېكران)" @click="view.toggle()">{{ view.view.value === 'desktop' ? '📱' : '💻' }}</button>
        <button class="aicon" :title="'تېما: ' + currentPal.label + ' — رەڭگىنى ئالماشتۇرۇش'" @click="theme.cyclePalette()">{{ currentPal.em }}</button>
        <button class="aicon" title="كېچە / كۈندۈز ھالى" @click="theme.toggle()">{{ theme.dark.value ? '☀️' : '🌙' }}</button>
      </div>
    </header>

    <main id="main-content" class="main" tabindex="-1">
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

  <PdfViewerModal />
</template>
