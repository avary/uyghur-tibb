#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
const input = process.argv[2] || '/Users/m4mac/kitabim-ocr-work/upload-1788418400193/pages.json'
const output = process.argv[3] || 'vite/src/data/recipeData.js'
const bookId = process.env.RECIPE_BOOK_ID || '528779b9dc09'
const bookTitle = process.env.RECIPE_BOOK_TITLE || 'يۈز كېسەلگە مىڭ رېتسېپ'
const bookSubtitle = process.env.RECIPE_BOOK_SUBTITLE || '100 كېسەللىك ئۈچۈن 1000 ئەنئەنىۋى رېتسېپ'
const bookYear = process.env.RECIPE_BOOK_YEAR ? Number(process.env.RECIPE_BOOK_YEAR) : 2005
const bookLanguage = process.env.RECIPE_BOOK_LANGUAGE || 'ug'
const bookPdf = process.env.RECIPE_BOOK_PDF || 'pdf/100-keselge-1000-retsip.pdf'
const pages = JSON.parse(fs.readFileSync(input, 'utf8'))
const recipes = []; let category = ''; let disease = ''; let current = null
const categoryByDisease = new Map(); const categoryNames = new Set(); let tocCategory = ''
for (const page of pages.filter(p => p.is_toc)) for (const line of (page.text || '').split('\n')) {
  const heading = line.match(/^#{2,3}\s+(.+)$/u)
  if (heading && heading[1].trim() !== 'مۇندەرىجە') { tocCategory = heading[1].trim(); categoryNames.add(tocCategory); continue }
  const row = line.match(/^\|\s*(.+?)\s*\|\s*\d+\s*\|$/u)
  if (row && tocCategory) categoryByDisease.set(row[1].trim(), tocCategory)
}
const clean = s => String(s || '').replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
function ingredientCandidates(text) {
  const found = new Set()
  for (const part of String(text || '').split(/[،,؛;]/u)) {
    const value = part.trim()
    if (value.length >= 2 && value.length <= 100 && /(بىر|ئىككى|ئۈچ|تۆت|بەش|ئالتە|يەتتە|ئون|چىمدىم|پىيالە|قوشۇق|دانە|مىقدار)/u.test(value)) found.add(value)
  }
  return [...found].slice(0, 30).map(name => ({ name, quantity: '', unit: '', preparation_note: '' }))
}
const finish = end => { if (!current) return; current.sourcePageEnd = end; current.originalText = clean(current.originalText); current.cleanedText = current.originalText; current.reviewStatus = 'needs_review'; current.safetyStatus = 'unreviewed'; recipes.push(current); current = null }
for (const page of pages) for (const line of (page.text || '').split('\n')) {
  const h = line.match(/^(##|###)\s+(.+)$/u); if (h && !page.is_toc) { const heading = h[2].trim(); if (categoryNames.has(heading)) { category = heading; continue } finish(page.page_number); disease = heading; category = categoryByDisease.get(disease) || category; continue }
  const m = !line.includes('كېسەلگە') && !line.includes('1000 رېتسېپ') && line.match(/^(?:#{1,6}\s*)?(\d{1,4})[^\n]{0,18}?ر(?:ېتسېپ|پسیپ)\s*:?/u)
  if (m && !page.is_toc) { finish(page.page_number); current = { id: `book-${bookId}-r${String(recipes.length + 1).padStart(4, '0')}`, bookId, recipeNumber: m[1], disease: disease || '未分類', category, sourcePageStart: page.page_number, originalText: line.replace(m[0], '').trim(), ingredients: [], preparation: '', usage: '' }; continue }
  if (current) current.originalText += `\n${line}`
}
finish(pages.length)
for (const recipe of recipes) recipe.ingredients = ingredientCandidates(recipe.originalText)
const book = { id: bookId, title: bookTitle, subtitle: bookSubtitle, sourceYear: bookYear, language: bookLanguage, totalPages: pages.length, sourcePdf: bookPdf, copyrightStatus: 'verify_permission', recipes }
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `// Generated locally by scripts/import-recipes.mjs.\nexport const RECIPE_BOOK = ${JSON.stringify(book, null, 2)}\n`)
console.log(`Imported ${recipes.length} recipes from ${pages.length} pages for ${bookTitle}`)
