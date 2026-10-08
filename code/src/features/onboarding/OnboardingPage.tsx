import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { Button, ErrorBanner, Input, Textarea, cx } from '@/components/ui'
import { createProfile, createVendor } from '@/lib/db'
import type { Role } from '@/lib/types'
import { useAuth } from '@/features/auth/AuthProvider'

function RoleCard({ value, selected, onSelect, title, body, icon }: { value: Role; selected: boolean; onSelect: (r: Role) => void; title: string; body: string; icon: string }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(value)}
      className={cx(
        'flex flex-1 flex-col items-start rounded-2xl border-2 p-4 text-left transition',
        selected ? 'border-brand-600 bg-brand-50' : 'border-neutral-200 bg-white hover:border-neutral-300',
      )}
    >
      <span className="text-2xl">{icon}</span>
      <span className="mt-2 font-semibold text-neutral-900">{title}</span>
      <span className="mt-0.5 text-xs text-neutral-500">{body}</span>
    </button>
  )
}

export function OnboardingPage() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [role, setRole] = useState<Role>('buyer')
  const [name, setName] = useState('')
  const [storeName, setStoreName] = useState('')
  const [storeDesc, setStoreDesc] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (!user) return null

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return
    setBusy(true)
    setError(null)
    try {
      await createProfile(user.uid, role, name.trim())
      if (role === 'vendor') {
        await createVendor(user.uid, { name: storeName.trim(), description: storeDesc.trim() })
      }
      navigate(role === 'vendor' ? '/dashboard' : '/feed', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your profile.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-full flex-col justify-center px-6 py-12 pt-safe">
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-sm space-y-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Set up your account</h1>
          <p className="text-sm text-neutral-500">Signed in as {user.email}</p>
        </div>
        <div className="flex gap-3">
          <RoleCard value="buyer" selected={role === 'buyer'} onSelect={setRole} title="I'm shopping" body="Swipe products and chat with sellers." icon="🛍️" />
          <RoleCard value="vendor" selected={role === 'vendor'} onSelect={setRole} title="I'm selling" body="List products and talk to buyers." icon="🏪" />
        </div>
        <Input label="Your name" name="displayName" required minLength={2} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Piyush" />
        {role === 'vendor' && (
          <>
            <Input label="Store name" name="storeName" required minLength={2} value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="e.g. Patiala Threads" />
            <Textarea label="What do you sell?" name="storeDesc" rows={3} value={storeDesc} onChange={(e) => setStoreDesc(e.target.value)} placeholder="Short description shown on your store page" />
          </>
        )}
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>
          {role === 'vendor' ? 'Open my store' : 'Start swiping'}
        </Button>
        <button type="button" onClick={() => void signOut()} className="w-full text-center text-sm text-neutral-500 underline">
          Use a different account
        </button>
      </form>
    </div>
  )
}
