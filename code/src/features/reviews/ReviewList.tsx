import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Avatar, Stars } from '@/components/ui'
import { listenReviews } from '@/lib/db'
import { timeAgo } from '@/lib/format'
import type { Review } from '@/lib/types'

export function useReviews(by: { productId: string } | { vendorId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null)
  const productId = 'productId' in by ? by.productId : null
  const vendorId = 'vendorId' in by ? by.vendorId : null
  useEffect(() => {
    const target = productId !== null ? { productId } : { vendorId: vendorId ?? '' }
    return listenReviews(target, setReviews, () => setReviews([]))
  }, [productId, vendorId])
  return reviews
}

export function ReviewList({ reviews, showProduct }: { reviews: Review[] | null; showProduct?: boolean }) {
  if (reviews === null) return <p className="text-sm text-neutral-400">Loading reviews…</p>
  if (reviews.length === 0) return <p className="text-sm text-neutral-500">No reviews yet.</p>
  return (
    <ul className="space-y-3">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center gap-2">
            <Avatar name={r.buyerName} size={28} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.buyerName}</p>
              {showProduct && (
                <Link to={`/product/${r.productId}`} className="truncate text-xs text-neutral-500 underline">{r.productTitle}</Link>
              )}
            </div>
            <span className="text-xs text-neutral-400">{timeAgo(r.createdAt)}</span>
          </div>
          <div className="mt-1">
            <Stars value={r.rating} size="sm" />
          </div>
          {r.body && <p className="mt-1 text-sm text-neutral-700">{r.body}</p>}
        </li>
      ))}
    </ul>
  )
}
