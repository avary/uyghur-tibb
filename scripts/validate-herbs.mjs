#!/usr/bin/env node
import fs from 'node:fs'
const file = process.argv[2] || 'vite/src/data/herbData.js'
if (!fs.existsSync(file)) throw new Error(`Herb dataset not found: ${file}`)
const text = fs.readFileSync(file, 'utf8')
const match = text.match(/export const HERB_BOOK = (\{[\s\S]*\})\s*$/u)
if (!match) throw new Error('Expected generated HERB_BOOK export')
const book = Function(`"use strict"; return (${match[1]})`)()
const herbs = Array.isArray(book.herbs) ? book.herbs : []
const errors = []; const warnings = []; const ids = new Set()
if (!String(book.id || '').trim()) errors.push('book: missing stable id')
if (!String(book.title || '').trim()) errors.push('book: missing title')
if (!/^(ug|tr|en)$/.test(String(book.language || ''))) errors.push('book: language must be ug, tr, or en')
for (const [index, herb] of herbs.entries()) {
  const label = `herb #${index + 1}`
  if (!herb.id) errors.push(`${label}: missing id`)
  else if (ids.has(herb.id)) errors.push(`${label}: duplicate id ${herb.id}`)
  else ids.add(herb.id)
  if (!String(herb.name || '').trim()) errors.push(`${label}: missing name`)
  if (!String(herb.originalText || '').trim()) warnings.push(`${label}: missing original OCR text`)
  if (!herb.sourcePageStart) warnings.push(`${label}: missing source page`)
  if (herb.reviewStatus !== 'needs_review') errors.push(`${label}: must start as needs_review`)
  if (herb.safetyStatus !== 'unreviewed') errors.push(`${label}: must start as safety unreviewed`)
}
console.log(`Herb book: ${book.title || '(untitled)'}`)
console.log(`Records: ${herbs.length} · errors: ${errors.length} · warnings: ${warnings.length}`)
for (const item of errors) console.error(`ERROR: ${item}`)
for (const item of warnings.slice(0, 20)) console.warn(`WARN: ${item}`)
if (warnings.length > 20) console.warn(`WARN: ${warnings.length - 20} more warnings`)
if (errors.length) process.exitCode = 1
