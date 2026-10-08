import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, FullPageSpinner, Input, PageHeader, Textarea } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { createVendor, updateVendor } from '@/lib/db'
import { useVendor } from './useVendor'

export function StoreSettingsPage() {
  const { profile } = useSession()
  const vendor = useVendor(profile.uid)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (vendor) {
      setName(vendor.name)
      setDescription(vendor.description)
      setLogoUrl(vendor.logoUrl ?? '')
    }
  }, [vendor])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const data = { name: name.trim(), description: description.trim(), logoUrl: logoUrl.trim() || null }
      if (vendor) await updateVendor(profile.uid, data)
      else await createVendor(profile.uid, data)
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  if (vendor === undefined) return <FullPageSpinner />

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader title="Store settings" right={<Link to="/dashboard" className="text-sm text-neutral-500 underline">Back</Link>} />
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <Input label="Store name" name="name" required minLength={2} maxLength={60} value={name} onChange={(e) => setName(e.target.value)} />
        <Textarea label="Description" name="description" rows={4} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Logo URL (optional)" name="logoUrl" type="url" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} />
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>{vendor ? 'Save' : 'Create store'}</Button>
        {vendor && (
          <Link to={`/store/${vendor.id}`} className="block text-center text-sm text-brand-600 underline">View public store page</Link>
        )}
      </form>
    </div>
  )
}
