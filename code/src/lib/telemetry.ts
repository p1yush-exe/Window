// Lightweight client-side telemetry for the evaluation metrics in the proposal.
// Kept in localStorage so the /metrics page can show numbers from this device.

export type MetricName = 'swipe_to_match_ms' | 'message_delivery_ms' | 'availability_sync_ms'

export interface MetricSample {
  name: MetricName
  value: number
  at: number
}

const KEY = 'window.telemetry.v1'
const MAX = 500

function load(): MetricSample[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as MetricSample[]) : []
  } catch {
    return []
  }
}

function save(samples: MetricSample[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(samples.slice(-MAX)))
  } catch {
    /* storage unavailable: ignore */
  }
}

export const telemetry = {
  record(name: MetricName, value: number) {
    if (!Number.isFinite(value) || value < 0) return
    const samples = load()
    samples.push({ name, value: Math.round(value), at: Date.now() })
    save(samples)
  },
  samples(name?: MetricName): MetricSample[] {
    const all = load()
    return name ? all.filter((s) => s.name === name) : all
  },
  clear() {
    save([])
  },
}
