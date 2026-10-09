import { useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router'
import { Button, ErrorBanner, FullPageSpinner, PageHeader, Textarea, cx } from '@/components/ui'
import { Check, Gem, ICON, ICON_SM, Pencil, Plus, Store, Ticket, Zap } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { Price } from '@/features/economy/BuySwipesSheet'
import { autoMatchActive, purchase, updateShop, uploadsLeft } from '@/lib/db'
import { AUTO_MATCH_PRICE_PER_DAY, DECORATIONS, TOKEN_BUNDLES, type Bundle, type Shop } from '@/lib/types'
import { useOwnerShops, useVendor } from './useVendor'

/** Bottom-left shop icon: shops, auto message, auto-matcher, decorations and upload tokens. */
export function ShopManagePage() {
  const { profile } = useSession()
  const vendor = useVendor(profile.uid)
  const { shops } = useOwnerShops(profile.uid)
  const [selected, setSelected] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [autoMsg, setAutoMsg] = useState<string | null>(null)

  if (vendor === undefined || shops === null) return <FullPageSpinner />
  if (!vendor) return <ErrorBanner message="Seller profile missing." />
  const shop = shops.find((s) => s.id === (selected ?? shops[0]?.id)) ?? null

  function note(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  async function run(key: string, fn: () => Promise<void>, done: string) {
    setBusy(key)
    setError(null)
    try {
      await fn()
      note(done)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setBusy(null)
    }
  }

  const buyTokens = (b: Bundle) => run(`t${b.qty}`, () => purchase(profile.uid, 'tokens', b.qty, b.price), `Added ${b.qty} tokens`)
  const buyAutoMatch = (s: Shop) => run('am', () => purchase(profile.uid, 'autoMatch', 1, AUTO_MATCH_PRICE_PER_DAY, { shopId: s.id }), 'Auto-matcher on for 24 hours')
  const buyDecoration = (s: Shop, id: string, price: number) => run(id, () => purchase(profile.uid, 'decoration', 1, price, { shopId: s.id, decorationId: id }), 'Decoration unlocked')
  const equip = (s: Shop, id: string) => {
    const d = DECORATIONS.find((x) => x.id === id)
    if (!d) return
    const theme = { frame: d.frame ?? s.theme?.frame ?? 'none', badge: d.badge ?? s.theme?.badge ?? null }
    return run(`eq${id}`, () => updateShop(s.id, { theme }), 'Applied to your cards')
  }
  const saveAutoMessage = (s: Shop) => run('msg', () => updateShop(s.id, { autoMessage: (autoMsg ?? s.autoMessage).trim() }), 'Auto message saved')

  return (
    <div className="px-4">
      <PageHeader eyebrow="Shop management" title={shop?.name ?? 'Your shops'} subtitle={`${vendor.tokens} tokens · ${uploadsLeft(vendor)} uploads left`} right={<Link to="/vendor/shop/new"><Button size="sm" variant="secondary"><Plus {...ICON_SM} /> Shop</Button></Link>} />
      {toast && <div className="mb-3 border border-accent px-3 py-2 font-mono text-[12px] text-ink">{toast}</div>}
      <ErrorBanner message={error} />

      {shops.length > 1 && (
        <div className="mb-4 flex gap-2 overflow-x-auto no-scrollbar">
          {shops.map((s) => (
            <button key={s.id} type="button" onClick={() => { setSelected(s.id); setAutoMsg(null) }} className={cx('shrink-0 rounded px-3 py-1.5 font-mono text-[12px] uppercase ring-1', shop?.id === s.id ? 'bg-ink text-canvas ring-ink' : 'text-ink ring-line')}>
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Upload tokens */}
      <section className="mb-5">
        <h2 className="mb-2 flex items-center gap-2 text-[22px] tracking-[-0.03em]"><Ticket {...ICON} /> Upload tokens</h2>
        <p className="mb-3 text-[14px] text-muted">One token lets you list 10 products. Tap a bundle to top up.</p>
        <ul className="grid grid-cols-2 gap-3">
          {TOKEN_BUNDLES.map((b, i) => (
            <motion.li key={b.qty} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }} whileTap={{ scale: 0.97 }} className={cx('token-shine relative overflow-hidden rounded border border-accent bg-canvas', i === 1 && 'token-glow')}>
              <button type="button" onClick={() => void buyTokens(b)} disabled={busy === `t${b.qty}`} className="block w-full p-3 text-left">
                <p className="font-mono text-[11px] text-muted uppercase">{i === 1 ? 'Most popular' : i === 3 ? 'Best value' : 'Bundle'}</p>
                <p className="mt-1 text-[29px] leading-none text-ink">{b.qty} <span className="font-mono text-[12px] text-muted uppercase">tokens</span></p>
                <p className="mt-1"><Price bundle={b} /></p>
                <p className="mt-2 font-mono text-[11px] text-accent-text uppercase">{busy === `t${b.qty}` ? 'Adding…' : `Tap to buy · ${b.qty * 10} uploads`}</p>
              </button>
            </motion.li>
          ))}
        </ul>
      </section>

      {shop && (
        <>
          {/* Shop details */}
          <section className="mb-5 border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="label">Shop</p>
                <p className="text-[18px] text-ink">{shop.name}</p>
                <p className="font-mono text-[11px] text-muted uppercase">{shop.tags.join(' · ') || 'no tags'} · {shop.location?.area ?? shop.location?.address?.split(',')[0] ?? 'no location'}</p>
              </div>
              <Link to={`/vendor/shop/${shop.id}`}><Button size="sm" variant="secondary"><Pencil {...ICON_SM} /> Edit</Button></Link>
            </div>
            <Link to={`/shop/${shop.id}`} className="mt-2 inline-flex items-center gap-1 font-mono text-[12px] text-accent-text uppercase underline"><Store {...ICON_SM} /> View as shopper</Link>
          </section>

          {/* Auto message */}
          <section className="mb-5 border border-line p-4">
            <h2 className="mb-1 text-[18px]">Auto message</h2>
            <p className="mb-3 text-[13px] text-muted">Sent as the first message in every new chat for this shop.</p>
            <Textarea name="autoMessage" rows={3} maxLength={300} value={autoMsg ?? shop.autoMessage} onChange={(e) => setAutoMsg(e.target.value)} placeholder="Thanks for the like! Ask me about sizes or delivery." />
            <Button size="sm" className="mt-3" loading={busy === 'msg'} onClick={() => void saveAutoMessage(shop)}><Check {...ICON_SM} /> Save</Button>
          </section>

          {/* Auto matcher */}
          <section className="mb-5 border border-line p-4">
            <h2 className="mb-1 flex items-center gap-2 text-[18px]"><Zap {...ICON} className="text-accent-text" /> Auto-matcher</h2>
            <p className="mb-3 text-[13px] text-muted">Accepts every right swipe on this shop's products automatically, so chats open instantly.</p>
            {autoMatchActive(shop) ? (
              <p className="font-mono text-[12px] text-accent-text uppercase">On until {shop.autoMatchUntil!.toDate().toLocaleString()}</p>
            ) : (
              <p className="font-mono text-[12px] text-muted uppercase">Off</p>
            )}
            <Button size="sm" className="mt-3" loading={busy === 'am'} onClick={() => void buyAutoMatch(shop)}>
              {autoMatchActive(shop) ? 'Extend 1 day' : 'Turn on for 1 day'} · ₹{AUTO_MATCH_PRICE_PER_DAY}
            </Button>
          </section>

          {/* Decorations */}
          <section className="mb-5">
            <h2 className="mb-1 flex items-center gap-2 text-[22px] tracking-[-0.03em]"><Gem {...ICON} /> Decorations</h2>
            <p className="mb-3 text-[14px] text-muted">Change how your products look in the feed.</p>
            <ul className="space-y-2">
              {DECORATIONS.map((d) => {
                const owned = shop.decorations?.includes(d.id)
                const equipped = (d.frame && shop.theme?.frame === d.frame) || (d.badge && shop.theme?.badge === d.badge)
                return (
                  <li key={d.id} className="flex items-center gap-3 border border-line p-3">
                    <div className={cx('h-12 w-9 shrink-0 bg-surface', d.frame === 'lime' && 'border-2 border-accent', d.frame === 'bone' && 'border-[3px] border-ink', d.frame === 'double' && 'border-4 border-double border-ink', d.frame === 'dashed' && 'border-2 border-dashed border-ink', !d.frame && 'border border-line')}>
                      {d.badge && <span className="block bg-accent px-1 font-mono text-[7px] text-on-accent uppercase">{d.badge}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] text-ink">{d.name}</p>
                      <p className="text-[12px] text-muted">{d.blurb}</p>
                    </div>
                    {owned ? (
                      <Button size="sm" variant={equipped ? 'primary' : 'secondary'} loading={busy === `eq${d.id}`} onClick={() => void equip(shop, d.id)}>{equipped ? 'Applied' : 'Apply'}</Button>
                    ) : (
                      <Button size="sm" variant="secondary" loading={busy === d.id} onClick={() => void buyDecoration(shop, d.id, d.price)}>₹{d.price}</Button>
                    )}
                  </li>
                )
              })}
            </ul>
          </section>
        </>
      )}
      <p className="mb-2 font-mono text-[11px] text-muted uppercase">Prototype: payments are simulated.</p>
    </div>
  )
}
