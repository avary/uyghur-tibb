#!/usr/bin/env node
// Normalize either future raw-herb JSON book into a review-gated, source-linked dataset.
import fs from 'node:fs'
import path from 'node:path'
const input = process.argv[2]
if (!input) throw new Error('Usage: node scripts/import-herbs.mjs <book.json> [output.js]')
const configuredBookId = process.env.HERB_BOOK_ID || ''
const source = JSON.parse(fs.readFileSync(input, 'utf8'))
const pages = Array.isArray(source) ? source : (source.pages || source.data?.pages || [])
const book = source.book || source.metadata || source
const records = Array.isArray(source.herbs) ? source.herbs : (source.entries || source.data?.herbs || [])
const value = (item, keys) => keys.map(k => item?.[k]).find(v => v !== undefined && v !== null && String(v).trim() !== '') || ''
const herbs = records.map((item, index) => {
  const name = String(value(item, ['name', 'uyghur_name', 'title', 'herb']) || `نامەلۇم خام دورا ${index + 1}`).trim()
  const page = Number(value(item, ['source_page', 'page', 'page_number'])) || null
  return { id: String(value(item, ['id', 'slug']) || `herb-${index + 1}`).trim(), bookId: String(value(book, ['id', 'book_id']) || 'raw-herbs-book').trim(), name, aliases: value(item, ['aliases', 'other_names']) || [], latinName: value(item, ['latin_name', 'scientific_name']), usedPart: value(item, ['used_part', 'part_used']), properties: value(item, ['properties', 'nature', 'actions']), preparation: value(item, ['preparation', 'usage']), warnings: value(item, ['warnings', 'cautions']), imageUrl: value(item, ['image_url', 'image']), originalText: String(value(item, ['original_text', 'text', 'description']) || '').trim(), sourcePageStart: page, sourcePageEnd: page, reviewStatus: 'needs_review' }
})
const result = { id: String(configuredBookId || value(book, ['id', 'book_id']) || 'raw-herbs-book'), title: String(value(book, ['title', 'name']) || path.basename(input)), subtitle: String(value(book, ['subtitle'])), language: String(value(book, ['language']) || 'ug'), totalPages: pages.length || Number(value(book, ['total_pages'])) || null, copyrightStatus: 'verify_permission', herbs }
const output = process.argv[3] || `vite/src/data/herbData-${result.id}.js`
fs.mkdirSync(path.dirname(output), { recursive: true }); fs.writeFileSync(output, `// Generated locally by scripts/import-herbs.mjs.\nexport const HERB_BOOK = ${JSON.stringify(result, null, 2)}\n`)
console.log(`Imported ${herbs.length} herb records from ${input}`)
