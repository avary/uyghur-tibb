<script setup>
// Built-in fullscreen PDF viewer modal (upstream books.html port). Mounted once
// from App.vue; driven through the pdfViewer composable. Shows the PDF in an
// iframe with an "open in new tab" escape hatch (very useful on mobile, where
// embedded PDFs can be flaky) and a copy-friendly tip bar.
import { usePdfViewer } from '../composables/pdfViewer'

const { visible, url, title, closePdfViewer } = usePdfViewer()

function onKey(e) {
  if (e.key === 'Escape') closePdfViewer()
}
</script>

<template>
  <Teleport to="body">
    <div v-if="visible" class="pdfv-overlay" @keydown="onKey" tabindex="-1" @click.self="closePdfViewer">
      <div class="pdfv-head">
        <div class="pdfv-ttl">
          <span class="pdfv-ico">📖</span>
          <b>{{ title }}</b>
        </div>
        <div class="pdfv-acts">
          <a class="btn btn-gold btn-sm" :href="url" target="_blank" rel="noopener">↗ يېڭى كۆزنەكتە ئېچىش</a>
          <button class="btn btn-line btn-sm" type="button" @click="closePdfViewer">✕ تاقاش</button>
        </div>
      </div>
      <div class="pdfv-tip">
        <span>💡 تېلېفوندا ئوقۇغاندا: «يېڭى كۆزنەكتە ئېچىش» نى بېسىپ پۈتۈن ئېكراندا چوڭايتىپ راۋان كۆرەلەيسىز.</span>
        <a class="btn btn-gold btn-sm" :href="url" target="_blank" rel="noopener">🚀 بىۋاسىتە ئېچىش ↗</a>
      </div>
      <div class="pdfv-frame">
        <iframe :src="url" title="PDF كىتاب ئوقۇغۇچ" :key="url"></iframe>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.pdfv-overlay {
  position: fixed; inset: 0; z-index: 99999;
  background: rgba(0, 0, 0, .85);
  display: flex; flex-direction: column;
}
.pdfv-head {
  background: var(--teal-dark, #0a5c52);
  color: #fff; padding: .65rem 1.1rem;
  display: flex; justify-content: space-between; align-items: center; gap: .5rem; flex-wrap: wrap;
}
.pdfv-ttl { display: flex; align-items: center; gap: .6rem; min-width: 0; }
.pdfv-ttl .pdfv-ico { font-size: 1.3rem; }
.pdfv-ttl b { font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.pdfv-acts { display: flex; align-items: center; gap: .5rem; }
.pdfv-acts a, .pdfv-tip a { text-decoration: none; color: var(--accent-btn-ink); font-weight: bold; }
.pdfv-tip {
  background: #1e293b; color: #fef08a; font-size: .82rem;
  padding: .45rem 1rem; display: flex; justify-content: space-between; align-items: center;
  gap: .5rem; flex-wrap: wrap; border-bottom: 1px solid rgba(255, 255, 255, .1);
}
.pdfv-frame { flex: 1; width: 100%; position: relative; background: #525659; }
.pdfv-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: none; }
</style>