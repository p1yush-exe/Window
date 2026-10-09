import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, ErrorBanner, FullPageSpinner, Input, PageHeader, Textarea } from '@/components/ui'
import { LocationPicker } from '@/components/LocationPicker'
import { PhotoField } from '@/components/PhotoField'
import { TagPicker } from '@/components/TagPicker'
import { useSession } from '@/features/auth/AuthProvider'
import { createShop, emptyShopInput, getShop, syncShopToProducts, updateShop, type ShopInput } from '@/lib/db'

/** Create a new shop, or edit an existing one (name, tags, website, photo, location). */
export function ShopEditPage() {
  const { shopId } = useParams()
  const { profile } = useSession()
  const navigate = useNavigate()
  const [shop, setShop] = useState<ShopInput>(emptyShopInput())
  const [loaded, setLoaded] = useState(!shopId)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const patch = (p: Partial<ShopInput>) => setShop((cur) => ({ ...cur, ...p }))

  useEffect(() => {
    if (!shopId) return
    getShop(shopId)
      .then((s) => {
        if (!s || s.ownerUid !== profile.uid) setError('Shop not found')
        else setShop({ name: s.name, description: s.description, tags: s.tags, website: s.website, storefrontUrl: s.storefrontUrl, logoUrl: s.logoUrl, location: s.location, autoMessage: s.autoMessage })
      })
      .finally(() => setLoaded(true))
  }, [shopId, profile.uid])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (shop.name.trim().length < 2) return setError('Give the shop a name')
    if (shop.tags.length === 0) return setError('Pick at least one tag')
    if (!shop.location) return setError('Pin the shop on the map')
    setBusy(true)
    try {
      const site = shop.website?.trim()
      const data = { ...shop, name: shop.name.trim(), website: site ? (/^https?:\/\//i.test(site) ? site : `https://${site}`) : null }
      if (shopId) {
        await updateShop(shopId, data)
        const fresh = await getShop(shopId)
        if (fresh) await syncShopToProducts(fresh)
      } else await createShop(profile.uid, data)
      navigate('/vendor/shop')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  if (!loaded) return <FullPageSpinner />

  return (
    <div className="px-4">
      <PageHeader eyebrow={shopId ? 'Edit shop' : 'New shop'} title={shop.name || 'Shop details'} right={<Link to="/vendor/shop" className="font-mono text-[12px] text-muted uppercase underline">Cancel</Link>} />
      <form onSubmit={submit} className="space-y-4 border border-line p-4">
        <Input label="Shop name" name="name" required minLength={2} maxLength={80} value={shop.name} onChange={(e) => patch({ name: e.target.value })} />
        <TagPicker value={shop.tags} onChange={(tags) => patch({ tags })} label="Shop tags" />
        <Textarea label="Description" name="description" rows={3} maxLength={300} value={shop.description} onChange={(e) => patch({ description: e.target.value })} />
        <Input label="Website (optional)" name="website" type="text" inputMode="url" value={shop.website ?? ''} onChange={(e) => patch({ website: e.target.value })} />
        <PhotoField label="Storefront photo" value={shop.storefrontUrl} onChange={(storefrontUrl) => patch({ storefrontUrl })} aspect="aspect-[4/3]" folder="window/storefronts" />
        <div>
          <span className="label mb-1 block">Location</span>
          <LocationPicker value={shop.location} onChange={(location) => patch({ location })} searchable />
        </div>
        <ErrorBanner message={error} />
        <Button type="submit" className="w-full" loading={busy}>{shopId ? 'Save shop' : 'Create shop'}</Button>
      </form>
    </div>
  )
}
