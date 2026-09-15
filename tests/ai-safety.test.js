import test from 'node:test'
import assert from 'node:assert/strict'
import { isSafetyQuestion } from '../vite/src/data/aiSafety.js'

test('AI safety classifier catches diagnosis, dosage, and emergency requests', () => {
  assert.equal(isSafetyQuestion('دىياگنوز قويۇپ بېرىڭ'), true)
  assert.equal(isSafetyQuestion('دورا مىقدارى قانچە؟'), true)
  assert.equal(isSafetyQuestion('جىددىي ئالامەتتە نېمە قىلاي؟'), true)
})

test('AI safety classifier permits ordinary educational questions', () => {
  assert.equal(isSafetyQuestion('مىزاج دېگەن نېمە؟'), false)
  assert.equal(isSafetyQuestion('ئىبن سىنا ھەققىدە سۆزلەڭ'), false)
})
