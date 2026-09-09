<script setup>
import { onMounted, ref } from 'vue'

const pwaState = ref('unknown')
let deferredPrompt = null

function pwaStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
}

onMounted(() => {
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault()
    deferredPrompt = e
    pwaState.value = 'ready'
  })
  window.addEventListener('appinstalled', () => { pwaState.value = 'installed' })
  if (pwaStandalone()) pwaState.value = 'installed'
})

async function install() {
  if (deferredPrompt) {
    deferredPrompt.prompt()
    const res = await deferredPrompt.userChoice
    if (res.outcome === 'accepted') pwaState.value = 'installed'
    deferredPrompt = null
  }
}

const steps = [
  { t: '1', d: 'ئاستىدىكى «📲 قاچىلاش» توپچىسىنى بېسىڭ' },
  { t: '2', d: 'كۆرۈنگەن دىئالوگتا «قاچىلاش»نى تاللاڭ' },
  { t: '3', d: 'ئەپ باش ئېكرانىڭىزدا كۆرۈنىدۇ — ئىنتېرنېتسىز ئىشلەيدۇ!' }
]
</script>

<template>
  <section>
    <h2 class="pagettl">📲 ئەپنى قاچىلاش</h2>
    <p class="pagesub">بۇ سايتنى تېلېفونىڭىزغا ئەپ قىلىپ قاچىلاڭ — ئىنتېرنېتسىزمۇ ئىشلەيدۇ</p>

    <div class="install-hero">
      <div class="ih-logo"><img src="/icon.svg" alt=""></div>
      <div>
        <b>ئۇيغۇر تېبابىتى ئۆگىنىش</b>
        <small>PWA — ئىنتېرنېتسىز ئىشلەيدۇ</small>
      </div>
    </div>

    <div v-for="s in steps" :key="s.t" class="step">
      <div class="step-n">{{ s.t }}</div>
      <div>{{ s.d }}</div>
    </div>

    <div class="pwa-note">
      <span v-if="pwaState === 'installed'">✅ ئەپ ئاللىقاچان قاچىلانغان — باش ئېكراندىكى سىنبەلگىدىن كىرىڭ!</span>
      <button v-else class="btn btn-gold btn-block" @click="install">📲 ئەپنى قاچىلاش</button>
      <p v-if="pwaState === 'ready'" class="muted" style="font-size:.78rem;text-align:center;margin-top:8px">قاچىلاش تەييار — باشقا براۋزېردا ئاساسەن ئوخشاش كۆرسەتمە</p>
    </div>
  </section>
</template>

<style scoped>
.install-hero {
  display: flex; align-items: center; gap: 12px;
  background: linear-gradient(135deg, var(--teal), var(--teal-deep)); color: #fff;
  border-radius: var(--radius); padding: 16px; box-shadow: var(--shadow-lg); margin-bottom: 14px;
}
.ih-logo { width: 56px; height: 56px; border-radius: 15px; background: var(--card); display: grid; place-items: center; overflow: hidden; }
.ih-logo img { width: 52px; height: 52px; }
.install-hero small { display: block; color: rgba(255,255,255,.85); font-size: .78rem; }
.step { display: flex; align-items: center; gap: 12px; background: var(--card); border: 1px solid var(--line); border-radius: 13px; padding: 12px 14px; margin-bottom: 8px; font-size: .9rem; box-shadow: var(--shadow); }
.step-n { flex: none; width: 30px; height: 30px; border-radius: 10px; background: linear-gradient(135deg, var(--gold), #a8861c); color: #2e2200; font-weight: 900; display: grid; place-items: center; }
.pwa-note { margin-top: 14px; }
</style>