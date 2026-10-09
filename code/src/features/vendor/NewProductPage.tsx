import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { Button, ErrorBanner, FullPageSpinner, PageHeader } from '@/components/ui'
import { Camera, Check, ICON, Ticket } from '@/components/icons'
import { CameraCapture } from '@/components/CameraCapture'
import { ImageCropper } from '@/components/ImageCropper'
import { useSession } from '@/features/auth/AuthProvider'
import { createProduct, uploadsLeft, type ProductInput } from '@/lib/db'
import { compressImage, uploadImage } from '@/lib/upload'
import { ProductForm } from './ProductForm'
import { useOwnerShops, useVendor } from './useVendor'

type Stage = 'capture' | 'crop' | 'form' | 'done'

/** Plus button flow: camera → crop → details → publish (consumes an upload). */
export function NewProductPage() {
  const { profile } = useSession()
  const vendor = useVendor(profile.uid)
  const { shops } = useOwnerShops(profile.uid)
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [stage, setStage] = useState<Stage>('capture')
  const [raw, setRaw] = useState<Blob | null>(null)
  const [photo, setPhoto] = useState<Blob | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ id: string; code: string } | null>(null)

  useEffect(() => {
    if (!photo) return
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])

  if (vendor === undefined || shops === null) return <FullPageSpinner />
  if (!vendor) return <ErrorBanner message="Seller profile missing. Open Profile to fix it." />
  const left = uploadsLeft(vendor)

  async function captured(blob: Blob) {
    // Pre-process before cropping so the cropper works on a smaller image.
    const small = await compressImage(blob)
    setRaw(small)
    setStage('crop')
  }

  async function publish(input: ProductInput, shopId: string) {
    const shop = shops?.find((s) => s.id === shopId)
    if (!shop || !vendor || !photo) return
    setBusy(true)
    setError(null)
    try {
      const url = await uploadImage(photo, undefined, 'window/products')
      const r = await createProduct(vendor, shop, { ...input, imageUrls: [url] })
      setResult({ id: r.id, code: r.productCode })
      setStage('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not publish')
    } finally {
      setBusy(false)
    }
  }

  if (left <= 0 && stage !== 'done') {
    return (
      <div className="px-4">
        <PageHeader eyebrow="Add product" title="No uploads left" subtitle="1 token = 10 product uploads" />
        <p className="text-[15px] text-pencil-gray">Buy upload tokens in Shop management to keep listing.</p>
        <Link to="/vendor/shop" className="mt-4 inline-block"><Button><Ticket {...ICON} /> Get tokens</Button></Link>
      </div>
    )
  }

  if (stage === 'capture') return <CameraCapture onCapture={(b) => void captured(b)} onCancel={() => navigate('/vendor/home')} />
  if (stage === 'crop' && raw) return <ImageCropper blob={raw} onDone={(b) => { setPhoto(b); setStage('form') }} onCancel={() => setStage('capture')} />

  if (stage === 'done' && result) {
    return (
      <div className="px-4">
        <PageHeader eyebrow="Published" title="Product is live" subtitle={`ID ${result.code}`} />
        {preview && <img src={preview} alt="" className="mb-4 aspect-[3/4] w-full max-w-xs border border-charcoal object-cover" />}
        <p className="font-mono text-[12px] text-pencil-gray uppercase">{left - 1} uploads left</p>
        <div className="mt-4 flex gap-2">
          <Button onClick={() => { setStage('capture'); setPhoto(null); setRaw(null); setResult(null) }}><Camera {...ICON} /> Add another</Button>
          <Link to={`/product/${result.id}`}><Button variant="secondary"><Check {...ICON} /> View</Button></Link>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4">
      <PageHeader eyebrow={params.get('welcome') ? 'Welcome · first listing' : 'Add product'} title="Product details" subtitle={`${left} uploads left`} right={<button type="button" onClick={() => setStage('capture')} className="font-mono text-[12px] text-pencil-gray uppercase underline">Retake</button>} />
      {preview && <img src={preview} alt="" className="mb-4 aspect-[3/4] w-40 border border-charcoal object-cover" />}
      <ProductForm shops={shops} submitLabel="Publish product" busy={busy} onSubmit={publish} />
      <ErrorBanner message={error} />
    </div>
  )
}
