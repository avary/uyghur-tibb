import { ref } from 'vue'

// Light/dark theme, persisted. Mirrors legacy index.html behaviour.
const KEY = 'uytibb_theme'
const dark = ref(false)

function apply() {
  document.documentElement.setAttribute('data-theme', dark.value ? 'dark' : 'light')
}
function init() {
  try { dark.value = localStorage.getItem(KEY) === 'dark' } catch (e) { dark.value = false }
  apply()
}
function toggle() {
  dark.value = !dark.value
  try { localStorage.setItem(KEY, dark.value ? 'dark' : 'light') } catch (e) {}
  apply()
}

export function useTheme() {
  return { dark, init, toggle }
}