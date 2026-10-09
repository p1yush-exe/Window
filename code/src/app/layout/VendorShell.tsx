import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { cx } from '@/components/ui'
import { ArrowLeftRight, Plus, Store, User } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { listenVendorLikes } from '@/lib/db'
import { setMode } from '@/lib/mode'
import { requestCameraPermission } from '@/lib/upload'

/** Seller chrome in corner notches: wordmark top-left, swap top-right, shop bottom-left, plus bottom-centre, profile bottom-right. */
export function VendorShell() {
  const { profile } = useSession()
  const navigate = useNavigate()
  const [pending, setPending] = useState(0)

  useEffect(() => listenVendorLikes(profile.uid, (ls) => setPending(ls.filter((l) => l.status === 'pending').length)), [profile.uid])
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
        {pending > 0 && <span className="absolute -right-2 -bottom-2 rounded-lg bg-super px-1.5 text-[11px] font-bold text-white">{pending}</span>}
      </NavLink>
      <button type="button" onClick={switchToShopper} className="notch notch-tr notch-btn" aria-label="Switch to shopping" title="Switch to shopping">
        <ArrowLeftRight size={24} strokeWidth={2.5} absoluteStrokeWidth />
      </button>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col pt-[calc(var(--safe-top)+64px)] pb-[calc(6rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      <NavLink to="/vendor/shop" className={({ isActive }) => cx('notch notch-bl notch-btn', isActive && 'is-active')} aria-label="Shop management">
        <Store size={24} strokeWidth={2.25} absoluteStrokeWidth />
      </NavLink>
      <NavLink to="/vendor/new" className={({ isActive }) => cx('notch notch-bc notch-btn', isActive ? 'is-active' : 'bg-eager-green border-eager-green text-white')} aria-label="Add product">
        <Plus size={30} strokeWidth={3} absoluteStrokeWidth className="text-white" />
      </NavLink>
      <NavLink to="/vendor/me" className={({ isActive }) => cx('notch notch-br notch-btn', isActive && 'is-active')} aria-label="Seller profile">
        <User size={24} strokeWidth={2.25} absoluteStrokeWidth />
      </NavLink>
    </div>
  )
}
