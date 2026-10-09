import { useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, ErrorBanner, FullPageSpinner, Input, PageHeader, Select, Textarea } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { createProduct, deleteProduct, getProduct, updateProduct, type ProductInput } from '@/lib/db'
import { env } from '@/lib/env'
import { AVAILABILITY_LABEL, CATEGORIES, type Availability, type Category } from '@/lib/types'
import { isNative } from '@/lib/native'
import { pickNativePhotos, uploadPhoto } from '@/lib/upload'
import { useVendor } from './useVendor'

export function ProductFormPage() {
  const { productId } = useParams()
  const editing = Boolean(productId)
  const { profile } = useSession()
  const vendor = useVendor(profile.uid)
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState<Category>('Clothes')
  const [availability, setAvail] = useState<Availability>('in_stock')
  const [imageUrls, setImageUrls] = useState<string[]>([])
  const [urlInput, setUrlInput] = useState('')
  const [loaded, setLoaded] = useState(!editing)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploads, setUploads] = useState<Array<{ id: number; preview: string; progress: number; error?: string }>>([])
  const uploading = uploads.some((u) => !u.error)

  useEffect(() => {
    if (!productId) return
    getProduct(productId)
      .then((p) => {
        if (!p) {
          setError('Product not found')
          return
        }
        setTitle(p.title)
        setDescription(p.description)
        setPrice(p.price === null ? '' : String(p.price))
        setCategory(p.category)
        setAvail(p.availability)
        setImageUrls(p.imageUrls)
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoaded(true))
  }, [productId])

  /** Uploads several photos in parallel, each with its own thumbnail and progress bar. */
  async function uploadBlobs(blobs: Blob[]) {
    const room = Math.max(0, 6 - imageUrls.length)
    const batch = blobs.slice(0, room)
    if (!batch.length) return
    setError(null)
    const entries = batch.map((b, i) => ({ id: Date.now() + i, preview: URL.createObjectURL(b), progress: 0 }))
    setUploads((cur) => [...cur, ...entries])
    await Promise.all(
      batch.map(async (blob, i) => {
        const id = entries[i]!.id
        try {
          const url = await uploadPhoto(blob, (p) => setUploads((cur) => cur.map((u) => (u.id === id ? { ...u, progress: Math.round((p.loaded / p.total) * 100) } : u))))
          setImageUrls((cur) => (cur.includes(url) ? cur : [...cur, url].slice(0, 6)))
          setUploads((cur) => cur.filter((u) => u.id !== id))
        } catch (e) {
          setUploads((cur) => cur.map((u) => (u.id === id ? { ...u, error: e instanceof Error ? e.message : 'Upload failed' } : u)))
        }
      }),
    )
  }

  function onFiles(files: FileList | null) {
    if (files?.length) void uploadBlobs(Array.from(files))
  }

  async function onNative(source: 'photos' | 'camera') {
    try {
      const blobs = await pickNativePhotos(6 - imageUrls.length, source)
      if (blobs?.length) await uploadBlobs(blobs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the camera')
    }
  }

  function addUrl() {
    const u = urlInput.trim()
    if (!u) return
    try {
      new URL(u)
    } catch {
      setError('That is not a valid URL')
      return
    }
    setImageUrls((cur) => [...cur, u].slice(0, 6))
    setUrlInput('')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!vendor) {
      setError('Create your store first (Store settings).')
      return
    }
    setBusy(true)
    setError(null)
    const parsed = price.trim() === '' ? null : Number(price)
    if (parsed !== null && (!Number.isFinite(parsed) || parsed < 0)) {
      setError('Price must be a positive number or empty.')
      setBusy(false)
      return
    }
    const input: ProductInput = {
      title: title.trim(),
      description: description.trim(),
      price: parsed,
      currency: 'INR',
      category,
      imageUrls,
      availability,
    }
    try {
      if (productId) await updateProduct(productId, input)
      else await createProduct(vendor, input)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function onDelete() {
    if (!productId || !window.confirm('Delete this product? Existing chats stay open.')) return
    setBusy(true)
    try {
      await deleteProduct(productId)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete')
      setBusy(false)
    }
  }

  if (!loaded || vendor === undefined) return <FullPageSpinner />

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader
        title={editing ? 'Edit product' : 'New product'}
        right={
          <Link to="/dashboard" className="text-sm text-muted underline">Cancel</Link>
        }
      />
      <form onSubmit={onSubmit} className="space-y-4 rounded-2xl bg-canvas p-4 ring-1 ring-line">
        <Input label="Title" name="title" required maxLength={80} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hand-block printed kurta" />
        <Textarea label="Description" name="description" rows={3} maxLength={600} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Material, sizes, what makes it special" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="Price (INR, optional)" name="price" type="number" min={0} step="1" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Leave blank to negotiate" />
          <Select label="Category" name="category" value={category} onChange={(e) => setCategory(e.target.value as Category)}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </Select>
        </div>
        <Select label="Availability" name="availability" value={availability} onChange={(e) => setAvail(e.target.value as Availability)}>
          {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((k) => (
            <option key={k} value={k}>
              {AVAILABILITY_LABEL[k]}
            </option>
          ))}
        </Select>

        <div>
          <span className="mb-1 block text-sm font-medium text-ink">Photos (up to 6)</span>
          {imageUrls.length > 0 && (
            <ul className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {imageUrls.map((u, i) => (
                <li key={u + i} className="relative shrink-0">
                  <img src={u} alt="" className="h-24 w-20 rounded-xl object-cover ring-1 ring-line" />
                  <button
                    type="button"
                    onClick={() => setImageUrls((cur) => cur.filter((_, j) => j !== i))}
                    className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded bg-ink text-xs text-canvas"
                    aria-label="Remove photo"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
          {uploads.length > 0 && (
            <ul className="mb-2 flex gap-2 overflow-x-auto no-scrollbar">
              {uploads.map((u) => (
                <li key={u.id} className="relative shrink-0">
                  <img src={u.preview} alt="" className={`h-24 w-20 rounded object-cover ring-1 ring-line ${u.error ? 'opacity-40' : 'opacity-70'}`} />
                  {u.error ? (
                    <button type="button" onClick={() => setUploads((cur) => cur.filter((x) => x.id !== u.id))} className="absolute inset-x-1 bottom-1 rounded bg-ink/80 px-1 font-mono text-[9px] text-canvas uppercase">Failed · dismiss</button>
                  ) : (
                    <div className="absolute inset-x-2 bottom-2 h-1 bg-bone-vellum/30"><div className="h-full bg-accent" style={{ width: `${u.progress}%` }} /></div>
                  )}
                </li>
              ))}
            </ul>
          )}
          {env.uploadsEnabled ? (
            isNative() ? (
              <div className="flex gap-2">
                <Button type="button" variant="secondary" className="flex-1" disabled={imageUrls.length >= 6} onClick={() => void onNative('camera')}>📷 Camera</Button>
                <Button type="button" variant="secondary" className="flex-1" disabled={imageUrls.length >= 6} onClick={() => void onNative('photos')}>🖼 Gallery</Button>
              </div>
            ) : (
              <label className="flex h-20 cursor-pointer items-center justify-center rounded border border-dashed border-line font-mono text-[12px] text-muted uppercase hover:border-ink">
                {uploading ? 'Uploading…' : imageUrls.length >= 6 ? 'Maximum 6 photos' : 'Tap to choose photos'}
                <input type="file" accept="image/*" multiple className="hidden" disabled={imageUrls.length >= 6} onChange={(e) => onFiles(e.target.files)} />
              </label>
            )
          ) : (
            <div className="flex gap-2">
              <Input name="imageUrl" placeholder="https://… image URL" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addUrl() } }} />
              <Button type="button" variant="secondary" onClick={addUrl}>Add</Button>
            </div>
          )}
        </div>

        <ErrorBanner message={error} />
        <div className="flex gap-2">
          <Button type="submit" className="flex-1" loading={busy} disabled={uploading}>{uploading ? 'Uploading photos…' : editing ? 'Save changes' : 'Publish product'}</Button>
          {editing && (
            <Button type="button" variant="danger" onClick={() => void onDelete()} disabled={busy}>Delete</Button>
          )}
        </div>
      </form>
    </div>
  )
}
