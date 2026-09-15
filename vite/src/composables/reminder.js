const KEY = 'uytibb_study_reminder'

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch (e) { return {} }
}

export function reminderEnabled() { return !!read().enabled }

export async function toggleReminder(enabled) {
  if (enabled && typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
    const permission = await Notification.requestPermission()
    if (permission !== 'granted') return false
  }
  const value = { enabled, lastShown: enabled ? read().lastShown || 0 : 0 }
  localStorage.setItem(KEY, JSON.stringify(value))
  return enabled
}

export function notifyStudyReminder() {
  const state = read()
  if (!state.enabled || typeof Notification === 'undefined' || Notification.permission !== 'granted') return false
  const now = Date.now()
  if (now - (state.lastShown || 0) < 20 * 60 * 60 * 1000) return false
  new Notification('ئۇيغۇر تېبابىتى ئۆگىنىش', { body: 'بۈگۈن 15 مىنۇت ئۆگىنىشنى ئۇنتۇماڭ 🌿', icon: '/icon.svg' })
  localStorage.setItem(KEY, JSON.stringify({ ...state, lastShown: now }))
  return true
}
