import { useState } from 'react'
import { Link, Navigate, Outlet } from 'react-router'
import { Button, EmptyState, FullPageSpinner } from '@/components/ui'
import { Lock } from '@/components/icons'
import { useAuth } from '@/features/auth/AuthProvider'
import { LoginSheet } from '@/features/auth/LoginSheet'
import { getMode } from '@/lib/mode'
import { hasShopperPrefs } from '@/lib/prefs'
import { isWeb } from '@/lib/platform'

/** Root: pick the view the person last used; first-timers get the chooser. */
export function RoleHome() {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  const mode = getMode()
  if (mode === 'vendor' && profile?.hasShop) return <Navigate to="/vendor/home" replace />
  if (mode === 'vendor' && profile && !profile.hasShop) return <Navigate to="/vendor" replace />
  if (profile) return <Navigate to={hasShopperPrefs() || profile.location ? '/feed' : '/shopper/setup'} replace />
  // First open: straight to the location page (the storefront intro leads here).
  return <Navigate to={hasShopperPrefs() ? '/feed' : '/shopper/setup'} replace />
}

export function ShellGate() {
  const { loading } = useAuth()
  if (loading) return <FullPageSpinner />
  return <Outlet />
}

/** Pages that need an account show a login prompt to guests instead of redirecting. */
export function RequireProfile() {
  const { profile } = useAuth()
  const [open, setOpen] = useState(false)
  if (profile) return <Outlet />
  return (
    <div className="px-4 pt-16">
      <EmptyState
        icon={<Lock size={28} strokeWidth={1.75} absoluteStrokeWidth />}
        title="Log in to see this"
        body="Your bag, chats and balance are saved to your account."
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
    </div>
  )
}

/** Seller area: needs an account with a shop. On the web, sellers are steered to the app first. */
export function RequireVendor() {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!profile) return <Navigate to="/vendor" replace />
  if (!profile.hasShop) return <Navigate to="/vendor" replace />
  if (isWeb() && !sessionStorage.getItem('window.webVendorOk')) return <Navigate to="/vendor/download" replace />
  return <Outlet />
}

export function PublicOnly() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (user && profile) return <Navigate to="/" replace />
  if (user && !profile) return <Navigate to="/onboarding" replace />
  return <Outlet />
}

export function OnboardingGate() {
  const { user, profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile) return <Navigate to="/" replace />
  return <Outlet />
}
