import { useEffect, useState } from 'react'
import { listenOwnerShops, listenShop, listenShopProducts, listenVendor, listenVendorProducts } from '@/lib/db'
import type { Product, Shop, Vendor } from '@/lib/types'

export function useVendor(uid: string) {
  const [vendor, setVendor] = useState<Vendor | null | undefined>(undefined)
  useEffect(() => listenVendor(uid, setVendor), [uid])
  return vendor
}

export function useOwnerShops(uid: string) {
  const [shops, setShops] = useState<Shop[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => listenOwnerShops(uid, setShops, (e) => setError(e.message)), [uid])
  return { shops, error }
}

export function useShop(shopId: string | null | undefined) {
  const [shop, setShop] = useState<Shop | null | undefined>(undefined)
  useEffect(() => {
    if (!shopId) {
      setShop(null)
      return
    }
    return listenShop(shopId, setShop)
  }, [shopId])
  return shop
}

export function useVendorProducts(vendorId: string) {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => listenVendorProducts(vendorId, setProducts, (e) => setError(e.message)), [vendorId])
  return { products, error }
}

export function useShopProducts(shopId: string | null) {
  const [products, setProducts] = useState<Product[] | null>(null)
  useEffect(() => {
    if (!shopId) {
      setProducts([])
      return
    }
    return listenShopProducts(shopId, setProducts)
  }, [shopId])
  return products
}
