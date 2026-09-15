import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

test('raw herb importer creates an isolated validated book', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uytibb-herbs-'))
  const input = path.join(dir, 'book.json')
  const output = path.join(dir, 'herbData-test-book.js')
  fs.writeFileSync(input, JSON.stringify({ title: 'Test raw herbs', entries: [{ name: 'ئۆرۈك', text: 'source text', page: 7 }] }))
  execFileSync(process.execPath, ['scripts/import-herbs.mjs', input, output], { env: { ...process.env, HERB_BOOK_ID: 'test-book' }, stdio: 'pipe' })
  const report = execFileSync(process.execPath, ['scripts/validate-herbs.mjs', output], { encoding: 'utf8' })
  assert.match(report, /Records: 1 · errors: 0/)
  const generated = fs.readFileSync(output, 'utf8')
  assert.match(generated, /test-book/)
  assert.match(generated, /"safetyStatus": "unreviewed"/)
})

test('herb validator rejects unsupported book language', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uytibb-herbs-invalid-'))
  const output = path.join(dir, 'herbData-invalid.js')
  fs.writeFileSync(output, 'export const HERB_BOOK = { id: "invalid", title: "Test", language: "xx", herbs: [] }\n')
  assert.throws(() => execFileSync(process.execPath, ['scripts/validate-herbs.mjs', output], { stdio: 'pipe' }), error => error && error.status === 1)
})
