import { describe, expect, it } from 'vitest'
import { countWords, newProductCode, SUPER_BUNDLES, SWIPE_BUNDLES, TOKEN_BUNDLES, todayKey } from '@/lib/types'

describe('product codes and words', () => {
  it('generates WN- codes of six safe characters', () => {
    const code = newProductCode()
    expect(code).toMatch(/^WN-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/)
    expect(newProductCode()).not.toBe(code)
  })
  it('counts words', () => {
    expect(countWords('')).toBe(0)
    expect(countWords('  one two\nthree ')).toBe(3)
  })
  it('today key is YYYY-MM-DD', () => {
    expect(todayKey(new Date(2026, 9, 9))).toBe('2026-10-09')
  })
})

describe('bundle pricing from the spec', () => {
  it('swipes', () => {
    expect(SWIPE_BUNDLES.map((b) => [b.qty, b.listPrice, b.price])).toEqual([[10, 444, 350], [15, 1111, 950], [25, 1333, 1200]])
  })
  it('super swipes', () => {
    expect(SUPER_BUNDLES.map((b) => [b.qty, b.listPrice, b.price])).toEqual([[5, 444, 350], [10, 1111, 950], [15, 1333, 1200]])
  })
  it('tokens', () => {
    expect(TOKEN_BUNDLES[0]).toEqual({ qty: 5, listPrice: 512.34, price: 499.99 })
    expect(TOKEN_BUNDLES[1]).toEqual({ qty: 10, listPrice: 1015.56, price: 999.99 })
    for (const b of TOKEN_BUNDLES) expect(b.price).toBeLessThan(b.listPrice)
  })
})
