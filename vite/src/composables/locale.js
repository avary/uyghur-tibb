import { ref } from 'vue'
const KEY = 'uytibb_locale'
export const LOCALES = [{ id: 'ug', label: 'ئۇيغۇرچە', dir: 'rtl' }, { id: 'tr', label: 'Türkçe', dir: 'ltr' }, { id: 'en', label: 'English', dir: 'ltr' }]
const current = ref('ug')
export function useLocale() {
  function init() {
    try { const saved = localStorage.getItem(KEY); if (LOCALES.some(l => l.id === saved)) current.value = saved } catch (e) {}
    apply()
  }
  function setLocale(id) {
    if (!LOCALES.some(l => l.id === id)) return
    current.value = id
    try { localStorage.setItem(KEY, id) } catch (e) {}
    apply()
  }
  function apply() { const item = LOCALES.find(l => l.id === current.value); if (typeof document !== 'undefined') { document.documentElement.lang = item.id; document.documentElement.dir = item.dir } }
  return { current, locales: LOCALES, init, setLocale }
}
