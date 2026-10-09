import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Button, ErrorBanner, FullPageSpinner, Input, PageHeader, Textarea, cx } from '@/components/ui'
import { LocationPicker } from '@/components/LocationPicker'
import { PhotoField } from '@/components/PhotoField'
import { useSession } from '@/features/auth/AuthProvider'
import { createVendor, getVendor, syncVendorToProducts, updateVendor } from '@/lib/db'
import { MAX_STORE_TAGS, STORE_TAGS, type Vendor } from '@/lib/types'
import { useVendor } from './useVendor'

export function StoreSettingsPage() {
  const { profile } = useSession()
  const vendor = useVendor(profile.uid)
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [website, setWebsite] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [storefrontUrl, setStorefrontUrl] = useState<string | null>(null)
  const [location, setLocation] = useState<Vendor['location']>(null)
  const [ownerName, setOwnerName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null)

  useEffect(() => {
    if (vendor && loadedFrom !== vendor.id) {
      setLoadedFrom(vendor.id)
      setName(vendor.name)
      setDescription(vendor.description)
      setWebsite(vendor.website ?? '')
      setTags(vendor.tags ?? [])
      setStorefrontUrl(vendor.storefrontUrl ?? null)
      setLocation(vendor.location ?? null)
      setOwnerName(vendor.ownerName ?? '')
    }
  }, [vendor, loadedFrom])

  function toggleTag(tag: string) {
    setTags((cur) => (cur.includes(tag) ? cur.filter((t) => t !== tag) : cur.length < MAX_STORE_TAGS ? [...cur, tag] : cur))
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const site = website.trim()
      const data = {
        name: name.trim(),
        description: description.trim(),
        website: site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : null,
        tags,
        storefrontUrl,
        location,
        ownerName: ownerName.trim(),
      }
      if (vendor) await updateVendor(profile.uid, data)
      else await createVendor(profile.uid, data)
      const fresh = await getVendor(profile.uid)
      if (fresh) await syncVendorToProducts(fresh)
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
      <PageHeader title="Store settings" right={<Link to="/dashboard" className="text-sm text-muted underline">Back</Link>} />
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-canvas p-4 ring-1 ring-line">
        <Input label="Store name" name="name" required minLength={2} maxLength={80} value={name} onChange={(e) => setName(e.target.value)} />
        <div>
          <span className="mb-1 block text-sm font-medium text-ink">Tags <span className="text-muted">(up to {MAX_STORE_TAGS})</span></span>
          <div className="flex flex-wrap gap-2">
            {STORE_TAGS.map((t) => {
              const on = tags.includes(t)
              return (
                <button key={t} type="button" onClick={() => toggleTag(t)} className={cx('rounded px-3 py-1.5 font-mono text-[12px] uppercase tracking-[0.04em] ring-1', on ? 'bg-accent text-on-accent ring-accent' : 'bg-canvas text-ink ring-line')}>
                  {t}
                </button>
              )
            })}
          </div>
        </div>
        <Textarea label="Description" name="description" rows={3} maxLength={500} value={description} onChange={(e) => setDescription(e.target.value)} />
        <Input label="Website (optional)" name="website" type="text" inputMode="url" value={website} onChange={(e) => setWebsite(e.target.value)} />
        <Input label="Owner name" name="ownerName" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} />
        <PhotoField label="Storefront photo" value={storefrontUrl} onChange={setStorefrontUrl} aspect="aspect-[4/3]" />
        <div>
          <span className="mb-1 block text-sm font-medium text-ink">Store location</span>
          <LocationPicker value={location} onChange={setLocation} />
        </div>
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>{vendor ? 'Save' : 'Create store'}</Button>
        {vendor && (
          <Link to={`/store/${vendor.id}`} className="block text-center text-sm text-accent-text underline">View public store page</Link>
        )}
      </form>
    </div>
  )
}
