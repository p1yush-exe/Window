import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button, EmptyState, ErrorBanner, FullPageSpinner, PageHeader, cx } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { listenNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/db'
import { timeAgo } from '@/lib/format'
import { telemetry } from '@/lib/telemetry'
import type { AppNotification } from '@/lib/types'

export function NotificationsPage() {
  const { profile } = useSession()
  const [items, setItems] = useState<AppNotification[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const seen = new Set<string>()
    const openedAt = Date.now()
    return listenNotifications(
      profile.uid,
      (n) => {
        for (const x of n) {
          if (seen.has(x.id)) continue
          seen.add(x.id)
          const sentAt = (x as AppNotification & { sentAt?: number }).sentAt
          if (sentAt && sentAt > openedAt) telemetry.record('availability_sync_ms', Date.now() - sentAt)
        }
        setItems(n)
      },
      (e) => setError(e.message),
    )
  }, [profile.uid])

  if (!items) return <FullPageSpinner />
  const unread = items.filter((i) => !i.read)

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader
        title="Alerts"
        subtitle="Stock updates for products you liked"
        right={
          unread.length > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => void markAllNotificationsRead(profile.uid, unread.map((u) => u.id))}>
              Mark all read
            </Button>
          ) : undefined
        }
      />
      <ErrorBanner message={error} />
      {items.length === 0 ? (
        <EmptyState icon="🔔" title="No alerts yet" body="When a seller updates stock on something you liked, it shows up here instantly." />
      ) : (
        <ul className="space-y-2">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                to={n.matchId ? `/chats/${n.matchId}` : n.productId ? `/product/${n.productId}` : '#'}
                onClick={() => {
                  if (!n.read) void markNotificationRead(profile.uid, n.id)
                }}
                className={cx('block rounded-2xl p-3 shadow-sm ring-1 ring-black/5', n.read ? 'bg-white' : 'bg-brand-50')}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cx('text-sm', n.read ? 'font-medium' : 'font-bold')}>{n.title}</p>
                  <span className="shrink-0 text-xs text-neutral-400">{timeAgo(n.createdAt)}</span>
                </div>
                <p className="text-sm text-neutral-600">{n.body}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
