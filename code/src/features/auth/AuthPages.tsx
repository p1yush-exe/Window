import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, Input } from '@/components/ui'
import { env } from '@/lib/env'
import { friendlyAuthError, useAuth } from './AuthProvider'

export function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col justify-center bg-linear-to-b from-brand-50 to-white px-6 py-12 pt-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link to="/" className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl text-white shadow-lg shadow-brand-200">◫</Link>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Window</h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          {children}
        </div>
        {footer && <p className="mt-6 text-center text-sm text-neutral-500">{footer}</p>}
        {!env.configured && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-800 ring-1 ring-amber-200">
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
          New seller? <Link className="font-semibold text-brand-600" to="/vendor/setup">Set up your shop</Link>
          <br />
          Shopping? <Link className="font-semibold text-brand-600" to="/feed">Just start swiping</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" name="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>Log in</Button>
      </form>
    </AuthFrame>
  )
}
