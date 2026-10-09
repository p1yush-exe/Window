import { useState } from 'react'
import { motion } from 'motion/react'
import { Button, ErrorBanner, cx } from '@/components/ui'
import { Heart, HeartPlus, ICON, X } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { purchase } from '@/lib/db'
import { SUPER_BUNDLES, SWIPE_BUNDLES, type Bundle } from '@/lib/types'

export function Price({ bundle, className }: { bundle: Bundle; className?: string }) {
  return (
    <span className={cx('font-mono text-[13px]', className)}>
      <s className="mr-2 text-pencil-gray">₹{bundle.listPrice.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(bundle.listPrice) ? 0 : 2 })}</s>
      <span className="text-charcoal">₹{bundle.price.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(bundle.price) ? 0 : 2 })}</span>
    </span>
  )
}

/** Simulated checkout for swipe and super-swipe bundles. */
export function BuySwipesSheet({ kind: initialKind, onClose }: { kind: 'swipes' | 'superSwipes'; onClose: () => void }) {
  const { profile } = useSession()
  const [kind, setKind] = useState<'swipes' | 'superSwipes'>(initialKind)
  const bundles = kind === 'swipes' ? SWIPE_BUNDLES : SUPER_BUNDLES
  const [busy, setBusy] = useState<number | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function buy(b: Bundle) {
    setBusy(b.qty)
    setError(null)
    try {
      await purchase(profile.uid, kind, b.qty, b.price)
      setDone(`Added ${b.qty} ${kind === 'swipes' ? 'swipes' : 'super swipes'}.`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-black/60" onClick={onClose} />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-md border-t border-faded-gray bg-white p-5 pb-[calc(1.25rem+var(--safe-bottom))] md:top-1/2 md:bottom-auto md:-translate-y-1/2 md:border"
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex border-2 border-faded-gray font-mono text-[12px] uppercase">
          <button type="button" onClick={() => setKind('swipes')} className={cx('flex flex-1 items-center justify-center gap-2 py-2', kind === 'swipes' ? 'bg-eager-green text-white' : 'text-charcoal')}><Heart {...ICON} size={14} /> Swipes</button>
          <button type="button" onClick={() => setKind('superSwipes')} className={cx('flex flex-1 items-center justify-center gap-2 py-2', kind === 'superSwipes' ? 'bg-eager-green text-white' : 'text-charcoal')}><HeartPlus {...ICON} size={14} /> Super swipes</button>
        </div>
        <div className="flex items-start justify-between">
          <div>
            <p className="label">Swipe shop</p>
            <h2 className="mt-1 flex items-center gap-2 text-[29px] leading-none ">
              {kind === 'swipes' ? <Heart {...ICON} size={24} /> : <HeartPlus {...ICON} size={24} className="text-spark-blue" />}
              {kind === 'swipes' ? profile.swipes : profile.superSwipes} left
            </h2>
            <p className="mt-2 text-[14px] text-pencil-gray">
              {kind === 'swipes' ? 'You get 5 free swipes every day. A right swipe costs one.' : 'A super swipe claims the product: instant match, even on super-only listings.'}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded border-2 border-faded-gray p-1.5 text-charcoal" aria-label="Close">
            <X {...ICON} size={16} />
          </button>
        </div>
        <ul className="mt-4 divide-y divide-faded-gray border-y border-faded-gray">
          {bundles.map((b) => (
            <li key={b.qty} className="flex items-center justify-between gap-3 py-3">
              <div>
                <p className="font-mono text-[14px] text-charcoal">{b.qty} {kind === 'swipes' ? 'swipes' : 'super swipes'}</p>
                <Price bundle={b} />
              </div>
              <Button size="sm" loading={busy === b.qty} onClick={() => void buy(b)}>
                Buy
              </Button>
            </li>
          ))}
        </ul>
        {done && <p className="mt-3 font-mono text-[12px] text-spark-blue">{done}</p>}
        <ErrorBanner message={error} />
        <p className="mt-3 font-mono text-[11px] text-pencil-gray uppercase">Prototype: payments are simulated.</p>
      </motion.div>
    </>
  )
}
