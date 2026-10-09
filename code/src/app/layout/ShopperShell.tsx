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
 * Shopper chrome lives in four corner notches; the middle is for cards.
 * Top-left: swipe + super-swipe counters (open the swipe shop). Top-right: swap to seller.
 * Bottom-left: liked & chats. Bottom-right: profile.
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

  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      {/* Top-left notch: counters */}
      <motion.div className={cx('notch notch-tl origin-top-left', empty && onFeed && 'is-active')} animate={{ scale: empty && onFeed ? 1.12 : 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
        <button type="button" onClick={() => (profile ? setBuyOpen('swipes') : setLoginOpen(true))} className="notch-btn" aria-label={`${swipes} swipes left. Open the swipe shop`}>
          <Heart {...ICON} size={30} fill="currentColor" className={empty && onFeed ? 'text-white' : 'text-swipe'} />
          {profile ? swipes : '—'}
        </button>
        <span className="notch-sep" />
        <button type="button" onClick={() => (profile ? setBuyOpen('superSwipes') : setLoginOpen(true))} className="notch-btn" aria-label={`${supers} super swipes left. Open the swipe shop`}>
          <HeartPlus {...ICON} size={30} fill="currentColor" className={empty && onFeed ? 'text-white' : 'text-super'} />
          {profile ? supers : '—'}
        </button>
      </motion.div>

      {/* Top-right notch: swap account type */}
      <button type="button" onClick={switchToSeller} className="notch notch-tr notch-btn" aria-label="Switch to seller" title="Switch to seller">
        <ArrowLeftRight size={30} strokeWidth={2.5} absoluteStrokeWidth />
      </button>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col pt-[calc(var(--safe-top)+64px)] pb-[calc(5rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      {/* Bottom-left notch: liked & chats */}
      <NavLink to="/bag" className={({ isActive }) => cx('notch notch-bl notch-btn relative', isActive && 'is-active')} aria-label="Liked and chats">
        <ShoppingBag size={30} strokeWidth={2.25} absoluteStrokeWidth />
        {unread > 0 && <span className="absolute -top-2 right-2 rounded-lg bg-super px-1.5 text-[11px] font-bold text-white">{unread}</span>}
      </NavLink>
      {/* Bottom-right notch: profile */}
      <NavLink to="/me" className={({ isActive }) => cx('notch notch-br notch-btn', isActive && 'is-active')} aria-label="Profile">
        <User size={30} strokeWidth={2.25} absoluteStrokeWidth />
      </NavLink>

      <AnimatePresence>{buyOpen && profile && <BuySwipesSheet kind={buyOpen} onClose={() => setBuyOpen(null)} />}</AnimatePresence>
      <LoginSheet open={loginOpen} onClose={() => setLoginOpen(false)} onDone={() => setLoginOpen(false)} title="Log in" body="Create an account or log in to continue." />
    </div>
  )
}
