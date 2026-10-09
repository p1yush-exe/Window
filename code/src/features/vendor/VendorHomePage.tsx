import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { AvailabilityBadge, Avatar, Button, EmptyState, ErrorBanner, FullPageSpinner, ProductImage, Select, cx } from '@/components/ui'
import { Check, HeartPlus, ICON_SM, Inbox, MessageCircle, Package, ThumbsDown } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { priceRange } from '@/features/feed/SwipeCard'
import { acceptLike, declineLike, listenMatches, listenVendorLikes, setAvailability, uploadsLeft } from '@/lib/db'
import { timeAgo } from '@/lib/format'
import { AVAILABILITY_LABEL, type Availability, type Like, type Match, type Product } from '@/lib/types'
import { useOwnerShops, useVendor, useVendorProducts } from './useVendor'

type Tab = 'likes' | 'products' | 'chats'

export function VendorHomePage() {
  const { profile } = useSession()
  const vendor = useVendor(profile.uid)
  const { shops } = useOwnerShops(profile.uid)
  const { products, error } = useVendorProducts(profile.uid)
  const [likes, setLikes] = useState<Like[] | null>(null)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [tab, setTab] = useState<Tab>('likes')
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => listenVendorLikes(profile.uid, setLikes), [profile.uid])
  useEffect(() => listenMatches(profile.uid, 'vendor', setMatches), [profile.uid])

  async function decide(like: Like, accept: boolean) {
    if (!vendor) return
    setBusyId(like.id)
    try {
      if (accept) await acceptLike(like, vendor)
      else await declineLike(like)
      setToast(accept ? `Matched with ${like.buyerName}. Chat is open.` : 'Like declined.')
      setTimeout(() => setToast(null), 2500)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not update')
    } finally {
      setBusyId(null)
    }
  }

  async function changeAvailability(p: Product, value: Availability) {
    setBusyId(p.id)
    try {
      const n = await setAvailability(p, value)
      setToast(`${p.title}: ${AVAILABILITY_LABEL[value]}${n ? ` · ${n} buyer${n === 1 ? '' : 's'} notified` : ''}`)
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not update')
    } finally {
      setBusyId(null)
    }
  }

  if (vendor === undefined || products === null || likes === null || matches === null || shops === null) return <FullPageSpinner />
  const pending = likes.filter((l) => l.status === 'pending')
  const unread = matches.filter((m) => (m.unread?.[profile.uid] ?? 0) > 0).length
  const shopName = (id: string) => shops.find((s) => s.id === id)?.name ?? ''

  return (
    <div className="px-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="label">{shops.length === 1 ? shops[0]!.name : `${shops.length} shops`}</p>
          <h1 className="truncate text-[28px] leading-tight md:text-[36px]">{vendor?.ownerName ?? profile.displayName}</h1>
          {vendor && <p className="mt-0.5 text-[13px] font-bold text-pencil-gray">{uploadsLeft(vendor)} uploads left · {vendor.tokens} tokens</p>}
        </div>
        <Link to="/vendor/new" className="shrink-0"><Button size="sm" className="h-9 px-2.5 text-[12px] tracking-[0.03em]">+ Add</Button></Link>
      </div>
      <div className="mb-4 flex border-2 border-faded-gray font-mono text-[12px] uppercase">
        {(['likes', 'products', 'chats'] as Tab[]).map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={cx('flex-1 py-2', tab === t ? 'bg-eager-green text-white' : 'text-charcoal')}>
            {t}{t === 'likes' && pending.length ? ` · ${pending.length}` : ''}{t === 'chats' && unread ? ` · ${unread}` : ''}
          </button>
        ))}
      </div>
      <ErrorBanner message={error} />
      {toast && <div className="mb-3 border border-eager-green px-3 py-2 font-mono text-[12px] text-charcoal">{toast}</div>}

      {tab === 'likes' &&
        (pending.length === 0 ? (
          <EmptyState icon={<Inbox size={28} strokeWidth={1.75} absoluteStrokeWidth />} title="No likes waiting" body="When a shopper swipes right on a product, accept it here to open a chat. Super swipes match instantly." />
        ) : (
          <ul className="space-y-3">
            {pending.map((l) => (
              <li key={l.id} className="flex gap-3 border-2 border-faded-gray p-3">
                <ProductImage src={l.productImage} alt={l.productTitle} className="h-24 w-20 border-2 border-faded-gray" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Avatar name={l.buyerName} size={24} />
                    <p className="truncate text-[15px] text-charcoal">{l.buyerName}</p>
                    {l.type === 'super' && <HeartPlus {...ICON_SM} className="text-super" />}
                    <span className="ml-auto shrink-0 font-mono text-[11px] text-pencil-gray">{timeAgo(l.createdAt)}</span>
                  </div>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-pencil-gray uppercase">{l.productTitle} · {shopName(l.shopId)}</p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" loading={busyId === l.id} onClick={() => void decide(l, true)}><Check {...ICON_SM} /> Accept</Button>
                    <Button size="sm" variant="secondary" disabled={busyId === l.id} onClick={() => void decide(l, false)}><ThumbsDown {...ICON_SM} /> Pass</Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'products' &&
        (products.length === 0 ? (
          <EmptyState icon={<Package size={28} strokeWidth={1.75} absoluteStrokeWidth />} title="No products yet" body="Tap the plus button to photograph your first product." action={<Link to="/vendor/new"><Button>Add a product</Button></Link>} />
        ) : (
          <ul className="space-y-3">
            {products.map((p) => (
              <li key={p.id} className="flex gap-3 border-2 border-faded-gray p-3">
                <Link to={`/product/${p.id}`}><ProductImage src={p.imageUrls[0]} alt={p.title} className="h-24 w-20 border-2 border-faded-gray" /></Link>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[15px] text-charcoal">{p.title}</p>
                      <p className="font-mono text-[11px] text-pencil-gray uppercase">{p.productCode} · {priceRange(p)}</p>
                    </div>
                    <AvailabilityBadge value={p.availability} />
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Select aria-label="Availability" value={p.availability} disabled={busyId === p.id} onChange={(e) => void changeAvailability(p, e.target.value as Availability)} className="h-9 text-[12px]">
                      {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((k) => <option key={k} value={k}>{AVAILABILITY_LABEL[k]}</option>)}
                    </Select>
                    <Link to={`/vendor/product/${p.id}`}><Button variant="secondary" size="sm">Edit</Button></Link>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ))}

      {tab === 'chats' &&
        (matches.length === 0 ? (
          <EmptyState icon={<MessageCircle size={28} strokeWidth={1.75} absoluteStrokeWidth />} title="No chats yet" body="Accept a like, or wait for a super swipe, and the chat appears here." />
        ) : (
          <ul className="divide-y divide-faded-gray border-2 border-faded-gray">
            {matches.map((m) => {
              const n = m.unread?.[profile.uid] ?? 0
              return (
                <li key={m.id}>
                  <Link to={`/vendor/chat/${m.id}`} className="flex items-center gap-3 px-3 py-3 hover:bg-[#f7f7f7]">
                    <ProductImage src={m.productImage} alt={m.productTitle} className="h-14 w-14 border-2 border-faded-gray" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[15px] text-charcoal">{m.buyerName}</p>
                        <span className="shrink-0 font-mono text-[11px] text-pencil-gray">{timeAgo(m.lastMessageAt)}</span>
                      </div>
                      <p className="truncate font-mono text-[11px] text-pencil-gray uppercase">{m.productTitle}</p>
                      <p className={cx('truncate text-[13px]', n ? 'text-charcoal' : 'text-pencil-gray')}>{m.lastMessageText || 'Liked your product · say hi'}</p>
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
