import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, Input } from '@/components/ui'
import { GoogleButton } from '@/components/GoogleButton'
import { env } from '@/lib/env'
import { getMode } from '@/lib/mode'
import { friendlyAuthError, useAuth } from './AuthProvider'

export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-canvas px-6 py-12 pt-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-3xl text-on-accent">◫</Link>
          <h1 className="text-3xl font-normal tracking-[-0.03em] text-ink">Window</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-canvas p-6 ring-1 ring-line">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          {children}
        </div>
        {footer && <p className="mt-6 text-center text-sm text-muted">{footer}</p>}
        {!env.configured && (
          <p className="mt-4 rounded-xl bg-surface p-3 text-center text-xs text-ink ring-1 ring-line">
            Firebase is not configured. Copy <code>.env.example</code> to <code>.env</code> or run with the emulator.
          </p>
        )}
      </div>
    </div>
  )
}

/** Email/password login for anyone who already has an account (shopper or seller). */
export function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email.trim(), password)
      navigate('/', { replace: true })
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Swipe. Match. Chat. Buy."
      footer={
        <>
          New seller? <Link className="font-semibold text-accent-text" to="/vendor/setup">Set up your shop</Link>
          <br />
          Shopping? <Link className="font-semibold text-accent-text" to="/feed">Just start swiping</Link>
        </>
      }
    >
      <GoogleButton role={getMode() === 'vendor' ? 'vendor' : 'buyer'} onDone={() => navigate('/', { replace: true })} />
      <div className="my-3 flex items-center gap-3 font-mono text-[11px] text-muted uppercase"><span className="h-px flex-1 bg-line" />or email<span className="h-px flex-1 bg-line" /></div>
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>Log in</Button>
      </form>
    </AuthFrame>
  )
}
