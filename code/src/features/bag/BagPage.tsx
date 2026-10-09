import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Button, EmptyState, ErrorBanner, FullPageSpinner, PageHeader, ProductImage, cx } from '@/components/ui'
import { HeartPlus, ICON_SM, MessageCircle, ShoppingBag } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { listenBuyerLikes, listenMatches } from '@/lib/db'
import { timeAgo } from '@/lib/format'
import type { Like, Match } from '@/lib/types'

/** Everything the shopper swiped right on, and the chats that came out of it. */
export function BagPage() {
  const { profile } = useSession()
  const [tab, setTab] = useState<'likes' | 'chats'>('likes')
  const [likes, setLikes] = useState<Like[] | null>(null)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const u1 = listenBuyerLikes(profile.uid, setLikes, (e) => setError(e.message))
    const u2 = listenMatches(profile.uid, 'buyer', setMatches, (e) => setError(e.message))
    return () => {
      u1()
      u2()
    }
  }, [profile.uid])

  if (!likes || !matches) return <FullPageSpinner />
  const unread = matches.filter((m) => (m.unread?.[profile.uid] ?? 0) > 0).length
  const statusTone: Record<Like['status'], string> = { pending: 'border-2 border-faded-gray text-pencil-gray', accepted: 'bg-eager-green text-white', declined: 'border-2 border-faded-gray text-pencil-gray line-through' }

  return (
    <div className="px-4 pt-4">
      <PageHeader eyebrow="Your bag" title={tab === 'likes' ? 'Liked products' : 'Chats'} subtitle={`${likes.length} liked · ${matches.length} matched`} />
      <div className="mb-4 flex border-2 border-faded-gray font-mono text-[12px] uppercase">
        <button type="button" onClick={() => setTab('likes')} className={cx('flex-1 py-2', tab === 'likes' ? 'bg-eager-green text-white' : 'text-charcoal')}>Liked</button>
        <button type="button" onClick={() => setTab('chats')} className={cx('flex-1 py-2', tab === 'chats' ? 'bg-eager-green text-white' : 'text-charcoal')}>
          Chats{unread ? ` · ${unread}` : ''}
        </button>
      </div>
      <ErrorBanner message={error} />

      {tab === 'likes' &&
        (likes.length === 0 ? (
          <EmptyState icon={<ShoppingBag size={28} strokeWidth={1.75} absoluteStrokeWidth />} title="Nothing in your bag" body="Swipe right on products you like. Sellers accept your like and a chat opens." action={<Link to="/feed"><Button>Start swiping</Button></Link>} />
        ) : (
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {likes.map((l) => (
              <li key={l.id} className="border-2 border-faded-gray">
                <Link to={`/product/${l.productId}`} className="block">
                  <ProductImage src={l.productImage} alt={l.productTitle} className="aspect-[3/4] w-full" />
                </Link>
                <div className="p-2.5">
                  <div className="mb-1 flex items-center gap-1">
                    <span className={cx('rounded px-[6px] py-[2px] font-mono text-[10px] uppercase', statusTone[l.status])}>{l.status === 'accepted' ? 'Matched' : l.status}</span>
                    {l.type === 'super' && <HeartPlus {...ICON_SM} size={12} className="text-spark-blue" />}
                  </div>
                  <p className="line-clamp-1 text-[14px] text-charcoal">{l.productTitle}</p>
                  {l.status === 'accepted' && (
                    <Link to={`/bag/chat/${l.id}`} className="mt-2 block">
                      <Button variant="secondary" size="sm" className="w-full"><MessageCircle {...ICON_SM} /> Chat</Button>
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'chats' &&
        (matches.length === 0 ? (
          <EmptyState icon={<MessageCircle size={28} strokeWidth={1.75} absoluteStrokeWidth />} title="No chats yet" body="When a seller accepts your like, or you super swipe, the chat appears here." />
        ) : (
          <ul className="divide-y divide-faded-gray border-2 border-faded-gray">
            {matches.map((m) => {
              const n = m.unread?.[profile.uid] ?? 0
              return (
                <li key={m.id}>
                  <Link to={`/bag/chat/${m.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-[#f7f7f7]">
                    <div className="relative">
                      <ProductImage src={m.productImage} alt={m.productTitle} className="h-14 w-14 border-2 border-faded-gray" />
                      <div className="absolute -right-1 -bottom-1"><Avatar name={m.shopName || m.vendorName} size={20} /></div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className={cx('truncate text-[15px]', n ? 'text-charcoal' : 'text-charcoal/90')}>{m.shopName || m.vendorName}</p>
                        <span className="shrink-0 font-mono text-[11px] text-pencil-gray">{timeAgo(m.lastMessageAt)}</span>
                      </div>
                      <p className="truncate font-mono text-[11px] text-pencil-gray uppercase">{m.productTitle}</p>
                      <p className={cx('truncate text-[13px]', n ? 'text-charcoal' : 'text-pencil-gray')}>{m.lastMessageText || 'Say hi to the seller'}</p>
                    </div>
                    {n > 0 && <span className="rounded bg-eager-green px-1.5 py-0.5 font-mono text-[11px] text-white">{n}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>
        ))}
    </div>
  )
}
