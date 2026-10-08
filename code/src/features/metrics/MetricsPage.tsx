import { useEffect, useState } from 'react'
import { Button, Card, PageHeader } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { listenMatches } from '@/lib/db'
import { median, toMillis } from '@/lib/format'
import { telemetry, type MetricName } from '@/lib/telemetry'
import type { Match } from '@/lib/types'

const METRICS: Array<{ name: MetricName; label: string; target: number; desc: string }> = [
  { name: 'swipe_to_match_ms', label: 'Swipe → match latency', target: 2000, desc: 'Right swipe until the match is confirmed by the server (primary metric).' },
  { name: 'message_delivery_ms', label: 'Message delivery', target: 1000, desc: 'Sender clock to arrival on this device.' },
  { name: 'availability_sync_ms', label: 'Availability sync', target: 2000, desc: 'Seller stock change to alert arriving here.' },
]

export function MetricsPage() {
  const { profile } = useSession()
  const [tick, setTick] = useState(0)
  const [matches, setMatches] = useState<Match[]>([])
  useEffect(() => listenMatches(profile.uid, profile.role, setMatches), [profile.uid, profile.role])

  const serverLatencies = matches
    .map((m) => {
      const created = toMillis(m.createdAt)
      return created && m.swipeClientTs ? created - m.swipeClientTs : null
    })
    .filter((v): v is number => v !== null && v >= 0 && v < 60_000)

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader
        title="Evaluation metrics"
        subtitle="Measured on this device"
        right={
          <Button variant="secondary" size="sm" onClick={() => { telemetry.clear(); setTick(tick + 1) }}>Reset</Button>
        }
      />
      <div className="space-y-3">
        {METRICS.map((m) => {
          const samples = telemetry.samples(m.name).map((s) => s.value)
          const med = median(samples)
          const ok = med !== null && med <= m.target
          return (
            <Card key={m.name} className="p-4">
              <div className="flex items-baseline justify-between">
                <p className="font-semibold">{m.label}</p>
                <p className={`text-xl font-bold ${med === null ? 'text-neutral-400' : ok ? 'text-green-600' : 'text-rose-600'}`}>
                  {med === null ? '—' : `${med} ms`}
                </p>
              </div>
              <p className="text-xs text-neutral-500">{m.desc}</p>
              <p className="mt-1 text-xs text-neutral-400">
                target ≤ {m.target} ms · n = {samples.length}
                {samples.length > 0 && ` · max ${Math.max(...samples)} ms`}
              </p>
            </Card>
          )
        })}
        <Card className="p-4">
          <p className="font-semibold">Server-side swipe → match (all your matches)</p>
          <p className="text-xs text-neutral-500">Match createdAt (server) minus swipe client timestamp. Includes clock skew.</p>
          <p className="mt-1 text-xl font-bold">{median(serverLatencies) === null ? '—' : `${Math.round(median(serverLatencies)!)} ms`}</p>
          <p className="text-xs text-neutral-400">n = {serverLatencies.length}</p>
        </Card>
      </div>
    </div>
  )
}
