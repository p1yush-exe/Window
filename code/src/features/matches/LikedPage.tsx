import { Link } from 'react-router'
import { AvailabilityBadge, Button, EmptyState, ErrorBanner, FullPageSpinner, PageHeader, ProductImage } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { toMillis } from '@/lib/format'
import { useMatches } from './useMatches'

export function LikedPage() {
  const { profile } = useSession()
  const { matches, error } = useMatches(profile.uid, 'buyer')

  if (!matches) return <FullPageSpinner />
  const sorted = [...matches].sort((a, b) => (toMillis(b.createdAt) ?? 0) - (toMillis(a.createdAt) ?? 0))

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader title="Liked" subtitle={`${matches.length} product${matches.length === 1 ? '' : 's'} you're interested in`} />
      <ErrorBanner message={error} />
      {sorted.length === 0 ? (
        <EmptyState
          icon="❤️"
          title="Nothing liked yet"
          body="Swipe right on products you like and they will show up here with live stock updates."
          action={
            <Link to="/feed">
              <Button>Start swiping</Button>
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {sorted.map((m) => (
            <li key={m.id} className="overflow-hidden rounded-2xl bg-canvas ring-1 ring-line">
              <Link to={`/product/${m.productId}`} className="block">
                <ProductImage src={m.productImage} alt={m.productTitle} className="aspect-[3/4] w-full" />
              </Link>
              <div className="p-3">
                <div className="mb-1">
                  <AvailabilityBadge value={m.productAvailability ?? 'in_stock'} />
                </div>
                <p className="line-clamp-1 text-sm font-semibold">{m.productTitle}</p>
                <p className="line-clamp-1 text-xs text-muted">{m.vendorName}</p>
                <Link to={`/chats/${m.id}`} className="mt-2 block">
                  <Button variant="secondary" size="sm" className="w-full">
                    Chat {m.unread?.[profile.uid] ? <span className="rounded bg-accent px-1.5 font-mono text-[10px] text-on-accent">{m.unread[profile.uid]}</span> : null}
                  </Button>
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
