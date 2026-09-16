const KEY = 'uytibb_book_topic_reviews'
function read() { try { return JSON.parse(localStorage.getItem(KEY) || '{}') || {} } catch { return {} } }
export function topicReviewStatus(id) { return read()[id]?.status || 'needs_review' }
export function isLearnerTopicVisible(topic) { return topicReviewStatus(topic.id) !== 'rejected' }
export function applyTopicReview(topic) { const edit = read()[topic.id] || {}; return { ...topic, title: edit.title || topic.title, summary: edit.summary || '' } }
