import { ref } from 'vue'

// Screen view mode: mobile (phone frame, 560px) vs desktop (wide, 1040px).
// Mirrors upstream's uytibb_view + html[data-view] behaviour.
const VIEW_KEY = 'uytibb_view'
const view = ref('mobile')

function apply(mode) {
  view.value = mode
  document.documentElement.setAttribute('data-view', mode)
}
function init() {
  let mode = null
  try { mode = localStorage.getItem(VIEW_KEY) } catch (e) {}
  if (!mode) mode = typeof window !== 'undefined' && window.innerWidth >= 1024 ? 'desktop' : 'mobile'
  apply(mode)
}
function setView(mode) {
  if (mode !== 'mobile' && mode !== 'desktop') return
  apply(mode)
  try { localStorage.setItem(VIEW_KEY, mode) } catch (e) {}
}
function toggle() {
  setView(view.value === 'desktop' ? 'mobile' : 'desktop')
}

export function useView() {
  return { view, init, setView, toggle }
}