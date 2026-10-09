import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AvailabilityBadge, Badge, Button, EmptyState, FullPageSpinner, ProductImage, Stars } from '@/components/ui'
import { ChevronLeft, HeartPlus, ICON, ICON_SM, Package } from '@/components/icons'
import { useAuth } from '@/features/auth/AuthProvider'
import { priceRange } from '@/features/feed/SwipeCard'
import { ReviewList, useReviews } from '@/features/reviews/ReviewList'
import { getMatch, listenProduct, ratingSummary } from '@/lib/db'
import { matchIdFor, type Match, type Product } from '@/lib/types'

export function ProductPage() {
  const { productId = '' } = useParams()
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [match, setMatch] = useState<Match | null>(null)
  const [active, setActive] = useState(0)
  const reviews = useReviews({ productId })

  useEffect(() => listenProduct(productId, setProduct), [productId])
  const uid = profile?.uid
  useEffect(() => {
    if (!uid) return
    getMatch(matchIdFor(uid, productId)).then(setMatch).catch(() => setMatch(null))
  }, [uid, productId])

  if (product === undefined) return <FullPageSpinner />
  if (!product) return <EmptyState icon={<Package size={28} strokeWidth={1.75} absoluteStrokeWidth />} title="Product not found" body="It may have been removed by the seller." />
  const summary = ratingSummary(reviews ?? [])
  const isOwner = product.vendorId === profile?.uid

  return (
    <div className="pt-0 pb-6">
      <div className="relative bg-[#f7f7f7]">
        <ProductImage src={product.imageUrls[active] ?? product.imageUrls[0]} alt={product.title} className="mx-auto aspect-[3/4] w-full max-w-md border-y border-charcoal" />
        <button type="button" onClick={() => navigate(-1)} className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded border-2 border-faded-gray bg-white/90 text-charcoal" aria-label="Back">
          <ChevronLeft {...ICON} />
        </button>
        {product.imageUrls.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {product.imageUrls.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`h-1.5 ${i === active ? 'w-5 bg-eager-green' : 'w-1.5 bg-white/60'}`} aria-label={`Image ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pt-4">
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          <AvailabilityBadge value={product.availability} />
          {product.superOnly && <Badge tone="accent"><HeartPlus {...ICON_SM} size={11} className="mr-1" />Super only</Badge>}
          {product.tags?.map((t) => <Badge key={t}>{t}</Badge>)}
        </div>
        <p className="label mt-2">{product.productCode}</p>
        <h1 className="text-[29px] leading-tight ">{product.title}</h1>
        <p className="mt-1 font-mono text-[18px] text-charcoal">{priceRange(product)}</p>
        <p className="font-mono text-[11px] text-pencil-gray uppercase">{product.paymentModes?.join(' · ') || 'ask the seller'}</p>
        <Link to={`/shop/${product.shopId}`} className="mt-2 inline-block font-mono text-[12px] text-spark-blue uppercase underline">{product.shopName || product.vendorName}</Link>
        {product.description && <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-wrap text-charcoal">{product.description}</p>}

        <div className="mt-4 flex gap-2">
          {isOwner ? (
            <Link to={`/vendor/product/${product.id}`} className="flex-1"><Button variant="secondary" className="w-full">Edit product</Button></Link>
          ) : match ? (
            <Link to={`/bag/chat/${match.id}`} className="flex-1"><Button className="w-full">Open chat with seller</Button></Link>
          ) : (
            <Link to="/feed" className="flex-1"><Button variant="secondary" className="w-full">Like it in the feed to chat</Button></Link>
          )}
        </div>

        <div className="mt-6 mb-2 flex items-center justify-between">
          <h2 className="text-[22px] ">Reviews</h2>
          {summary.avg !== null && <span className="flex items-center gap-1 font-mono text-[12px] text-pencil-gray"><Stars value={summary.avg} size="sm" /> {summary.avg} ({summary.count})</span>}
        </div>
        <ReviewList reviews={reviews} />
      </div>
    </div>
  )
}
