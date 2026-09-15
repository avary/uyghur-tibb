import { RECIPE_BOOK, publishedRecipes } from './recipes'

// The importer creates this optional module locally. Vite's glob keeps the base
// app buildable before either future raw-herb book is provided.
const importedBooks = Object.values(import.meta.glob('./herbData-*.js', { eager: true, import: 'HERB_BOOK' }))
const importedHerbs = importedBooks.flatMap(book => book?.herbs || [])
const LS_HERBS = 'uytibb_herb_progress'
function herbProgress() { try { return JSON.parse(localStorage.getItem(LS_HERBS) || '{}') || {} } catch { return {} } }
export function herbIsSaved(name) { return !!herbProgress()[name]?.saved }
export function toggleHerbSaved(name) { const p = herbProgress(); p[name] = { ...(p[name] || {}), saved: !p[name]?.saved }; localStorage.setItem(LS_HERBS, JSON.stringify(p)); return p[name] }
export function savedHerbs() { return herbIndex().filter(h => herbIsSaved(h.name)) }

// Ingredient names are deliberately kept as OCR-derived candidates until an editor
// assigns canonical names and safety metadata.
export function herbIndex(source = RECIPE_BOOK.recipes) {
  const rows = new Map()
  for (const herb of importedHerbs) rows.set(herb.name, { ...herb, recipeIds: [], pages: herb.sourcePageStart ? [herb.sourcePageStart] : [], imported: true })
  for (const recipe of source) for (const item of recipe.ingredients || []) {
    const name = String(item.name || '').trim()
    if (!name) continue
    const existing = rows.get(name)
    const row = existing || { id: name, name, recipeIds: [], pages: new Set() }
    if (!row.recipeIds.includes(recipe.id)) row.recipeIds.push(recipe.id)
    if (row.pages instanceof Set) row.pages.add(recipe.sourcePageStart)
    rows.set(name, row)
  }
  return [...rows.values()].map(r => ({ ...r, pages: [...new Set(r.pages)].filter(Boolean).sort((a, b) => a - b) })).sort((a, b) => b.recipeIds.length - a.recipeIds.length || a.name.localeCompare(b.name))
}
export function recipesForHerb(name) { return publishedRecipes().filter(r => (r.ingredients || []).some(i => i.name === name)) }
export function findHerb(name) { return herbIndex().find(h => h.name === name) || null }
