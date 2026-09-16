#!/usr/bin/env node
import { execFileSync } from 'node:child_process'

const forbidden = [
  'vite/src/data/recipeData.js',
  'vite/src/data/herbData-',
  'vite/src/data/farhiz.json',
  'vite/src/data/farhizData.js',
  'vite/src/data/mizaj.json',
  'vite/src/data/mizajData.js',
  'vite/public/pdf/',
  'vite/dist/pdf/',
]
const staged = execFileSync('git', ['diff', '--cached', '--name-only'], { encoding: 'utf8' })
  .split('\n').map(value => value.trim()).filter(Boolean)
const violations = staged.filter(file => forbidden.some(prefix => file === prefix || file.startsWith(prefix)))
if (violations.length) {
  console.error('Private OCR book files must remain local; unstage:')
  for (const file of violations) console.error(`- ${file}`)
  process.exit(1)
}
console.log(`Private-data Git check passed (${staged.length} staged files)`)
