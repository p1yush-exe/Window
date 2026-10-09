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
  const active = 'border-accent bg-accent text-on-accent'
  const idle = 'border-line bg-canvas/85 text-ink'

  return (
    <div className="relative flex min-h-dvh flex-col bg-canvas pt-safe">
      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 flex items-start justify-between px-4 pt-[calc(var(--safe-top)+12px)]">
        <NavLink to="/vendor/home" className="pointer-events-auto relative rounded border border-line bg-canvas/80 px-2 py-1 font-mono text-[11px] tracking-[0.08em] text-ink uppercase backdrop-blur">
          Window · Seller
          {pending > 0 && <span className="absolute -top-1.5 -right-1.5 rounded bg-accent px-1.5 font-mono text-[10px] text-on-accent">{pending}</span>}
        </NavLink>
        <button
          type="button"
          onClick={switchToShopper}
          className="pointer-events-auto flex items-center gap-1.5 rounded border border-line bg-canvas/80 px-2 py-1 font-mono text-[11px] tracking-[0.06em] text-ink uppercase backdrop-blur hover:border-ink"
          aria-label="Switch to shopping"
        >
          <ArrowLeftRight {...ICON} size={14} /> Shop
        </button>
      </header>

      <main className="flex min-h-dvh flex-1 flex-col pt-14 pb-[calc(5.5rem+var(--safe-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-end justify-between px-5 pb-[calc(var(--safe-bottom)+14px)]">
        <NavLink to="/vendor/shop" className={({ isActive }) => cx(tab, isActive ? active : idle)} aria-label="Shop management">
          <Store {...ICON} />
        </NavLink>
        <NavLink
          to="/vendor/new"
          className={({ isActive }) =>
            cx('flex h-16 w-16 items-center justify-center rounded border', isActive ? 'border-ink bg-ink text-canvas' : 'border-accent bg-accent text-on-accent')
          }
          aria-label="Add product"
        >
          <Plus size={30} strokeWidth={2} absoluteStrokeWidth />
        </NavLink>
        <NavLink to="/vendor/me" className={({ isActive }) => cx(tab, isActive ? active : idle)} aria-label="Seller profile">
          <User {...ICON} />
        </NavLink>
      </nav>
    </div>
  )
}
