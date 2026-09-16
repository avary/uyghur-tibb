import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'

test('book validator rejects identical comparison sources', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'uytibb-books-'))
  const first = path.join(dir, 'first.json')
  const second = path.join(dir, 'second.json')
  const pages = [{ pageNumber: 1, text: '## Same heading' }]
  fs.writeFileSync(first, JSON.stringify(pages))
  fs.writeFileSync(second, JSON.stringify(pages))
  assert.throws(
    () => execFileSync(process.execPath, ['scripts/validate-book-topics.mjs', first, '--different-from', second], { stdio: 'pipe' }),
    error => error && error.status === 1
  )
})
