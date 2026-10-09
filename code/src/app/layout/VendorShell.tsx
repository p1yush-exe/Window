import { useEffect, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router'
import { cx } from '@/components/ui'
import { ArrowLeftRight, ICON, Plus, Store, User } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { listenVendorLikes } from '@/lib/db'
import { setMode } from '@/lib/mode'

/** Seller chrome: switch top-right, shop bottom-left, plus bottom-centre, profile bottom-right. */
export function VendorShell() {
  const { profile } = useSession()
  const navigate = useNavigate()
  const [pending, setPending] = useState(0)

  useEffect(() => listenVendorLikes(profile.uid, (ls) => setPending(ls.filter((l) => l.status === 'pending').length)), [profile.uid])

  function switchToShopper() {
    setMode('shopper')
    navigate('/feed')
  }

  const tab = 'flex h-12 w-12 items-center justify-center rounded border backdrop-blur'
  const active = 'border-eager-green bg-eager-green text-white'
  const idle = 'border-faded-gray bg-white/90 text-charcoal'

  return (
    <div className="relative flex min-h-dvh flex-col bg-white pt-safe">
      <header className="fixed inset-x-0 top-0 z-30 border-b border-faded-gray/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pt-[calc(var(--safe-top)+10px)] pb-2.5">
          <NavLink to="/vendor/home" className="relative flex h-11 items-center rounded border-2 border-faded-gray px-3 font-mono text-[12px] tracking-[0.053em] text-charcoal uppercase">
            Window · Seller
            {pending > 0 && <span className="absolute -top-1.5 -right-1.5 rounded bg-eager-green px-1.5 font-mono text-[10px] text-white">{pending}</span>}
          </NavLink>
          <div className="flex items-center gap-2">
            <button type="button" onClick={switchToShopper} className="flex h-11 items-center gap-2 rounded border-2 border-faded-gray px-3 font-mono text-[12px] tracking-[0.053em] text-charcoal uppercase hover:border-charcoal" aria-label="Switch to shopping">
              <ArrowLeftRight {...ICON} size={16} /> <span className="hidden sm:inline">Shop</span>
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col pt-[calc(var(--safe-top)+84px)] pb-[calc(6rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 pb-[calc(var(--safe-bottom)+14px)]"><div className="mx-auto flex max-w-5xl items-end justify-between px-5">
        <NavLink to="/vendor/shop" className={({ isActive }) => cx(tab, isActive ? active : idle)} aria-label="Shop management">
          <Store {...ICON} />
        </NavLink>
        <NavLink
          to="/vendor/new"
          className={({ isActive }) =>
            cx('flex h-16 w-16 items-center justify-center rounded border', isActive ? 'border-charcoal bg-eager-green text-white' : 'border-eager-green bg-eager-green text-white')
          }
          aria-label="Add product"
        >
          <Plus size={30} strokeWidth={2} absoluteStrokeWidth />
        </NavLink>
        <NavLink to="/vendor/me" className={({ isActive }) => cx(tab, isActive ? active : idle)} aria-label="Seller profile">
          <User {...ICON} />
        </NavLink>
      </div></nav>
    </div>
  )
}
