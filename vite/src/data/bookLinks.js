import { publishedRecipes } from './recipes'
import { herbIndex } from './herbs'

const normalize = value => String(value || '').toLocaleLowerCase().replace(/[ًٌٍَُِّْـ\s\-]/g, '')
const words = value => String(value || '').split(/[\s،؛,:.()\[\]«»]+/).filter(word => word.length > 2).slice(0, 80)
function matches(text, candidate) {
  const haystack = normalize(text)
  return words(candidate).filter(word => haystack.includes(normalize(word))).length >= 1
}
export function relatedRecipes(section) {
  if (!section) return []
  return publishedRecipes().filter(recipe => matches(section.text, [recipe.disease, recipe.category, recipe.originalText, ...(recipe.ingredients || []).map(i => i.name)].join(' '))).slice(0, 8)
}
export function relatedHerbs(section) {
  if (!section) return []
  return herbIndex().filter(herb => matches(section.text, [herb.name, herb.latinName, herb.properties, herb.uses].join(' '))).slice(0, 8)
}
