import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, Input } from '@/components/ui'
import { env } from '@/lib/env'
import { friendlyAuthError, useAuth } from './AuthProvider'

function AuthFrame({ title, subtitle, children, footer }: { title: string; subtitle: string; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col justify-center bg-linear-to-b from-brand-50 to-white px-6 py-12 pt-safe">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-600 text-3xl text-white shadow-lg shadow-brand-200">◫</div>
          <h1 className="text-3xl font-black tracking-tight text-neutral-900">Window</h1>
          <p className="mt-1 text-sm text-neutral-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="mb-4 text-lg font-semibold">{title}</h2>
          {children}
        </div>
        <p className="mt-6 text-center text-sm text-neutral-500">{footer}</p>
        {!env.configured && (
          <p className="mt-4 rounded-xl bg-amber-50 p-3 text-center text-xs text-amber-800 ring-1 ring-amber-200">
            Firebase is not configured. Copy <code>.env.example</code> to <code>.env</code> or run with the emulator.
          </p>
        )}
      </div>
    </div>
  )
}

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
          New here? <Link className="font-semibold text-brand-600" to="/signup">Create an account</Link>
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

export function SignupPage() {
  const { signUp } = useAuth()
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
      await signUp(email.trim(), password)
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(friendlyAuthError(err))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthFrame
      title="Create your account"
      subtitle="Discover products from local sellers, one swipe at a time."
      footer={
        <>
          Already have an account? <Link className="font-semibold text-brand-600" to="/login">Log in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-3">
        <Input label="Email" name="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Input label="Password" name="password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 6 characters" />
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>Continue</Button>
      </form>
    </AuthFrame>
  )
}
