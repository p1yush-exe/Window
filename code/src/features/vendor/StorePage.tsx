import { Link, useParams } from 'react-router'
import { AvailabilityBadge, Avatar, Badge, EmptyState, FullPageSpinner, ProductImage, Stars } from '@/components/ui'
import { formatPrice } from '@/lib/format'
import { mapsLink } from '@/lib/geo'
import { ReviewList, useReviews } from '@/features/reviews/ReviewList'
import { ratingSummary } from '@/lib/db'
import { useVendor, useVendorProducts } from './useVendor'

export function StorePage() {
  const { vendorId = '' } = useParams()
  const vendor = useVendor(vendorId)
  const { products } = useVendorProducts(vendorId)
  const reviews = useReviews({ vendorId })

  if (vendor === undefined || products === null) return <FullPageSpinner />
  if (!vendor) return <EmptyState icon="🏚️" title="Store not found" />
  const summary = ratingSummary(reviews ?? [])

  return (
    <div className="px-4 pt-4 md:pt-8">
      {vendor.storefrontUrl && (
        <img src={vendor.storefrontUrl} alt={`${vendor.name} storefront`} className="mb-4 aspect-[16/9] w-full rounded-2xl object-cover ring-1 ring-black/5" />
      )}
      <div className="mb-3 flex items-center gap-4">
        <Avatar name={vendor.name} url={vendor.logoUrl ?? vendor.storefrontUrl} size={64} />
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            {vendor.name} {vendor.verified && <Badge tone="brand">Verified</Badge>}
          </h1>
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            {summary.avg !== null ? (
              <>
                <Stars value={summary.avg} size="sm" /> {summary.avg} · {summary.count} review{summary.count === 1 ? '' : 's'}
              </>
            ) : (
              'No reviews yet'
            )}
          </div>
        </div>
      </div>
      {vendor.tags?.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {vendor.tags.map((t) => (
            <Badge key={t} tone="neutral">{t}</Badge>
          ))}
        </div>
      )}
      {vendor.description && <p className="mb-3 text-sm text-neutral-700">{vendor.description}</p>}
      <div className="mb-5 space-y-1 text-sm">
        {vendor.location && (
          <a href={mapsLink(vendor.location)} target="_blank" rel="noreferrer" className="flex items-start gap-2 text-neutral-700">
            <span>📍</span>
            <span className="underline decoration-neutral-300">{vendor.location.address || `${vendor.location.lat.toFixed(4)}, ${vendor.location.lng.toFixed(4)}`}</span>
          </a>
        )}
        {vendor.website && (
          <a href={vendor.website} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-brand-700">
            <span>🔗</span>
            <span className="underline">{vendor.website.replace(/^https?:\/\//, '')}</span>
          </a>
        )}
        {vendor.ownerName && (
          <p className="flex items-center gap-2 text-neutral-500">
            <span>👤</span>
            <span>Owner: {vendor.ownerName}{vendor.phoneVerified ? ' · phone verified' : ''}</span>
          </p>
        )}
      </div>

      <h2 className="mb-2 text-lg font-semibold">Products</h2>
      {products.length === 0 ? (
        <p className="text-sm text-neutral-500">Nothing listed yet.</p>
      ) : (
        <ul className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {products.map((p) => (
            <li key={p.id} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
              <Link to={`/product/${p.id}`}>
                <ProductImage src={p.imageUrls[0]} alt={p.title} className="aspect-[3/4] w-full" />
                <div className="p-3">
                  <AvailabilityBadge value={p.availability} />
                  <p className="mt-1 line-clamp-1 text-sm font-semibold">{p.title}</p>
                  <p className="text-xs text-neutral-500">{formatPrice(p.price, p.currency)}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-2 text-lg font-semibold">Reviews</h2>
      <ReviewList reviews={reviews} showProduct />
    </div>
  )
}
