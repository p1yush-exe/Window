import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router'
import { cx } from '@/components/ui'
import { ArrowLeftRight, Plus, Store, User } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { listenMatches, listenVendorLikes } from '@/lib/db'
import { setMode } from '@/lib/mode'
import { requestCameraPermission } from '@/lib/upload'

/** Seller chrome in corner notches: wordmark top-left, swap top-right, shop bottom-left, plus bottom-centre, profile bottom-right. */
export function VendorShell() {
  const { profile } = useSession()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const onShop = pathname.startsWith('/vendor/shop')
  const onMe = pathname.startsWith('/vendor/me') || pathname.startsWith('/vendor/alerts')
  const onNew = pathname.startsWith('/vendor/new')
  const [pending, setPending] = useState(0)

  const [unread, setUnread] = useState(0)
  useEffect(() => listenVendorLikes(profile.uid, (ls) => setPending(ls.filter((l) => l.status === 'pending').length)), [profile.uid])
  useEffect(() => listenMatches(profile.uid, 'vendor', (ms) => setUnread(ms.filter((m) => (m.unread?.[profile.uid] ?? 0) > 0).length)), [profile.uid])
  useEffect(() => {
    void requestCameraPermission().catch(() => undefined)
  }, [])

  function switchToShopper() {
    setMode('shopper')
    navigate('/feed')
  }

  return (
    <div className="relative flex min-h-dvh flex-col bg-white">
      <NavLink to="/vendor/home" className={({ isActive }) => cx('notch notch-tl notch-btn relative text-[14px] tracking-[0.053em] uppercase', isActive && 'is-active')}>
        Seller
        {pending + unread > 0 && <span className="absolute -right-2 -bottom-2 rounded-lg bg-super px-1.5 text-[11px] font-bold text-white">{pending + unread}</span>}
      </NavLink>
      <button type="button" onClick={switchToShopper} className="notch notch-tr notch-btn" aria-label="Switch to shopping" title="Switch to shopping">
        <ArrowLeftRight size={36} strokeWidth={2.5} absoluteStrokeWidth />
      </button>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col pt-[calc(var(--safe-top)+64px)] pb-[calc(6rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      {/* Tapping an active notch returns to the seller home */}
      <NavLink to={onShop ? '/vendor/home' : '/vendor/shop'} className={cx('notch notch-bl notch-btn', onShop && 'is-active')} aria-label={onShop ? 'Back to seller home' : 'Shop management'}>
        <Store size={36} strokeWidth={2.25} absoluteStrokeWidth />
      </NavLink>
      <NavLink to={onNew ? '/vendor/home' : '/vendor/new'} className={cx('fab-add', onNew && 'is-active')} aria-label={onNew ? 'Back to seller home' : 'Add product'}>
        <Plus size={32} strokeWidth={3} absoluteStrokeWidth />
      </NavLink>
      <NavLink to={onMe ? '/vendor/home' : '/vendor/me'} className={cx('notch notch-br notch-btn', onMe && 'is-active')} aria-label={onMe ? 'Back to seller home' : 'Seller profile'}>
        <User size={36} strokeWidth={2.25} absoluteStrokeWidth />
      </NavLink>
    </div>
  )
}
