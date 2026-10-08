import { useEffect, useState } from 'react'
import { listenVendor, listenVendorProducts } from '@/lib/db'
import type { Product, Vendor } from '@/lib/types'

export function useVendor(vendorId: string) {
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined)
  useEffect(() => listenVendor(vendorId, setVendor), [vendorId])
  return vendor
}

export function useVendorProducts(vendorId: string) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => listenVendorProducts(vendorId, setProducts, (e) => setError(e.message)), [vendorId])
  return { products, error }
}
