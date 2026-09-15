#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
const file = process.env.RECIPE_DATA || process.argv[2] || 'vite/src/data/recipeData.js'
if (!fs.existsSync(file)) throw new Error(`Recipe dataset not found: ${file}`)
const { RECIPE_BOOK } = await import(path.resolve(file))
const rows = RECIPE_BOOK?.recipes || []; const ids = new Set(); const errors=[]; const warnings=[]
for (const r of rows) {
  if (!r.id || ids.has(r.id)) errors.push(`duplicate/missing id: ${r.id || '(empty)'}`); ids.add(r.id)
  if (!r.disease || !r.originalText) errors.push(`${r.id}: missing disease or source text`)
  if (!Number.isInteger(r.sourcePageStart) || !Number.isInteger(r.sourcePageEnd) || r.sourcePageEnd < r.sourcePageStart) errors.push(`${r.id}: invalid source pages`)
  if (!r.category) warnings.push(`${r.id}: missing category`)
  if (!(r.ingredients || []).length) warnings.push(`${r.id}: no ingredient candidates`)
}
const status = name => rows.filter(r => r.reviewStatus === name).length
const safety = name => rows.filter(r => r.safetyStatus === name).length
console.log(JSON.stringify({ book: RECIPE_BOOK.title, recipes: rows.length, categories: new Set(rows.map(r=>r.category).filter(Boolean)).size, review: { needs_review:status('needs_review'), approved:status('approved'), rejected:status('rejected') }, safety: { unreviewed:safety('unreviewed'), reviewed:safety('reviewed'), blocked:safety('blocked') }, errors: errors.length, warnings: warnings.length }, null, 2))
if (errors.length) { console.error(errors.slice(0, 20).join('\n')); process.exitCode=1 }
