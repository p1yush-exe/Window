import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button, ErrorBanner } from '@/components/ui'
import { DEFAULT_CENTER, getCurrentPosition, reverseGeocode, type LatLng } from '@/lib/geo'

// Leaflet's default marker icons do not resolve under Vite; use an inline SVG pin.
const pin = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#6424f5;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg);margin:-28px 0 0 -14px"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

interface Props {
  value: { lat: number; lng: number; address: string } | null
  onChange: (v: { lat: number; lng: number; address: string }) => void
}

export function LocationPicker({ value, onChange }: Props) {
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState(value?.address ?? '')

  async function place(p: LatLng, lookup = true) {
    marker.current?.setLatLng(p)
    map.current?.setView(p, Math.max(map.current.getZoom(), 16))
    let addr = address
    if (lookup) {
      try {
        addr = await reverseGeocode(p)
      } catch {
        addr = `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`
      }
      setAddress(addr)
    }
    onChange({ lat: p.lat, lng: p.lng, address: addr })
  }

  useEffect(() => {
    if (!mapEl.current || map.current) return
    const start = value ? { lat: value.lat, lng: value.lng } : DEFAULT_CENTER
    const m = L.map(mapEl.current, { zoomControl: true, attributionControl: true }).setView(start, value ? 16 : 13)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(m)
    const mk = L.marker(start, { icon: pin, draggable: true }).addTo(m)
    mk.on('dragend', () => void place(mk.getLatLng()))
    m.on('click', (e: L.LeafletMouseEvent) => void place(e.latlng))
    map.current = m
    marker.current = mk
    setTimeout(() => m.invalidateSize(), 50)
    return () => {
      m.remove()
      map.current = null
      marker.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function locateMe() {
    setBusy(true)
    setError(null)
    try {
      const p = await getCurrentPosition()
      await place(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not get your location')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div ref={mapEl} className="h-64 w-full overflow-hidden rounded-2xl ring-1 ring-black/10" aria-label="Map" />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => void locateMe()} loading={busy}>
          📍 Use my GPS location
        </Button>
      </div>
      <p className="text-xs text-neutral-500">Drag the pin or tap the map to adjust.</p>
      <label className="block">
        <span className="mb-1 block text-sm font-medium text-neutral-700">Address</span>
        <textarea
          rows={2}
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            if (value) onChange({ ...value, address: e.target.value })
          }}
          placeholder="Shop number, street, area"
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-base outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100"
        />
      </label>
      <ErrorBanner message={error} />
    </div>
  )
}
