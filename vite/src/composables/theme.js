import { ref } from 'vue'

// Light/dark + colour palette, persisted. Mirrors legacy index.html behaviour.
const DARK_KEY = 'uytibb_theme'
const PAL_KEY = 'uytibb_palette'

export const PALETTES = [
  { id: 'teal', label: 'زۇمۇت', em: '🌿', dot: '#0e7c6f' },
  { id: 'gold', label: 'سەفەر', em: '🍯', dot: '#b1542a' },
  { id: 'rose', label: 'لەئىل', em: '🌹', dot: '#9e2537' }
]

const dark = ref(false)
const palette = ref('teal')

const META_BRAND = {
  teal: { light: '#0e7c6f', dark: '#07332c' },
  gold: { light: '#a2641c', dark: '#4c2a08' },
  rose: { light: '#9e2537', dark: '#550f1c' }
}

function apply() {
  document.documentElement.setAttribute('data-theme', dark.value ? 'dark' : 'light')
  document.documentElement.setAttribute('data-palette', palette.value)
  try {
    const m = document.querySelector('meta[name="theme-color"]')
    if (m) m.setAttribute('content', META_BRAND[palette.value][dark.value ? 'dark' : 'light'])
  } catch (e) {}
}
function init() {
  try { dark.value = localStorage.getItem(DARK_KEY) === 'dark' } catch (e) { dark.value = false }
  try {
    const p = localStorage.getItem(PAL_KEY)
    if (PALETTES.some(x => x.id === p)) palette.value = p
  } catch (e) {}
  apply()
}
function toggle() {
  dark.value = !dark.value
  try { localStorage.setItem(DARK_KEY, dark.value ? 'dark' : 'light') } catch (e) {}
  apply()
}
function currentPalette() {
  return PALETTES.find(p => p.id === palette.value) || PALETTES[0]
}
function cyclePalette() {
  const i = PALETTES.findIndex(p => p.id === palette.value)
  palette.value = PALETTES[(i + 1) % PALETTES.length].id
  try { localStorage.setItem(PAL_KEY, palette.value) } catch (e) {}
  apply()
}
function setPalette(id) {
  if (!PALETTES.some(p => p.id === id)) return
  palette.value = id
  try { localStorage.setItem(PAL_KEY, id) } catch (e) {}
  apply()
}

export function useTheme() {
  return { dark, palette, PALETTES, init, toggle, currentPalette, cyclePalette, setPalette }
}