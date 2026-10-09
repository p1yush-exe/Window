import type { Timestamp } from 'firebase/firestore'

export type Role = 'buyer' | 'vendor'
export type Availability = 'in_stock' | 'low' | 'out_of_stock'

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: 'In stock',
  low: 'Few left',
  out_of_stock: 'Out of stock',
}

export const CATEGORIES = [
  'Clothes',
  'Shoes',
  'Wardrobe',
  'Paintings',
  'Decor',
  'Groceries',
  'Other',
] as const
export type Category = (typeof CATEGORIES)[number]

export interface StoreLocation {
  lat: number
  lng: number
  address: string
  /** Short neighbourhood or city label shown on cards, e.g. "Adalat Bazaar". */
  area?: string
}

export interface UserProfile {
  uid: string
  role: Role
  displayName: string
  avatarUrl: string | null
  /** Shopper's browsing location and interests (copied from device prefs at sign-up). */
  location?: StoreLocation | null
  interests?: string[]
  createdAt: Timestamp | null
}

export const STORE_TAGS = [
  'Clothes',
  'Shoes',
  'Wardrobe',
  'Paintings',
  'Decor',
  'Groceries',
  'Handmade',
  'Vintage',
  'Kids',
  'Sports',
  'Beauty',
  'Electronics',
] as const
export type StoreTag = (typeof STORE_TAGS)[number]
export const MAX_STORE_TAGS = 3

export interface Vendor {
  id: string
  ownerUid: string
  name: string
  description: string
  logoUrl: string | null
  storefrontUrl: string | null
  website: string | null
  tags: string[]
  location: StoreLocation | null
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  phoneVerified: boolean
  emailVerified: boolean
  verified: boolean
  createdAt: Timestamp | null
}

export interface Product {
  id: string
  vendorId: string
  vendorName: string
  title: string
  description: string
  price: number | null
  currency: string
  category: Category
  imageUrls: string[]
  availability: Availability
  /** Copied from the vendor's store location so the feed can query by area. */
  lat: number | null
  lng: number | null
  geohash: string | null
  area: string | null
  vendorTags: string[]
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export const RADIUS_STEPS_KM = [10, 25, 50] as const
export const FEED_MIN_RESULTS = 20

export interface Match {
  id: string
  buyerUid: string
  buyerName: string
  vendorId: string
  vendorName: string
  productId: string
  productTitle: string
  productImage: string | null
  productAvailability: Availability
  createdAt: Timestamp | null
  swipeClientTs: number
  lastMessageAt: Timestamp | null
  lastMessageText: string
  lastMessageSender: string | null
  unread: Record<string, number>
}

export interface Message {
  id: string
  senderUid: string
  body: string
  clientTs: number
  createdAt: Timestamp | null
  pending?: boolean
}

export interface Review {
  id: string
  buyerUid: string
  buyerName: string
  vendorId: string
  productId: string
  productTitle: string
  rating: number
  body: string
  createdAt: Timestamp | null
}

export type NotificationType = 'availability' | 'system'

export interface AppNotification {
  id: string
  type: NotificationType
  matchId: string | null
  productId: string | null
  title: string
  body: string
  read: boolean
  createdAt: Timestamp | null
}

export const matchIdFor = (buyerUid: string, productId: string) => `${buyerUid}_${productId}`
export const reviewIdFor = matchIdFor
