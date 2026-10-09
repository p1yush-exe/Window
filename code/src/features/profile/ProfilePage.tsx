import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Avatar, Badge, Button, ErrorBanner, Input, PageHeader } from '@/components/ui'
import { useAuth, useSession } from '@/features/auth/AuthProvider'
import { updateProfile } from '@/lib/db'
import { isNative } from '@/lib/native'
import { ThemeToggle } from '@/components/ThemeToggle'

export function ProfilePage() {
  const { user, profile } = useSession()
  const { signOut } = useAuth()
  const [name, setName] = useState(profile.displayName)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await updateProfile(profile.uid, { displayName: name.trim() })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader title="Profile" />
      <div className="mb-4 flex items-center gap-4 rounded-2xl bg-canvas p-4 ring-1 ring-line">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.displayName}</p>
          <p className="truncate text-sm text-muted">{user.email}</p>
          <Badge tone="brand" className="mt-1">{profile.role === 'vendor' ? 'Seller' : 'Shopper'}</Badge>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-canvas p-4 ring-1 ring-line">
        <Input label="Display name" name="displayName" required minLength={2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <ErrorBanner message={error} />
        <Button type="submit" loading={busy} variant="secondary">{saved ? 'Saved ✓' : 'Save'}</Button>
      </form>
      <div className="mt-4 space-y-2">
        {profile.role === 'vendor' && (
          <Link to={`/store/${profile.uid}`} className="block rounded-2xl bg-canvas p-4 text-sm font-medium ring-1 ring-line">View my public store →</Link>
        )}
        {profile.role === 'buyer' && (
          <Link to="/shopper/setup" className="block rounded-2xl bg-canvas p-4 text-sm font-medium ring-1 ring-line">
            Area &amp; interests → <span className="font-mono text-[11px] text-muted uppercase">{profile.location?.area ?? profile.location?.address?.split(',')[0] ?? 'not set'} · {(profile.interests ?? []).join(', ') || 'none'}</span>
          </Link>
        )}
        <div className="flex items-center justify-between rounded-2xl bg-canvas p-4 text-sm font-medium ring-1 ring-line">
          <span>Appearance</span>
          <ThemeToggle />
        </div>
        <Link to="/metrics" className="block rounded-2xl bg-canvas p-4 text-sm font-medium ring-1 ring-line">Evaluation metrics →</Link>
        <Button variant="danger" className="w-full" onClick={() => void signOut()}>Log out</Button>
      </div>
      <p className="mt-6 text-center text-xs text-muted">Window · {isNative() ? 'Android app' : 'Web'} · UCS503P</p>
    </div>
  )
}
