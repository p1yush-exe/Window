import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button, ErrorBanner, cx } from '@/components/ui'
import { ICON, MapPin } from '@/components/icons'
import { DEFAULT_CENTER, getCurrentPosition, reverseGeocode, searchPlace, type LatLng } from '@/lib/geo'
import type { StoreLocation } from '@/lib/types'

// Leaflet's default marker icons do not resolve under Vite; use an inline SVG pin.
const pin = L.divIcon({
  className: '',
  html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:#ebfc72;border:3px solid #fff;box-:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg);margin:-28px 0 0 -14px"></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 28],
})

interface Props {
  value: StoreLocation | null
  onChange: (v: StoreLocation) => void
  /** Show the "search an area" box (shoppers); sellers usually pin their exact shop. */
  searchable?: boolean
  compact?: boolean
}

export function LocationPicker({ value, onChange, searchable = true, compact = false }: Props) {
  const mapEl = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [address, setAddress] = useState(value?.address ?? '')
  const [area, setArea] = useState<string | undefined>(value?.area)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<StoreLocation[]>([])
  const [searching, setSearching] = useState(false)

  async function place(p: LatLng, lookup = true) {
    marker.current?.setLatLng(p)
    map.current?.setView(p, Math.max(map.current.getZoom(), 15))
    let loc: StoreLocation = { lat: p.lat, lng: p.lng, address, area }
    if (lookup) {
      try {
        loc = await reverseGeocode(p)
      } catch {
        loc = { lat: p.lat, lng: p.lng, address: `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}` }
      }
      setAddress(loc.address)
      setArea(loc.area)
    }
    onChange(loc)
  }

  async function search() {
    if (q.trim().length < 2) return
    setSearching(true)
    setError(null)
    try {
      const r = await searchPlace(q.trim())
      setResults(r)
      if (!r.length) setError('No places found. Try a landmark or city name.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed')
    } finally {
      setSearching(false)
    }
  }

  function pick(r: StoreLocation) {
    setResults([])
    setQ('')
    setAddress(r.address)
    setArea(r.area)
    marker.current?.setLatLng(r)
    map.current?.setView(r, 14)
    onChange(r)
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
      {searchable && (
        <div className="relative">
          <div className="flex gap-2">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  void search()
                }
              }}
              placeholder="Search an area, landmark or city"
              className="h-11 flex-1 border-0 border-b border-line bg-transparent text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent"
            />
            <Button type="button" variant="secondary" onClick={() => void search()} loading={searching}>Search</Button>
          </div>
          {results.length > 0 && (
            <ul className="absolute inset-x-0 z-[1000] mt-1 max-h-56 overflow-auto border border-line bg-canvas">
              {results.map((r, i) => (
                <li key={i}>
                  <button type="button" onClick={() => pick(r)} className="block w-full px-3 py-2 text-left text-[14px] text-ink hover:bg-surface">
                    {r.address}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div ref={mapEl} className={cx('w-full overflow-hidden rounded ring-1 ring-line', compact ? 'h-48' : 'h-64')} aria-label="Map" />
      <div className="flex gap-2">
        <Button type="button" variant="secondary" className="flex-1" onClick={() => void locateMe()} loading={busy}>
          <MapPin {...ICON} size={16} /> Use my GPS location
        </Button>
      </div>
      <p className="font-mono text-[11px] text-muted">Drag the pin or tap the map to adjust.</p>
      {!compact && (
        <label className="block">
          <span className="mb-1 block">Address</span>
          <textarea
            rows={2}
            value={address}
            onChange={(e) => {
              setAddress(e.target.value)
              if (value) onChange({ ...value, address: e.target.value, area })
            }}
            placeholder="Shop number, street, area"
            className="w-full border-0 border-b border-line bg-transparent py-2 text-[16px] text-ink outline-none placeholder:text-muted focus:border-accent"
          />
        </label>
      )}
      {compact && address && <p className="text-[14px] text-ink">{address}</p>}
      <ErrorBanner message={error} />
    </div>
  )
}
