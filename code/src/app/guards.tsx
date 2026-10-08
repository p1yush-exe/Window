import { Navigate, Outlet, useLocation } from 'react-router'
import { FullPageSpinner } from '@/components/ui'
import { useAuth } from '@/features/auth/AuthProvider'
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

export function RoleHome() {
  const { profile } = useAuth()
  return <Navigate to={profile ? homeFor(profile.role) : '/login'} replace />
}
