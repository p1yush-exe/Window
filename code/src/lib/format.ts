import type { Timestamp } from 'firebase/firestore'

export function formatPrice(price: number | null, currency = 'INR'): string {
  if (price === null || Number.isNaN(price)) return 'Ask for price'
  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency,
      maximumFractionDigits: price % 1 === 0 ? 0 : 2,
    }).format(price)
  } catch {
    return `${currency} ${price}`
  }
}

export function toMillis(ts: Timestamp | null | undefined): number | null {
  if (!ts) return null
  return typeof ts.toMillis === 'function' ? ts.toMillis() : null
}

export function timeAgo(ts: Timestamp | null | undefined, now = Date.now()): string {
  const ms = toMillis(ts)
  if (ms === null) return 'just now'
  const diff = Math.max(0, now - ms)
  const s = Math.floor(diff / 1000)
  if (s < 45) return 'just now'
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(ms).toLocaleDateString()
}

export function formatClock(ts: Timestamp | null | undefined): string {
  const ms = toMillis(ts)
  if (ms === null) return ''
  return new Date(ms).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}
