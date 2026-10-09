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
 * Shopper chrome. Top bar: swipe + super-swipe counters (side by side, open the swipe shop),
 * theme toggle and the seller switch. Bottom: bag left, profile right.
 */
export function ShopperShell() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [buyOpen, setBuyOpen] = useState<'swipes' | 'superSwipes' | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [unread, setUnread] = useState(0)

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
  const chip = 'flex h-11 items-center gap-2 rounded border px-3 font-mono text-[15px] tracking-[0.053em] backdrop-blur transition hover:border-charcoal'

  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      {/* Top bar */}
      <header className="fixed inset-x-0 top-0 z-30 border-b border-faded-gray/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-[calc(var(--safe-top)+10px)] pb-2.5">
          <div className="flex items-center gap-2">
            <NavLink to="/feed" className="mr-1 hidden font-mono text-[13px] tracking-[0.053em] text-charcoal uppercase md:block">Window</NavLink>
            <motion.button
              type="button"
              onClick={() => (profile ? setBuyOpen('swipes') : setLoginOpen(true))}
              animate={{ scale: empty && onFeed ? 1.15 : 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 18 }}
              className={cx(chip, 'origin-left', empty ? 'border-eager-green bg-eager-green text-white' : 'border-faded-gray bg-white text-charcoal')}
              aria-label={`${swipes} swipes left. Open the swipe shop`}
              title="Swipes · tap to buy more"
            >
              <Heart {...ICON} fill={empty ? 'currentColor' : 'none'} />
              <span>{profile ? swipes : '—'}</span>
              <span className="hidden text-[11px] text-current/70 md:inline">swipes</span>
            </motion.button>
            <button
              type="button"
              onClick={() => (profile ? setBuyOpen('superSwipes') : setLoginOpen(true))}
              className={cx(chip, 'border-faded-gray bg-white text-charcoal')}
              aria-label={`${supers} super swipes left. Open the swipe shop`}
              title="Super swipes · tap to buy more"
            >
              <HeartPlus {...ICON} className="text-spark-blue" />
              <span>{profile ? supers : '—'}</span>
              <span className="hidden text-[11px] text-pencil-gray md:inline">super</span>
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={switchToSeller}
              className="flex h-11 items-center gap-2 rounded border-2 border-faded-gray px-3 font-mono text-[12px] tracking-[0.053em] text-charcoal uppercase hover:border-charcoal"
              aria-label="Switch to seller"
            >
              <ArrowLeftRight {...ICON} size={16} /> <span className="hidden sm:inline">Seller</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col pt-[calc(var(--safe-top)+74px)] pb-[calc(5rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      {/* Bottom bar */}
      <nav className="fixed inset-x-0 bottom-0 z-30 pb-[calc(var(--safe-bottom)+14px)]">
        <div className="mx-auto flex max-w-5xl items-end justify-between px-5">
          <NavLink
            to="/bag"
            className={({ isActive }) =>
              cx('relative flex h-13 items-center gap-2 rounded border px-4 font-mono text-[12px] uppercase backdrop-blur', isActive ? 'border-eager-green bg-eager-green text-white' : 'border-faded-gray bg-white/90 text-charcoal hover:border-charcoal')
            }
            aria-label="Bag"
          >
            <ShoppingBag {...ICON} /> <span className="hidden sm:inline">Bag</span>
            {unread > 0 && <span className="absolute -top-1.5 -right-1.5 rounded bg-eager-green px-1.5 font-mono text-[10px] text-white">{unread}</span>}
          </NavLink>
          <NavLink
            to="/me"
            className={({ isActive }) =>
              cx('flex h-13 items-center gap-2 rounded border px-4 font-mono text-[12px] uppercase backdrop-blur', isActive ? 'border-eager-green bg-eager-green text-white' : 'border-faded-gray bg-white/90 text-charcoal hover:border-charcoal')
            }
            aria-label="Profile"
          >
            <User {...ICON} /> <span className="hidden sm:inline">Profile</span>
          </NavLink>
        </div>
      </nav>

      <AnimatePresence>{buyOpen && profile && <BuySwipesSheet kind={buyOpen} onClose={() => setBuyOpen(null)} />}</AnimatePresence>
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} onDone={() => setLoginOpen(false)} title="Log in" body="Create an account or log in to continue." />
    </div>
  )
}
