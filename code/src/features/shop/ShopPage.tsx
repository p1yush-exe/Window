import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router'
import { Avatar, Badge, EmptyState, FullPageSpinner, ProductImage, Stars } from '@/components/ui'
import { BadgeCheck, Globe, ICON_SM, MapPin, Store, Zap } from '@/components/icons'
import { priceRange } from '@/features/feed/SwipeCard'
import { ReviewList, useReviews } from '@/features/reviews/ReviewList'
import { autoMatchActive, listenShop, listenShopProducts, ratingSummary } from '@/lib/db'
import { mapsLink } from '@/lib/geo'
import type { Product, Shop } from '@/lib/types'

export function ShopPage() {
  const { shopId = '' } = useParams()
  const [shop, setShop] = useState<Shop | null | undefined>(undefined)
  const [products, setProducts] = useState<Product[] | null>(null)
  useEffect(() => listenShop(shopId, setShop), [shopId])
  useEffect(() => listenShopProducts(shopId, setProducts), [shopId])
  const reviews = useReviews({ vendorId: shop?.ownerUid ?? '' })

  if (shop === undefined || products === null) return <FullPageSpinner />
  if (!shop) return <EmptyState icon={<Store size={28} strokeWidth={1.75} absoluteStrokeWidth />} title="Shop not found" />
  const summary = ratingSummary(reviews ?? [])
  const frame = shop.theme?.frame ?? 'none'
  const frameCls: Record<string, string> = { none: 'border-2 border-faded-gray', lime: 'border-2 border-eager-green', bone: 'border-[3px] border-charcoal', double: 'border-4 border-double border-charcoal', dashed: 'border-2 border-dashed border-charcoal' }

  return (
    <div className="pt-0 pb-6">
      {shop.storefrontUrl && <img src={shop.storefrontUrl} alt={`${shop.name} storefront`} className="aspect-[16/9] w-full object-cover" />}
      <div className="px-4 pt-4">
        <div className="flex items-center gap-4">
          <Avatar name={shop.name} url={shop.logoUrl ?? shop.storefrontUrl} size={56} />
          <div className="min-w-0">
            <h1 className="flex items-center gap-2 text-[29px] leading-none ">
              {shop.name} {shop.theme?.badge && <Badge tone="accent">{shop.theme.badge}</Badge>}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-2 font-mono text-[11px] text-pencil-gray uppercase">
              {summary.avg !== null ? <><Stars value={summary.avg} size="sm" /> {summary.avg} · {summary.count} review{summary.count === 1 ? '' : 's'}</> : 'No reviews yet'}
              {autoMatchActive(shop) && <span className="flex items-center gap-1 text-spark-blue"><Zap {...ICON_SM} size={12} /> Instant match</span>}
            </p>
          </div>
        </div>
        {shop.tags?.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{shop.tags.map((t) => <Badge key={t}>{t}</Badge>)}</div>}
        {shop.description && <p className="mt-3 text-[15px] leading-relaxed text-charcoal">{shop.description}</p>}
        <div className="mt-3 space-y-1 font-mono text-[12px]">
          {shop.location && (
            <a href={mapsLink(shop.location)} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-charcoal">
              <MapPin {...ICON_SM} className="mt-0.5 shrink-0" /><span className="underline decoration-faded-gray">{shop.location.address}</span>
            </a>
          )}
          {shop.website && (
            <a href={shop.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-spark-blue">
              <Globe {...ICON_SM} /><span className="underline">{shop.website.replace(/^https?:\/\//, '')}</span>
            </a>
          )}
          <p className="flex items-center gap-2 text-pencil-gray"><BadgeCheck {...ICON_SM} /> Owner verified by phone and email</p>
        </div>

        <h2 className="mt-6 mb-2 text-[22px] ">Products</h2>
        {products.length === 0 ? (
          <p className="text-[14px] text-pencil-gray">Nothing listed yet.</p>
        ) : (
          <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {products.map((p) => (
              <li key={p.id} className={frameCls[frame] ?? frameCls.none}>
                <Link to={`/product/${p.id}`}>
                  <ProductImage src={p.imageUrls[0]} alt={p.title} className="aspect-[3/4] w-full" />
                  <div className="p-2.5">
                    <p className="line-clamp-1 text-[14px] text-charcoal">{p.title}</p>
                    <p className="font-mono text-[11px] text-pencil-gray">{priceRange(p)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <h2 className="mb-2 text-[22px] ">Reviews</h2>
        <ReviewList reviews={reviews} showProduct />
      </div>
    </div>
  )
}
