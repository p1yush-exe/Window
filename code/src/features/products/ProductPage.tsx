import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { AvailabilityBadge, Button, EmptyState, FullPageSpinner, ProductImage, Stars } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { getMatch, listenProduct, ratingSummary } from '@/lib/db'
import { formatPrice } from '@/lib/format'
import { matchIdFor, type Match, type Product } from '@/lib/types'
import { ReviewList, useReviews } from '@/features/reviews/ReviewList'

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
  const role = profile?.role
  useEffect(() => {
    if (!uid || role !== 'buyer') return
    getMatch(matchIdFor(uid, productId)).then(setMatch).catch(() => setMatch(null))
  }, [uid, role, productId])

  if (product === undefined) return <FullPageSpinner />
  if (!product) return <EmptyState icon="🫥" title="Product not found" body="It may have been removed by the seller." />
  const summary = ratingSummary(reviews ?? [])
  const isOwner = product.vendorId === profile?.uid

  return (
    <div className="pb-6">
      <div className="relative bg-neutral-100">
        <ProductImage src={product.imageUrls[active] ?? product.imageUrls[0]} alt={product.title} className="mx-auto aspect-[3/4] w-full max-w-md md:rounded-b-3xl" />
        <button type="button" onClick={() => navigate(-1)} className="absolute top-3 left-3 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 shadow" aria-label="Back">
          ←
        </button>
        {product.imageUrls.length > 1 && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
            {product.imageUrls.map((_, i) => (
              <button key={i} onClick={() => setActive(i)} className={`h-1.5 rounded-full ${i === active ? 'w-5 bg-white' : 'w-1.5 bg-white/60'}`} aria-label={`Image ${i + 1}`} />
            ))}
          </div>
        )}
      </div>
      <div className="px-4 pt-4">
        <div className="mb-1 flex items-center gap-2">
          <AvailabilityBadge value={product.availability} />
          <span className="text-xs text-neutral-500">{product.category}</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">{product.title}</h1>
        <p className="text-lg font-semibold text-brand-700">{formatPrice(product.price, product.currency)}</p>
        <Link to={`/store/${product.vendorId}`} className="mt-1 inline-flex items-center gap-1 text-sm text-neutral-600 underline">
          {product.vendorName}
        </Link>
        {product.description && <p className="mt-3 text-sm whitespace-pre-wrap text-neutral-700">{product.description}</p>}

        <div className="mt-4 flex gap-2">
          {isOwner ? (
            <Link to={`/dashboard/edit/${product.id}`} className="flex-1">
              <Button variant="secondary" className="w-full">Edit product</Button>
            </Link>
          ) : match ? (
            <Link to={`/chats/${match.id}`} className="flex-1">
              <Button className="w-full">Open chat with seller</Button>
            </Link>
          ) : !profile || profile.role === 'buyer' ? (
            <Link to="/feed" className="flex-1">
              <Button variant="secondary" className="w-full">Like it in the feed to chat</Button>
            </Link>
          ) : null}
        </div>

        <div className="mt-6 mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Reviews</h2>
          {summary.avg !== null && (
            <span className="flex items-center gap-1 text-sm text-neutral-600">
              <Stars value={summary.avg} size="sm" /> {summary.avg} ({summary.count})
            </span>
          )}
        </div>
        <ReviewList reviews={reviews} />
      </div>
    </div>
  )
}
