import type { StoreLocation } from './types'

export interface ShopperPrefs {
  location: StoreLocation | null
  interests: string[]
  radiusKm: number | null
}

const KEY = 'window.shopper.v1'

export function getShopperPrefs(): ShopperPrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { location: null, interests: [], radiusKm: null }
    const p = JSON.parse(raw) as Partial<ShopperPrefs>
    return { location: p.location ?? null, interests: Array.isArray(p.interests) ? p.interests.slice(0, 3) : [], radiusKm: p.radiusKm ?? null }
  } catch {
    return { location: null, interests: [], radiusKm: null }
  }
}

export function setShopperPrefs(p: Partial<ShopperPrefs>) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...getShopperPrefs(), ...p }))
  } catch {
    /* ignore */
  }
}

export const hasShopperPrefs = () => getShopperPrefs().location !== null
