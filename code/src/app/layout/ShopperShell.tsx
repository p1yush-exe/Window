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
 * Shopper chrome lives in the four corners; the middle is for cards.
 * Top-left: swipe + super-swipe counters (open the swipe shop). Top-right: swap to seller.
 * Bottom-left: liked & chats (bag). Bottom-right: profile. No top or bottom bars.
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
  const chip = 'flex h-11 items-center gap-1.5 rounded-xl border-2 px-3 text-[16px] font-bold transition'
  const corner = 'flex h-12 w-12 items-center justify-center rounded-xl border-2 transition'
  const idle = 'border-faded-gray bg-white text-charcoal hover:border-spark-blue'
  const active = 'border-eager-green bg-eager-green text-white'

  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      {/* Top-left: counters */}
      <div className="fixed top-[calc(var(--safe-top)+12px)] left-4 z-30 flex items-center gap-2">
        <motion.button
          type="button"
          onClick={() => (profile ? setBuyOpen('swipes') : setLoginOpen(true))}
          animate={{ scale: empty && onFeed ? 1.15 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
          className={cx(chip, 'origin-left', empty ? active : idle)}
          aria-label={`${swipes} swipes left. Open the swipe shop`}
        >
          <Heart {...ICON} fill={empty ? 'currentColor' : 'none'} className={empty ? '' : 'text-[#fb4f68]'} />
          {profile ? swipes : '—'}
        </motion.button>
        <button type="button" onClick={() => (profile ? setBuyOpen('superSwipes') : setLoginOpen(true))} className={cx(chip, idle)} aria-label={`${supers} super swipes left. Open the swipe shop`}>
          <HeartPlus {...ICON} className="text-spark-blue" />
          {profile ? supers : '—'}
        </button>
      </div>

      {/* Top-right: swap account type (plain button) */}
      <button
        type="button"
        onClick={switchToSeller}
        className="fixed top-[calc(var(--safe-top)+12px)] right-4 z-30 flex h-11 w-11 items-center justify-center rounded-xl text-charcoal hover:text-spark-blue"
        aria-label="Switch to seller"
        title="Switch to seller"
      >
        <ArrowLeftRight size={26} strokeWidth={2.5} absoluteStrokeWidth />
      </button>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col pt-[calc(var(--safe-top)+64px)] pb-[calc(5rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      {/* Bottom-left: liked & chats */}
      <NavLink to="/bag" className={({ isActive }) => cx(corner, 'fixed bottom-[calc(var(--safe-bottom)+14px)] left-4 z-30', isActive ? active : idle)} aria-label="Liked and chats">
        <ShoppingBag {...ICON} />
        {unread > 0 && <span className="absolute -top-1.5 -right-1.5 rounded-lg bg-eager-green px-1.5 text-[11px] font-bold text-white">{unread}</span>}
      </NavLink>
      {/* Bottom-right: profile */}
      <NavLink to="/me" className={({ isActive }) => cx(corner, 'fixed right-4 bottom-[calc(var(--safe-bottom)+14px)] z-30', isActive ? active : idle)} aria-label="Profile">
        <User {...ICON} />
      </NavLink>

      <AnimatePresence>{buyOpen && profile && <BuySwipesSheet kind={buyOpen} onClose={() => setBuyOpen(null)} />}</AnimatePresence>
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} onDone={() => setLoginOpen(false)} title="Log in" body="Create an account or log in to continue." />
    </div>
  )
}
