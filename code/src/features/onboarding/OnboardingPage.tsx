import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button, ErrorBanner, Input } from '@/components/ui'
import { createProfile } from '@/lib/db'
import { getShopperPrefs } from '@/lib/prefs'
import { useAuth } from '@/features/auth/AuthProvider'

/** Fallback for an auth account without a profile document (e.g. created outside the app). */
export function OnboardingPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.displayName ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  if (!user) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    try {
      const prefs = getShopperPrefs()
      await createProfile(user.uid, 'buyer', name.trim(), { email: user.email, location: prefs.location, interests: prefs.interests })
      navigate('/feed', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col justify-center px-6 py-12 pt-safe">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-[29px] ">Finish your account</h1>
          <p className="font-mono text-[12px] text-pencil-gray">Signed in as {user.email}</p>
        </div>
        <Input label="Your name" name="displayName" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} />
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>Start swiping</Button>
        <button type="button" onClick={() => void signOut()} className="w-full text-center font-mono text-[12px] text-pencil-gray uppercase underline">Use a different account</button>
      </form>
    </div>
  )
}
