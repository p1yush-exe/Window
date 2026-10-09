import { Link, Navigate } from 'react-router'
import { Button, FullPageSpinner } from '@/components/ui'
import { Check, ICON_SM } from '@/components/icons'
import { AuthFrame } from '@/features/auth/AuthPages'
import { useAuth } from '@/features/auth/AuthProvider'
import { isWeb } from '@/lib/platform'

export function VendorLandingPage() {
  const { profile, loading } = useAuth()
  if (loading) return <FullPageSpinner />
  if (profile?.hasShop) return <Navigate to="/vendor/home" replace />
  if (isWeb() && !sessionStorage.getItem('window.webVendorOk')) return <Navigate to="/vendor/download" replace />
  return (
    <AuthFrame title="Sell on Window" subtitle="Reach shoppers nearby, one swipe at a time.">
      <div className="space-y-3">
        <Link to="/vendor/setup" className="block"><Button className="w-full" size="lg">{profile ? 'Open my shop' : 'Set up my shop'}</Button></Link>
        {!profile && <Link to="/login" className="block"><Button variant="secondary" className="w-full" size="lg">I already have a shop</Button></Link>}
        <ul className="mt-4 space-y-1.5 font-mono text-[12px] text-muted">
          <li className="flex items-center gap-2"><Check {...ICON_SM} className="text-accent-text" /> Pin your shop on the map</li>
          <li className="flex items-center gap-2"><Check {...ICON_SM} className="text-accent-text" /> One free token: 10 product uploads</li>
          <li className="flex items-center gap-2"><Check {...ICON_SM} className="text-accent-text" /> Accept likes, chat with buyers</li>
        </ul>
        {profile && <p className="font-mono text-[11px] text-muted uppercase">Your shopper account becomes a seller account too.</p>}
      </div>
    </AuthFrame>
  )
}
