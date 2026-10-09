import { Link } from 'react-router'
import { Avatar, Button, EmptyState, ErrorBanner, FullPageSpinner, PageHeader, ProductImage, cx } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { useMatches } from '@/features/matches/useMatches'
import { timeAgo } from '@/lib/format'

export function ChatsPage() {
  const { profile } = useSession()
  const { matches, error } = useMatches(profile.uid, profile.role)
  if (!matches) return <FullPageSpinner />
  const isVendor = profile.role === 'vendor'

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader title="Chats" subtitle={isVendor ? 'Buyers interested in your products' : 'Your conversations with sellers'} />
      <ErrorBanner message={error} />
      {matches.length === 0 ? (
        <EmptyState
          icon="💬"
          title="No chats yet"
          body={isVendor ? 'When a shopper likes one of your products, a chat opens here.' : 'Like a product to start chatting with its seller.'}
          action={
            !isVendor ? (
              <Link to="/feed">
                <Button>Go to feed</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-canvas ring-1 ring-line">
          {matches.map((m) => {
            const unread = m.unread?.[profile.uid] ?? 0
            const other = isVendor ? m.buyerName : m.vendorName
            return (
              <li key={m.id}>
                <Link to={`/chats/${m.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-surface">
                  <div className="relative">
                    <ProductImage src={m.productImage} alt={m.productTitle} className="h-14 w-14 rounded-xl" />
                    <div className="absolute -right-1 -bottom-1 rounded ring-2 ring-canvas">
                      <Avatar name={other} size={22} />
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className={cx('truncate text-sm', unread ? 'font-bold' : 'font-semibold')}>{other}</p>
                      <span className="shrink-0 text-xs text-muted">{timeAgo(m.lastMessageAt)}</span>
                    </div>
                    <p className="truncate text-xs text-muted">{m.productTitle}</p>
                    <p className={cx('truncate text-sm', unread ? 'font-semibold text-ink' : 'text-muted')}>
                      {m.lastMessageText || (isVendor ? 'Liked your product · say hi!' : 'Say hi to the seller')}
                    </p>
                  </div>
                  {unread > 0 && <span className="rounded bg-accent px-2 py-0.5 font-mono text-[11px] text-on-accent">{unread}</span>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
