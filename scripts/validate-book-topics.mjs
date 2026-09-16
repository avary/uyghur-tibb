#!/usr/bin/env node
import fs from 'node:fs'

const input = process.argv[2] || 'vite/src/data/mizaj.json'
if (!fs.existsSync(input)) throw new Error(`Book OCR file not found: ${input}`)
const pages = JSON.parse(fs.readFileSync(input, 'utf8'))
if (!Array.isArray(pages) || !pages.length) throw new Error('Expected a non-empty page array')
const headings = pages.flatMap(page => [...String(page.text || '').matchAll(/^(#{2,3})\s+(.+)$/gm)].map(match => ({ title: match[2].trim(), page: Number(page.pageNumber) })))
const errors = []
const ids = new Set()
headings.forEach((heading, index) => {
  const id = `${input}-${index + 1}`
  if (ids.has(id)) errors.push(`duplicate section id: ${id}`)
  ids.add(id)
  if (!heading.title) errors.push(`empty heading on page ${heading.page}`)
  if (!Number.isFinite(heading.page)) errors.push(`invalid page number for heading: ${heading.title}`)
})
for (let i = 1; i < pages.length; i++) if (Number(pages[i].pageNumber) <= Number(pages[i - 1].pageNumber)) errors.push(`page order is not increasing at index ${i}`)
if (errors.length) { console.error(errors.join('\n')); process.exit(1) }
console.log(`Book topic validation passed: ${pages.length} pages, ${headings.length} headings`)
