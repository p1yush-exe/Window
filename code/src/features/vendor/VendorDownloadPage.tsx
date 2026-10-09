import { Link, useNavigate } from 'react-router'
import { Button } from '@/components/ui'
import { Download, ICON, Smartphone } from '@/components/icons'
import { AuthFrame } from '@/features/auth/AuthPages'
import { APK_URL } from '@/lib/platform'

/** Sellers are steered to the Android app; the browser remains available for testing. */
export function VendorDownloadPage() {
  const navigate = useNavigate()
  return (
    <AuthFrame title="Selling happens in the app" subtitle="Camera, cropping and shop tools are built for your phone.">
      <div className="space-y-3">
        <Smartphone size={40} strokeWidth={1.5} absoluteStrokeWidth className="text-accent-text" />
        <p className="text-[15px] text-muted">Install Window on Android to list products with your camera, manage your shops and answer likes on the go.</p>
        <a href={APK_URL} target="_blank" rel="noreferrer" className="block">
          <Button className="w-full" size="lg"><Download {...ICON} /> Download the app</Button>
        </a>
        <button
          type="button"
          onClick={() => {
            sessionStorage.setItem('window.webVendorOk', '1')
            navigate('/vendor/home', { replace: true })
          }}
          className="w-full py-2 text-center font-mono text-[12px] text-muted uppercase underline"
        >
          Continue in the browser anyway
        </button>
        <Link to="/feed" className="block text-center font-mono text-[12px] text-muted uppercase">Back to shopping</Link>
      </div>
    </AuthFrame>
  )
}
