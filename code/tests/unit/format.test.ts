import { describe, expect, it } from 'vitest'
import { formatPrice, initials, median, timeAgo } from '@/lib/format'
import { Timestamp } from 'firebase/firestore'

describe('formatPrice', () => {
  it('says ask for price when null', () => {
    expect(formatPrice(null)).toBe('Ask for price')
  })
  it('formats INR', () => {
    expect(formatPrice(1200)).toMatch(/1,200/)
  })
})

describe('median', () => {
  it('handles empty', () => expect(median([])).toBeNull())
  it('odd', () => expect(median([5, 1, 3])).toBe(3))
  it('even', () => expect(median([1, 2, 3, 4])).toBe(2.5))
})

describe('initials', () => {
  it('two words', () => expect(initials('Piyush Malik')).toBe('PM'))
  it('one word', () => expect(initials('bhuvik')).toBe('B'))
})

describe('timeAgo', () => {
  it('just now', () => {
    const now = Date.now()
    expect(timeAgo(Timestamp.fromMillis(now - 1000), now)).toBe('just now')
  })
  it('minutes', () => {
    const now = Date.now()
    expect(timeAgo(Timestamp.fromMillis(now - 5 * 60_000), now)).toBe('5m')
  })
})
