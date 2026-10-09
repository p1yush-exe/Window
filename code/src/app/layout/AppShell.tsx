import { NavLink, Outlet } from 'react-router'
import { cx } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { useUnreadCounts } from '@/features/notifications/useUnread'

interface Tab {
  to: string
  label: string
  icon: string
  badge?: number
}

export function AppShell() {
  const { profile } = useAuth()
  const { unreadChats, unreadNotifications } = useUnreadCounts()

  const tabs: Tab[] =
    profile?.role === 'vendor'
      ? [
          { to: '/dashboard', label: 'Products', icon: '🏪' },
          { to: '/chats', label: 'Chats', icon: '💬', badge: unreadChats },
          { to: '/notifications', label: 'Alerts', icon: '🔔', badge: unreadNotifications },
          { to: '/profile', label: 'Profile', icon: '👤' },
        ]
      : [
          { to: '/feed', label: 'Feed', icon: '🃏' },
          { to: '/liked', label: 'Liked', icon: '❤️' },
          { to: '/chats', label: 'Chats', icon: '💬', badge: unreadChats },
          { to: '/notifications', label: 'Alerts', icon: '🔔', badge: unreadNotifications },
          { to: '/profile', label: 'Profile', icon: '👤' },
        ]

  return (
    <div className="flex h-full min-h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line bg-canvas px-4 py-6 md:flex">
        <div className="mb-8 flex items-center gap-2 px-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-xl text-on-accent">◫</div>
          <span className="text-xl font-black tracking-[-0.03em]">Window</span>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cx(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-surface text-accent-text' : 'text-ink hover:bg-surface',
                )
              }
            >
              <span className="text-lg">{t.icon}</span>
              <span className="flex-1">{t.label}</span>
              {t.badge ? <span className="rounded bg-accent px-2 py-0.5 font-mono text-[11px] text-on-accent">{t.badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto px-2 text-xs text-muted">
          {profile ? (profile.role === 'vendor' ? 'Seller account' : 'Shopper account') : 'Browsing as guest'}
        </div>
      </aside>

      {/* Content */}
      <main className="relative flex min-w-0 flex-1 flex-col pt-safe">
        <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-[calc(4.25rem+var(--safe-bottom))] md:pb-6">
          <Outlet />
        </div>
      </main>

      {/* Mobile bottom tabs */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-safe backdrop-blur md:hidden">
        <div className="mx-auto flex max-w-3xl">
          {tabs.map((t) => (
            <NavLink
              key={t.to}
              to={t.to}
              className={({ isActive }) =>
                cx('relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] font-medium', isActive ? 'text-accent-text' : 'text-muted')
              }
            >
              <span className="text-xl leading-none">{t.icon}</span>
              {t.label}
              {t.badge ? (
                <span className="absolute top-1 right-[calc(50%-1.4rem)] rounded bg-accent px-1.5 font-mono font-mono text-[10px] text-on-accent">{t.badge}</span>
              ) : null}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
