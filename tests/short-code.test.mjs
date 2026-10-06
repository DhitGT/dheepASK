import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createShortCode } from '../app/utils/shortCode.ts'
test('demo codes avoid collisions and use five readable letters', () => {
  const codes = new Set(['AAAAA', 'KTMXZ', 'ZZZZZ'])
  for (let index = 0; index < 1000; index++) {
    const code = createShortCode(codes)
    assert.match(code, /^[ABCDEFGHJKMNPQRSTUVWXYZ]{5}$/); assert.ok(!codes.has(code)); codes.add(code)
  }
})
