import { Capacitor } from '@capacitor/core'
import { distanceBetween, geohashForLocation, geohashQueryBounds } from 'geofire-common'
import type { StoreLocation } from './types'

export interface LatLng {
  lat: number
  lng: number
}

/** Patiala, used as the map's starting view before the user picks a spot. */
export const DEFAULT_CENTER: LatLng = { lat: 30.3398, lng: 76.3869 }

export async function getCurrentPosition(): Promise<LatLng> {
  if (Capacitor.isNativePlatform()) {
    const { Geolocation } = await import('@capacitor/geolocation')
    const perm = await Geolocation.requestPermissions()
    if (perm.location === 'denied') throw new Error('Location permission denied')
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000 })
    return { lat: pos.coords.latitude, lng: pos.coords.longitude }
  }
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation is not available in this browser'))
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      (err) => reject(new Error(err.code === err.PERMISSION_DENIED ? 'Location permission denied' : 'Could not get your location')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  })
}

interface NominatimAddress {
  display_name?: string
  address?: Record<string, string>
  lat?: string
  lon?: string
}

function areaOf(a: Record<string, string>): string | undefined {
  return a.neighbourhood || a.suburb || a.quarter || a.road || a.village || a.town || a.city || a.county
}

function formatAddress(j: NominatimAddress, p: LatLng): string {
  const a = j.address ?? {}
  const parts = [a.shop || a.amenity || a.building, a.road, a.neighbourhood || a.suburb, a.city || a.town || a.village, a.state, a.postcode].filter(Boolean)
  return parts.length ? parts.join(', ') : (j.display_name ?? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`)
}

const NOMINATIM_HEADERS = { Accept: 'application/json', 'Accept-Language': 'en' }

/** Free reverse geocoding via OpenStreetMap's Nominatim (fair-use: low volume, identified client). */
export async function reverseGeocode(p: LatLng): Promise<StoreLocation> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}&zoom=17&addressdetails=1`
  const res = await fetch(url, { headers: NOMINATIM_HEADERS })
  if (!res.ok) throw new Error('Address lookup failed')
  const j = (await res.json()) as NominatimAddress
  return { lat: p.lat, lng: p.lng, address: formatAddress(j, p), area: areaOf(j.address ?? {}) }
}

/** Free forward geocoding: "Leela Bhawan, Patiala" → candidates. */
export async function searchPlace(query: string): Promise<StoreLocation[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=5&countrycodes=in&q=${encodeURIComponent(query)}`
  const res = await fetch(url, { headers: NOMINATIM_HEADERS })
  if (!res.ok) throw new Error('Place search failed')
  const list = (await res.json()) as NominatimAddress[]
  return list
    .filter((j) => j.lat && j.lon)
    .map((j) => {
      const p = { lat: Number(j.lat), lng: Number(j.lon) }
      return { ...p, address: j.display_name ?? formatAddress(j, p), area: areaOf(j.address ?? {}) }
    })
}

// ---------- geohash helpers (geofire-common) ----------

export const geohashOf = (p: LatLng) => geohashForLocation([p.lat, p.lng])

/** Query bounds for Firestore `orderBy('geohash').startAt().endAt()`. */
export const geohashBounds = (center: LatLng, radiusKm: number) => geohashQueryBounds([center.lat, center.lng], radiusKm * 1000)

export const distanceKm = (a: LatLng, b: LatLng) => distanceBetween([a.lat, a.lng], [b.lat, b.lng])

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round(km * 1000 / 50) * 50)} m`
  if (km < 10) return `${km.toFixed(1)} km`
  return `${Math.round(km)} km`
}

/** Short label derived from a saved location, for cards and chips. */
export function areaLabel(loc: StoreLocation | null | undefined): string {
  if (!loc) return ''
  if (loc.area) return loc.area
  const first = loc.address.split(',').map((s) => s.trim()).find((s) => s.length >= 3 && !/^\d+$/.test(s))
  return first ?? `${loc.lat.toFixed(3)}, ${loc.lng.toFixed(3)}`
}

export function mapsLink(p: LatLng) {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`
}
