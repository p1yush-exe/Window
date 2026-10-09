import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { Button, ErrorBanner, FullPageSpinner, PageHeader } from '@/components/ui'
import { Trash2, ICON } from '@/components/icons'
import { useSession } from '@/features/auth/AuthProvider'
import { deleteProduct, getProduct, updateProduct, type ProductInput } from '@/lib/db'
import type { Product } from '@/lib/types'
import { ProductForm } from './ProductForm'
import { useOwnerShops } from './useVendor'

export function EditProductPage() {
  const { productId = '' } = useParams()
  const { profile } = useSession()
  const { shops } = useOwnerShops(profile.uid)
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null | undefined>(undefined)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProduct(productId).then(setProduct).catch(() => setProduct(null))
  }, [productId])

  if (product === undefined || shops === null) return <FullPageSpinner />
  if (!product || product.vendorId !== profile.uid) return <ErrorBanner message="Product not found." />

  async function save(input: ProductInput) {
    setBusy(true)
    setError(null)
    try {
      await updateProduct(productId, input)
      navigate('/vendor/home')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!window.confirm('Delete this product? Existing chats stay open.')) return
    setBusy(true)
    try {
      await deleteProduct(productId)
      navigate('/vendor/home')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not delete')
      setBusy(false)
    }
  }

  return (
    <div className="px-4">
      <PageHeader eyebrow={product.productCode} title="Edit product" right={<Link to="/vendor/home" className="font-mono text-[12px] text-muted uppercase underline">Cancel</Link>} />
      <img src={product.imageUrls[0]} alt="" className="mb-4 aspect-[3/4] w-32 border border-ink object-cover" />
      <ProductForm shops={shops} initial={{ ...product }} submitLabel="Save changes" busy={busy} onSubmit={save} />
      <ErrorBanner message={error} />
      <Button type="button" variant="danger" className="mt-4 w-full" disabled={busy} onClick={() => void remove()}><Trash2 {...ICON} size={16} /> Delete product</Button>
    </div>
  )
}
