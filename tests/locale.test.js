import test from 'node:test'
import assert from 'node:assert/strict'
import { LOCALES } from '../vite/src/composables/locale.js'

test('locale foundation exposes supported languages and directions', () => {
  assert.deepEqual(LOCALES.map(item => item.id), ['ug', 'tr', 'en'])
  assert.equal(LOCALES.find(item => item.id === 'ug').dir, 'rtl')
  assert.equal(LOCALES.find(item => item.id === 'tr').dir, 'ltr')
})
