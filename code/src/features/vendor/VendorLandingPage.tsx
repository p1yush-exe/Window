import { Link, Navigate } from 'react-router'
import { Button } from '@/components/ui'
import { AuthFrame } from '@/features/auth/AuthPages'
import { useAuth } from '@/features/auth/AuthProvider'
import { FullPageSpinner } from '@/components/ui'

export function VendorLandingPage() {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (profile?.role === 'vendor') return <Navigate to="/dashboard" replace />
  return (
    <AuthFrame title="Sell on Window" subtitle="Reach shoppers nearby, one swipe at a time.">
      <div className="space-y-3">
        <Link to="/vendor/setup" className="block">
          <Button className="w-full" size="lg">Set up my shop</Button>
        </Link>
        <Link to="/login" className="block">
          <Button variant="secondary" className="w-full" size="lg">I already have a shop</Button>
        </Link>
        <ul className="mt-4 space-y-1 text-sm text-muted">
          <li>✔ Pin your store on the map</li>
          <li>✔ Add photos, prices optional</li>
          <li>✔ Chat with every shopper who likes a product</li>
        </ul>
        {profile?.role === 'buyer' && (
          <p className="rounded-xl bg-surface p-3 text-xs text-ink ring-1 ring-line">
            You are logged in as a shopper. Sellers use a separate account; log out from Profile first or use a different email.
          </p>
        )}
      </div>
    </AuthFrame>
  )
}
