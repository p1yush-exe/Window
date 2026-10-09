import { useEffect, useState, type FormEvent } from 'react'
import { Button, ErrorBanner, Stars, Textarea } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { getReview, upsertReview } from '@/lib/db'
import type { Match } from '@/lib/types'

/** Shown in a buyer's chat once a conversation has started. */
export function ReviewPrompt({ match }: { match: Match }) {
  const { profile } = useSession()
  const [open, setOpen] = useState(false)
  const [existing, setExisting] = useState<number | null | undefined>(undefined)
  const [rating, setRating] = useState(0)
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    getReview(profile.uid, match.productId)
      .then((r) => {
        setExisting(r ? r.rating : null)
        if (r) {
          setRating(r.rating)
          setBody(r.body)
        }
      })
      .catch(() => setExisting(null))
  }, [profile.uid, match.productId])

  if (existing === undefined) return null

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (rating < 1) {
      setError('Pick a star rating')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await upsertReview(profile, { id: match.productId, vendorId: match.vendorId, title: match.productTitle }, rating, body.trim())
      setDone(true)
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save review')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-2 border-t border-line bg-surface px-3 py-2 text-xs text-accent-text">
        <span>{done || existing ? `You rated this ${rating}/5.` : `How was ${match.shopName || match.vendorName}?`}</span>
        <button type="button" className="font-semibold underline" onClick={() => setOpen(true)}>
          {done || existing ? 'Edit review' : 'Leave a review'}
        </button>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-line bg-canvas px-3 py-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Rate {match.productTitle}</p>
        <button type="button" className="text-xs text-muted underline" onClick={() => setOpen(false)}>Close</button>
      </div>
      <Stars value={rating} onChange={setRating} size="lg" />
      <Textarea name="reviewBody" rows={2} maxLength={400} placeholder="What was good or bad?" value={body} onChange={(e) => setBody(e.target.value)} />
      <ErrorBanner message={error} />
      <Button type="submit" size="sm" loading={busy}>Submit review</Button>
    </form>
  )
}
