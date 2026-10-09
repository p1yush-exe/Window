import { describe, expect, it } from 'vitest'
import { geohashForLocation } from 'geofire-common'
import { matchesInterests, rankFeed } from '@/features/feed/rank'
import type { Product } from '@/lib/types'

const center = { lat: 30.3398, lng: 76.3869 } // Patiala
const make = (id: string, lat: number, lng: number, category: Product['category'], vendorTags: string[] = []): Product => ({
  id, vendorId: 'v', vendorName: 'V', title: id, description: '', price: null, currency: 'INR', category,
  imageUrls: [], availability: 'in_stock', lat, lng, geohash: geohashForLocation([lat, lng]), area: null, vendorTags,
  createdAt: null, updatedAt: null,
})

describe('rankFeed', () => {
  const near = make('near', 30.345, 76.39, 'Shoes')
  const far = make('far', 28.61, 77.21, 'Clothes') // Delhi, ~230 km
  const mid = make('mid', 30.36, 76.40, 'Decor', ['Handmade'])
  it('drops products outside the radius', () => {
    const r = rankFeed([near, far, mid], center, 25, [])
    expect(r.map((p) => p.id)).toEqual(['near', 'mid'])
  })
  it('puts interest matches first, then nearest', () => {
    const r = rankFeed([near, mid], center, 25, ['Handmade'])
    expect(r[0]!.id).toBe('mid')
    expect(r[0]!.matchesInterests).toBe(true)
    expect(r[1]!.matchesInterests).toBe(false)
  })
  it('reports distance in km', () => {
    const r = rankFeed([near], center, 25, [])
    expect(r[0]!.distanceKm).toBeGreaterThan(0.3)
    expect(r[0]!.distanceKm).toBeLessThan(1.5)
  })
})

describe('matchesInterests', () => {
  it('matches category or vendor tags, case-insensitively', () => {
    expect(matchesInterests({ category: 'Shoes', vendorTags: [] }, ['shoes'])).toBe(true)
    expect(matchesInterests({ category: 'Decor', vendorTags: ['Handmade'] }, ['Handmade'])).toBe(true)
    expect(matchesInterests({ category: 'Decor', vendorTags: [] }, ['Shoes'])).toBe(false)
    expect(matchesInterests({ category: 'Decor', vendorTags: [] }, [])).toBe(false)
  })
})
