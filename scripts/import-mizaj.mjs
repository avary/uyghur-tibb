#!/usr/bin/env node
// Convert the local Mizaj OCR page export into a private Vite module.
import fs from 'node:fs'
import path from 'node:path'

const input = process.argv[2] || 'vite/src/data/mizaj.json'
const output = process.argv[3] || 'vite/src/data/mizajData.js'
if (!fs.existsSync(input)) throw new Error(`Mizaj OCR file not found: ${input}`)
const source = JSON.parse(fs.readFileSync(input, 'utf8'))
if (!Array.isArray(source) || !source.length) throw new Error('Expected a non-empty Mizaj page array')
const pages = source.map((page, index) => ({
  pageNumber: Number(page.pageNumber) || index + 1,
  displayPageNumber: String(page.displayPageNumber || page.pageNumber || index + 1),
  text: String(page.text || '').trim(),
  isToc: page.isToc === true
}))
const headings = pages.flatMap(page => [...page.text.matchAll(/^(#{2,3})\s+(.+)$/gm)].map(match => ({ title: match[2].trim(), pageNumber: page.pageNumber })))
const sections = headings.map((heading, i) => { const next = headings[i + 1]; const sourcePages = pages.filter(p => p.pageNumber >= heading.pageNumber && (!next || p.pageNumber < next.pageNumber)); return { id: `mizaj-${i + 1}`, title: heading.title, startPage: heading.pageNumber, endPage: sourcePages.at(-1)?.pageNumber || heading.pageNumber, text: sourcePages.map(p => p.text).join('\n\n'), sourcePages: sourcePages.map(p => ({ pageNumber: p.pageNumber, displayPageNumber: p.displayPageNumber, text: p.text })) } })
const result = { id: 'mizaj-saghlamliq', title: 'ئۇيغۇرلاردا مىزاج ۋە ساغلاملىق', subtitle: 'مىزاج، پەسىل ۋە ئوزۇقلىنىش ھەققىدىكى مەنبە كىتاب', language: 'ug', pages, headings, sections }
fs.mkdirSync(path.dirname(output), { recursive: true })
fs.writeFileSync(output, `// Generated locally by scripts/import-mizaj.mjs. Keep private.\nexport const MIZAJ_BOOK = ${JSON.stringify(result, null, 2)}\n`)
console.log(`Imported ${pages.length} Mizaj OCR pages and ${headings.length} headings into ${output}`)
