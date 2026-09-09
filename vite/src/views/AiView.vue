<script setup>
import { ref, computed } from 'vue'
import { getLessons } from '../data/loader'

const LESSONS = getLessons()
const q = ref('')
const msgs = ref([
  { me: false, text: 'ئەسسالامۇ ئەلەيكۇم! ئۇيغۇر تېبابىتى توغرىسىدا سوئال سوراڭ. مەسىلەن: «مىزاج دېگەن نېمە؟»' }
])

function norm(s) {
  return String(s || '').replace(/ي/g, 'ى').replace(/ک/g, 'ك').replace(/\s+/g, ' ').trim()
}

const kws = [
  { k: ['مىزاج'], t: 'مىزاج', r: 'مىزاج — تۆت چوڭ ماددا كەيپىياتىنىڭ بىرىكىشىدىن ھاسىل بولغان يېڭى كەيپىيات. ئۇنىڭ تۆت تۈرى: سەپرا (قۇرۇق ئىسسىق)، قان (ھۆل ئىسسىق)، بەلغەم (ھۆل سوغۇق)، سەۋدا (قۇرۇق سوغۇق).' },
  { k: ['تۆت چوڭ ماددا', 'ئاناسۇر', 'چوڭ ماددا'], t: 'تۆت چوڭ ماددا', r: 'تۆت چوڭ ماددا: ئوت (قۇرۇق ئىسسىق)، ھاۋا (ھۆل ئىسسىق)، سۇ (ھۆل سوغۇق) ۋە تۇپراق (قۇرۇق سوغۇق) — بارلىق مەۋجۇداتنىڭ ئاساسى.' },
  { k: ['تارىخ', 'تېبابىتىنىڭ تارىخى', 'يىللىق'], t: 'تارىخ', r: 'ئۇيغۇر تېبابىتى 2500 يىلدىن ئارتۇق يازما تارىخقا ئىگە. ئەڭ قەدىمكى پېشۋالار: غازباي، كۇماراجىۋا، جان باشلاق.' },
  { k: ['ئىبن سىنا'], t: 'ئىبن سىنا', r: 'ئىبن سىنا (980–1037) — دۇنياغا مەشھۇر تېبابەت ئالىمى، «تېبابەت سۇلتانى». «ئەلقانۇن فىت-تىب» قاتارلىق 50 تىن ئارتۇق ئەسەر يازغان.' },
  { k: ['خىلىت', 'سەپرا', 'قان مىزاج', 'بەلغەم', 'سەۋدا'], t: 'خىلىت', r: 'خىلىت — جىگەردە ئىشلەنگەن مۇرەككەپ سۇيۇقلۇق: سەپرا، قان، بەلغەم ۋە سەۋدا. ھەر بىرى بىر مىزاجغا ماس كېلىدۇ.' },
  { k: ['دەرس', 'ئۆگىنىش'], t: 'دەرس', r: 'دەرسلەر بۆلەكلەرگە ئايرىلغان؛ ھەر بىر دەرستە مۇھىم نۇقتىلار ۋە مەشىق سوئاللىرى بار. «دەرسلەر» بېتىدىن باشلاڭ.' }
]

function answer(kw) {
  const norms = Object.fromEntries(kws.map(x => [x.t, x]))
  const low = norm(q.value).toLowerCase()
  const hit = kws.find(x => x.k.some(k => low.includes(k)))
  if (hit) return hit.r
  return 'بۇ سوئالغا ھازىرچە تېيىز جاۋاب ئېلەمەن. دەرس بۆلەكلىرىدىن قىدىرىپ كۆرۈڭ، ياكى «سۇئال-پىكىر تاختىسى»دىن ئۇستازلارغا يېزىڭ.'
}

function send() {
  const t = q.value.trim()
  if (!t) return
  msgs.value.push({ me: true, text: t })
  q.value = ''
  setTimeout(() => {
    msgs.value.push({ me: false, text: answer(t) })
  }, 350)
}

const chatBox = ref(null)
function scrollDown() {
  setTimeout(() => { if (chatBox.value) chatBox.value.scrollTop = chatBox.value.scrollHeight }, 30)
}
</script>

<template>
  <section class="ai-wrap">
    <h2 class="pagettl">🤖 ئەقىللىق ياردەمچى</h2>
    <p class="pagesub">دەرس مەزمۇنلىرى بويىچە تېز جاۋاب ئېلىڭ</p>

    <div class="chat" ref="chatBox">
      <div v-for="(m, i) in msgs" :key="i" class="chat-msg" :class="{ me: m.me }">
        <div class="bubble">{{ m.text }}</div>
      </div>
    </div>

    <div class="chat-in">
      <input v-model="q" class="input" placeholder="سوئالىڭىزنى يېزىڭ…" @keyup.enter="send">
      <button class="btn btn-teal" @click="send">➤</button>
    </div>
  </section>
</template>

<style scoped>
.ai-wrap { display: flex; flex-direction: column; height: calc(100dvh - 240px); min-height: 380px; }
.chat {
  flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 10px;
  padding: 14px; background: var(--card); border: 1px solid var(--line); border-radius: var(--radius);
  box-shadow: var(--shadow);
}
.chat-msg { display: flex; }
.chat-msg.me { justify-content: flex-end; }
.bubble {
  max-width: 82%; padding: 10px 14px; border-radius: 16px;
  background: var(--card-2); border: 1px solid var(--line); font-size: .9rem;
  border-start-start-radius: 4px;
}
.chat-msg.me .bubble {
  background: linear-gradient(135deg, var(--teal), var(--teal-deep)); color: #fff;
  border: none; border-start-end-radius: 4px;
}
.chat-in { display: flex; gap: 8px; margin-top: 10px; }
.chat-in .btn { flex: none; }
</style>