import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Avatar, Badge, Button, ErrorBanner, Input, PageHeader } from '@/components/ui'
import { useAuth, useSession } from '@/features/auth/AuthProvider'
import { updateProfile } from '@/lib/db'
import { isNative } from '@/lib/native'

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
      <div className="mb-4 flex items-center gap-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <Avatar name={profile.displayName} url={profile.avatarUrl} size={56} />
        <div className="min-w-0">
          <p className="truncate text-lg font-semibold">{profile.displayName}</p>
          <p className="truncate text-sm text-neutral-500">{user.email}</p>
          <Badge tone="brand" className="mt-1">{profile.role === 'vendor' ? 'Seller' : 'Shopper'}</Badge>
        </div>
      </div>
      <form onSubmit={onSubmit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <Input label="Display name" name="displayName" required minLength={2} maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
        <ErrorBanner message={error} />
        <Button type="submit" loading={busy} variant="secondary">{saved ? 'Saved ✓' : 'Save'}</Button>
      </form>
      <div className="mt-4 space-y-2">
        {profile.role === 'vendor' && (
          <Link to={`/store/${profile.uid}`} className="block rounded-2xl bg-white p-4 text-sm font-medium shadow-sm ring-1 ring-black/5">View my public store →</Link>
        )}
        <Link to="/metrics" className="block rounded-2xl bg-white p-4 text-sm font-medium shadow-sm ring-1 ring-black/5">Evaluation metrics →</Link>
        <Button variant="danger" className="w-full" onClick={() => void signOut()}>Log out</Button>
      </div>
      <p className="mt-6 text-center text-xs text-neutral-400">Window · {isNative() ? 'Android app' : 'Web'} · UCS503P</p>
    </div>
  )
}
