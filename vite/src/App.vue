<script setup>
import { onMounted, computed, ref, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { useProgress } from './stores/progress'
import { useTheme } from './composables/theme'
import { useView } from './composables/view'
import { useToastRender } from './composables/toast'
import PdfViewerModal from './views/PdfViewerModal.vue'
import { useAccessibility } from './composables/accessibility'
import { notifyStudyReminder } from './composables/reminder'
import { useOnlineStatus } from './composables/online'
import { useLocale } from './composables/locale'

const route = useRoute()
const progress = useProgress()
const theme = useTheme()
const view = useView()
const { toasts } = useToastRender()
const accessibility = useAccessibility()
const { online } = useOnlineStatus()
const locale = useLocale()

onMounted(() => {
  theme.init()
  view.init()
  accessibility.init()
  locale.init()
  progress.updateStreak()
  progress.trackActivity('sessions')
  notifyStudyReminder()
  window.addEventListener('uytibb:app-update', showUpdate)
})

const updateAvailable = ref(false)
function showUpdate() { updateAvailable.value = true }
function reloadUpdatedApp() { window.location.reload() }

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
const runtimeError = ref(false)
onErrorCaptured(() => { runtimeError.value = true; return false })
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
    <div v-if="updateAvailable" class="update-banner" role="status" aria-live="polite">
      🔄 يېڭى نەشرى تەييار — <button class="update-btn" @click="reloadUpdatedApp">قايتا يۈكلەش</button>
    </div>
    <div v-if="!online" class="offline-banner" role="status" aria-live="polite">📴 تور يوق — يەرلىك ساقلانغان مەزمۇنلار ئىشلىتىلىۋاتىدۇ.</div>
    <header class="appbar">
      <div class="appbar-in">
        <div class="alogo"><img src="/icon.svg" alt=""></div>
        <div class="abrand">
          <b>ئۇيغۇر تېبابىتى ئۆگىنىش</b>
          <small>{{ progress.lessonsTotal }} دەرس • نەزەرىيە قىسمى</small>
        </div>
        <button class="aicon gold" title="ئەپنى قاچىلاش" @click="$router.push('/install')">📲 قاچىلاش</button>
        <button class="aicon" title="ئومۇمىي ئىزدەش" @click="$router.push('/search')">🔎</button>
        <button class="aicon" title="خەت چوڭلۇقىنى ئۆزگەرتىش" @click="accessibility.cycle()">A{{ accessibility.scale === 'normal' ? '' : '+' }}</button>
        <button class="aicon viewbtn" id="viewModeBtn" title="ئېكران ھالىتى (تېلېفون / كەڭ ئېكران)" @click="view.toggle()">{{ view.view.value === 'desktop' ? '📱' : '💻' }}</button>
        <button class="aicon" :title="'تېما: ' + currentPal.label + ' — رەڭگىنى ئالماشتۇرۇش'" @click="theme.cyclePalette()">{{ currentPal.em }}</button>
        <button class="aicon" title="كېچە / كۈندۈز ھالى" @click="theme.toggle()">{{ theme.dark.value ? '☀️' : '🌙' }}</button>
      </div>
    </header>

    <main id="main-content" class="main" tabindex="-1">
      <div v-if="runtimeError" class="runtime-error" role="alert"><h2>بەتنى ئاچقىلى بولمىدى.</h2><p>قايتا سىناپ بېقىڭ ياكى تورسىز ساقلانغان مەزمۇنغا قايتىڭ.</p><button class="btn btn-teal" @click="runtimeError = false; $router.go(0)">قايتا يۈكلەش</button></div>
      <router-view v-else />
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

<style scoped>
.offline-banner { padding: .5rem .8rem; background: #fff4d6; border-bottom: 1px solid #e5c878; color: #6b4e00; text-align: center; font-size: .78rem; }
.update-banner { padding: .45rem .8rem; background: #e5f6f3; border-bottom: 1px solid #9dd8d0; color: #145e59; text-align: center; font-size: .78rem; }
.update-btn { border: 0; background: transparent; color: inherit; text-decoration: underline; cursor: pointer; font: inherit; font-weight: 700; }
.runtime-error { margin: 2rem 0; padding: 1.5rem; text-align: center; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius); }
.runtime-error p { color: var(--muted); margin: .6rem 0 1rem; }
</style>
