import { useState } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router'
import { Button, EmptyState, FullPageSpinner } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginSheet } from '@/features/auth/LoginSheet'
import { EntryPage } from '@/features/entry/EntryPage'
import { getMode } from '@/lib/mode'
import { hasShopperPrefs } from '@/lib/prefs'
import type { Role } from '@/lib/types'

export const homeFor = (role: Role) => (role === 'vendor' ? '/dashboard' : '/feed')

export function RequireAuth() {
  const { user, profile, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (!profile) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

export function RequireRole({ role }: { role: Role }) {
  const { profile } = useAuth()
  if (!profile) return <Navigate to="/login" replace />
  if (profile.role !== role) return <Navigate to={homeFor(profile.role)} replace />
  return <Outlet />
}

export function OnboardingGate() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile) return <Navigate to={homeFor(profile.role)} replace />
  return <Outlet />
}

export function PublicOnly() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user && profile) return <Navigate to={homeFor(profile.role)} replace />
  if (user && !profile) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

/** Root: signed-in users go to their home; guests see the entry chooser once, then the feed. */
export function RoleHome() {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (profile) return <Navigate to={homeFor(profile.role)} replace />
  const mode = getMode()
  if (mode === 'shopper') return <Navigate to={hasShopperPrefs() ? '/feed' : '/shopper/setup'} replace />
  if (mode === 'vendor') return <Navigate to="/vendor" replace />
  return <EntryPage />
}

/** Shell area open to guests: renders children; pages decide what guests see. */
export function ShellGate() {
  const { loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return <Outlet />
}

/** Pages that need a signed-in shopper or seller show a login prompt to guests instead of redirecting. */
export function RequireProfile() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  if (profile) return <Outlet />
  return (
    <>
      <EmptyState
        icon="🔒"
        title="Log in to see this"
        body="Your liked products, chats and alerts are saved to your account."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setOpen(true)}>Log in or sign up</Button>
            <Link to="/feed">
              <Button variant="secondary">Keep browsing</Button>
            </Link>
          </div>
        }
      />
      <LoginSheet open={open} onClose={() => setOpen(false)} onDone={() => setOpen(false)} title="Log in" body="Create a shopper account or log in to continue." />
    </>
  )
}
