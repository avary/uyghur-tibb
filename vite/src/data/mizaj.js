const books = import.meta.glob('./mizajData.js', { eager: true, import: 'MIZAJ_BOOK' })
export const MIZAJ_BOOK = Object.values(books)[0] || null
export function mizajPages() { return MIZAJ_BOOK?.pages || [] }
export function searchMizaj(term) {
  const q = String(term || '').trim().toLowerCase()
  return mizajPages().filter(page => !q || page.text.toLowerCase().includes(q))
}
export function mizajHeadings() { return MIZAJ_BOOK?.headings || [] }
export function mizajSections() { return MIZAJ_BOOK?.sections || [] }
export function mizajQuiz(sectionId, sourceBook = MIZAJ_BOOK) {
  const sections = sourceBook?.sections || []
  const selected = sectionId ? sections.find(section => section.id === sectionId) : null
  const hs = selected ? [selected, ...sections.filter(section => section.id !== selected.id && section.title.length > 4).slice(0, 3).map(section => ({ title: section.title, pageNumber: section.startPage }))] : mizajHeadings().filter(h => h.title.length > 4).slice(0, 12)
  return hs.map((heading, index) => {
    const alternatives = hs.filter((_, i) => i !== index).slice(0, 3)
    const options = [heading.title, ...alternatives.map(h => h.title)]
    const pageOptions = [heading.pageNumber, ...alternatives.map(h => h.pageNumber)]
    return [
      { type: 'choice', q: `تۆۋەندىكىلەردىن قايسى تېما «${heading.title}»؟`, opts: options, a: 0, exp: `بۇ تېما ${heading.pageNumber}-بەتتە باشلىنىدۇ.` },
      { type: 'choice', q: `«${heading.title}» قايسى بەتتە باشلىنىدۇ؟`, opts: pageOptions.map(page => `${page}-بەت`), a: 0, exp: `TOC بويىچە بۇ بۆلەك ${heading.pageNumber}-بەتتە باشلىنىدۇ.` }
    ]
  }).flat()
}
