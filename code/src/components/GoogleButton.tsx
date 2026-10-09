import { useState } from 'react'
import { Button, ErrorBanner } from '@/components/ui'
import { friendlyAuthError, useAuth } from '@/features/auth/AuthProvider'
import type { Role } from '@/lib/types'

interface Props {
  role: Role
  label?: string
  onDone: (r: { uid: string; email: string | null; displayName: string | null; isNew: boolean; existingRole: Role | null }) => void
  className?: string
}

export function GoogleButton({ role, label = 'Continue with Google', onDone, className }: Props) {
  const { signInWithGoogle } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function go() {
    setBusy(true)
    setError(null)
    try {
      onDone(await signInWithGoogle(role))
    } catch (e) {
      setError(friendlyAuthError(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="space-y-2">
      <Button type="button" variant="secondary" className={className ?? 'w-full'} size="lg" loading={busy} onClick={() => void go()}>
        <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
          <path fill="currentColor" d="M21.6 12.23c0-.68-.06-1.36-.19-2.02H12v3.83h5.4a4.6 4.6 0 0 1-2 3.03v2.5h3.22c1.89-1.74 2.98-4.3 2.98-7.34z" />
          <path fill="currentColor" opacity=".8" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.22-2.5c-.9.6-2.04.95-3.4.95-2.6 0-4.8-1.76-5.6-4.12H3.07v2.58A10 10 0 0 0 12 22z" />
          <path fill="currentColor" opacity=".6" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.52H3.07a10 10 0 0 0 0 8.96L6.4 13.9z" />
          <path fill="currentColor" opacity=".9" d="M12 5.98c1.47 0 2.78.5 3.82 1.5l2.86-2.86A10 10 0 0 0 3.07 7.52L6.4 10.1c.8-2.36 3-4.12 5.6-4.12z" />
        </svg>
        {label}
      </Button>
      <ErrorBanner message={error} />
    </div>
  )
}
