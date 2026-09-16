import { isLearnerTopicVisible, applyTopicReview } from './topicReview'
const books = import.meta.glob('./farhizData.js', { eager: true, import: 'FARHIZ_BOOK' })
export const FARHIZ_BOOK = Object.values(books)[0] || null
export function farhizPages() { return FARHIZ_BOOK?.pages || [] }
export function searchFarhiz(term) {
  const q = String(term || '').trim().toLowerCase()
  return farhizPages().filter(page => !q || page.text.toLowerCase().includes(q))
}
export function farhizHeadings() { return FARHIZ_BOOK?.headings || [] }
export function farhizSections() { return (FARHIZ_BOOK?.sections || []).filter(isLearnerTopicVisible).map(applyTopicReview) }
