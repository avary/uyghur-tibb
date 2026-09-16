#!/usr/bin/env node
import fs from 'node:fs'
import crypto from 'node:crypto'

const files = process.argv.slice(2)
if (files.length < 2) throw new Error('Usage: node scripts/compare-book-sources.mjs book-a.json book-b.json')
const hashes = files.map(file => {
  if (!fs.existsSync(file)) throw new Error(`Book OCR file not found: ${file}`)
  return { file, hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }
})
console.log(hashes.map(item => `${item.hash}  ${item.file}`).join('\n'))
if (new Set(hashes.map(item => item.hash)).size === 1) console.log('Duplicate source detected: these files contain identical OCR data.')
else console.log('Sources differ: keep them as separate books.')
