import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { AnimatePresence, motion } from 'motion/react'
import { cx } from '@/components/ui'
import { ArrowLeftRight, Heart, HeartPlus, ICON, ShoppingBag, User } from '@/components/icons'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginSheet } from '@/features/auth/LoginSheet'
import { BuySwipesSheet } from '@/features/economy/BuySwipesSheet'
import { grantAppBonus, grantDailySwipes, listenMatches } from '@/lib/db'
import { setMode } from '@/lib/mode'
import { isApp } from '@/lib/platform'

/**
 * Shopper chrome: swipe counters top-left, switch-to-seller top-right,
 * bag bottom-left, profile bottom-right. The content fills the middle.
 */
export function ShopperShell() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [buyOpen, setBuyOpen] = useState<'swipes' | 'superSwipes' | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  // Daily swipes and the one-time app bonus.
  useEffect(() => {
    if (!profile) return
    void grantDailySwipes(profile).catch(() => undefined)
    if (isApp()) void grantAppBonus(profile).catch(() => undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.uid, profile?.lastDailyGrant, profile?.appBonusGranted])

  useEffect(() => {
    if (!profile) return
    return listenMatches(profile.uid, 'buyer', (ms) => setUnread(ms.filter((m) => (m.unread?.[profile.uid] ?? 0) > 0).length))
  }, [profile])

  function switchToSeller() {
    if (!profile) return setLoginOpen(true)
    if (profile.hasShop) {
      setMode('vendor')
      navigate('/vendor/home')
    } else navigate('/vendor')
  }

  const swipes = profile?.swipes ?? 0
  const supers = profile?.superSwipes ?? 0
  const empty = Boolean(profile) && swipes === 0
  const onFeed = location.pathname === '/feed'

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas pt-safe">
      {/* Top bar */}
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between px-4 pt-[calc(var(--safe-top)+12px)]">
        <div className="pointer-events-auto flex flex-col items-start gap-1.5">
          <motion.button
            type="button"
            onClick={() => (profile ? setBuyOpen('swipes') : setLoginOpen(true))}
            animate={{ scale: empty && onFeed ? 1.35 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 18 }}
            className={cx(
              'flex origin-top-left items-center gap-1.5 rounded border px-2 py-1 font-mono text-[13px] tracking-[0.04em] backdrop-blur',
              empty ? 'border-accent bg-accent text-on-accent' : 'border-line bg-canvas/80 text-ink',
            )}
            aria-label={`${swipes} swipes left`}
          >
            <Heart {...ICON} size={16} fill={empty ? 'currentColor' : 'none'} />
            {profile ? swipes : '—'}
          </motion.button>
          <button
            type="button"
            onClick={() => (profile ? setBuyOpen('superSwipes') : setLoginOpen(true))}
            className="flex items-center gap-1.5 rounded border border-line bg-canvas/80 px-2 py-1 font-mono text-[13px] tracking-[0.04em] text-ink backdrop-blur"
            aria-label={`${supers} super swipes left`}
          >
            <HeartPlus {...ICON} size={16} className="text-accent-text" />
            {profile ? supers : '—'}
          </button>
        </div>
        <button
          type="button"
          onClick={switchToSeller}
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-line bg-canvas/80 px-2 py-1 font-mono text-[11px] tracking-[0.06em] text-ink uppercase backdrop-blur hover:border-ink"
          aria-label="Switch to seller"
        >
          <ArrowLeftRight {...ICON} size={14} /> Seller
        </button>
      </header>

      <main className="flex min-h-dvh flex-1 flex-col pb-[calc(4.5rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      {/* Bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-5 pb-[calc(var(--safe-bottom)+14px)]">
        <NavLink
          to="/bag"
          className={({ isActive }) =>
            cx('relative flex h-12 w-12 items-center justify-center rounded border backdrop-blur', isActive ? 'border-accent bg-accent text-on-accent' : 'border-line bg-canvas/85 text-ink')
          }
          aria-label="Bag"
        >
          <ShoppingBag {...ICON} />
          {unread > 0 && (
            <span className="absolute -top-1.5 -right-1.5 rounded bg-accent px-1.5 font-mono text-[10px] text-on-accent">{unread}</span>
          )}
        </NavLink>
        <NavLink
          to="/me"
          className={({ isActive }) =>
            cx('flex h-12 w-12 items-center justify-center rounded border backdrop-blur', isActive ? 'border-accent bg-accent text-on-accent' : 'border-line bg-canvas/85 text-ink')
          }
          aria-label="Profile"
        >
          <User {...ICON} />
        </NavLink>
      </nav>

      <AnimatePresence>{buyOpen && profile && <BuySwipesSheet kind={buyOpen} onClose={() => setBuyOpen(null)} />}</AnimatePresence>
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} onDone={() => setLoginOpen(false)} title="Log in" body="Create an account or log in to continue." />
    </div>
  )
}
