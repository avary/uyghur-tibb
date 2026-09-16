const KEY = 'uytibb_topic_progress'
function all() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { return {} } }
export function topicProgress(id) { return all()[id] || {} }
export function toggleTopicSaved(id) { const p = all(); p[id] = { ...(p[id] || {}), saved: !p[id]?.saved }; localStorage.setItem(KEY, JSON.stringify(p)) }
export function markTopicStudied(id) { const p = all(); p[id] = { ...(p[id] || {}), studied: true, studiedAt: new Date().toISOString() }; localStorage.setItem(KEY, JSON.stringify(p)) }
