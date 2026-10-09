import { useState } from 'react'
import { Link } from 'react-router'
import { AvailabilityBadge, Button, EmptyState, ErrorBanner, FullPageSpinner, PageHeader, ProductImage, Select } from '@/components/ui'
import { useSession } from '@/features/auth/AuthProvider'
import { setAvailability } from '@/lib/db'
import { formatPrice } from '@/lib/format'
import { AVAILABILITY_LABEL, type Availability, type Product } from '@/lib/types'
import { useVendor, useVendorProducts } from './useVendor'

export function DashboardPage() {
  const { profile } = useSession()
  const vendor = useVendor(profile.uid)
  const { products, error } = useVendorProducts(profile.uid)
  const [toast, setToast] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function changeAvailability(p: Product, value: Availability) {
    setBusyId(p.id)
    try {
      const notified = await setAvailability(p, value)
      setToast(`${p.title}: ${AVAILABILITY_LABEL[value]}${notified ? ` · ${notified} interested buyer${notified === 1 ? '' : 's'} notified` : ''}`)
      setTimeout(() => setToast(null), 3000)
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not update')
    } finally {
      setBusyId(null)
    }
  }

  if (vendor === undefined || products === null) return <FullPageSpinner />

  return (
    <div className="px-4 pt-4 md:pt-8">
      <PageHeader
        title={vendor?.name ?? 'My store'}
        subtitle={`${products.length} product${products.length === 1 ? '' : 's'}`}
        right={
          <div className="flex gap-2">
            <Link to="/dashboard/store">
              <Button variant="secondary" size="sm">Store settings</Button>
            </Link>
            <Link to="/dashboard/new">
              <Button size="sm">+ Add product</Button>
            </Link>
          </div>
        }
      />
      <ErrorBanner message={error} />
      {!vendor && (
        <ErrorBanner message="Your store profile is missing. Open store settings to create it." />
      )}
      {toast && <div className="mb-3 rounded-xl bg-ink px-3 py-2 text-sm text-canvas">{toast}</div>}

      {products.length === 0 ? (
        <EmptyState
          icon="📦"
          title="No products yet"
          body="Add your first product. Price is optional: leave it blank to let buyers ask."
          action={
            <Link to="/dashboard/new">
              <Button>Add a product</Button>
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {products.map((p) => (
            <li key={p.id} className="flex gap-3 rounded-2xl bg-canvas p-3 ring-1 ring-line">
              <Link to={`/product/${p.id}`}>
                <ProductImage src={p.imageUrls[0]} alt={p.title} className="h-24 w-20 rounded-xl" />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{p.title}</p>
                    <p className="text-xs text-muted">
                      {p.category} · {formatPrice(p.price, p.currency)}
                    </p>
                  </div>
                  <AvailabilityBadge value={p.availability} />
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <Select
                    aria-label="Availability"
                    value={p.availability}
                    disabled={busyId === p.id}
                    onChange={(e) => void changeAvailability(p, e.target.value as Availability)}
                    className="h-9 text-sm"
                  >
                    {(Object.keys(AVAILABILITY_LABEL) as Availability[]).map((k) => (
                      <option key={k} value={k}>
                        {AVAILABILITY_LABEL[k]}
                      </option>
                    ))}
                  </Select>
                  <Link to={`/dashboard/edit/${p.id}`}>
                    <Button variant="secondary" size="sm">Edit</Button>
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
