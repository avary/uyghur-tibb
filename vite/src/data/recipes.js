import { RECIPE_BOOK } from './recipeData'
const LS = 'uytibb_recipe_progress'
const progress = () => { try { return JSON.parse(localStorage.getItem(LS) || '{}') || {} } catch { return {} } }
export const recipeCategories = () => [...new Set(RECIPE_BOOK.recipes.map(r => r.category).filter(Boolean))]
export function recipeIsPublished(recipe) {
  if (!recipe) return false
  const override = progress()[recipe.id]
  return (override?.reviewStatus || recipe.reviewStatus) === 'approved' && (override?.safetyStatus || recipe.safetyStatus) === 'reviewed'
}
export const publishedRecipes = () => RECIPE_BOOK.recipes.filter(recipeIsPublished)
export const findRecipe = id => publishedRecipes().find(r => r.id === id) || null
export const recipeProgress = id => progress()[id] || {}
function update(id, values) { const p = progress(); p[id] = { ...(p[id] || {}), ...values }; localStorage.setItem(LS, JSON.stringify(p)); return p[id] }
export const toggleRecipeSaved = id => update(id, { saved: !recipeProgress(id).saved })
export const markRecipeStudied = id => update(id, { studied: true })
export function recipeQuiz(recipe) {
  if (!recipe) return []
  return [
    { q: 'بۇ رېتسېپ قايسى كېسەللىك بابىغا تەۋە؟', a: recipe.disease },
    { q: 'بۇ رېتسېپنىڭ ئەسلى مەنبە بېتى قايسى؟', a: `${recipe.sourcePageStart}–${recipe.sourcePageEnd}-بەت` }
  ]
}
export { RECIPE_BOOK }
