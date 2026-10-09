import { Capacitor } from '@capacitor/core'

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

/** Free reverse geocoding via OpenStreetMap's Nominatim (fair-use: low volume, identified client). */
export async function reverseGeocode(p: LatLng): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${p.lat}&lon=${p.lng}&zoom=17&addressdetails=1`
  const res = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error('Address lookup failed')
  const j = (await res.json()) as { display_name?: string; address?: Record<string, string> }
  const a = j.address ?? {}
  const parts = [a.shop || a.amenity || a.building, a.road, a.neighbourhood || a.suburb, a.city || a.town || a.village, a.state, a.postcode].filter(Boolean)
  return parts.length ? parts.join(', ') : (j.display_name ?? `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`)
}

export function mapsLink(p: LatLng) {
  return `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=17/${p.lat}/${p.lng}`
}
