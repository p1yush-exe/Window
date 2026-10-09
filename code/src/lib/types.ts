import type { Timestamp } from 'firebase/firestore'

export type Role = 'buyer' | 'vendor'
export type Availability = 'in_stock' | 'low' | 'out_of_stock'

export const AVAILABILITY_LABEL: Record<Availability, string> = {
  in_stock: 'In stock',
  low: 'Few left',
  out_of_stock: 'Out of stock',
}

/**
 * One tag vocabulary for shops, products and shopper interests.
 * Deliberately excludes food, medical devices, drugs and electronics.
 */
export const TAGS = [
  'clothing', 'tshirt', 'shirt', 'jeans', 'pants', 'socks', 'kurta', 'saree', 'ethnic',
  'shoes', 'bags', 'accessories', 'jewellery',
  'interior', 'curtains', 'bedsheet', 'furniture', 'lighting', 'kitchenware', 'decor',
  'art', 'painting', 'pottery', 'hand-made', 'vintage', 'stationery', 'toys', 'kids', 'sports', 'beauty',
] as const
export type Tag = (typeof TAGS)[number]
export const MAX_TAGS = 3

/** Kept for older screens; same vocabulary. */
export const STORE_TAGS = TAGS
export const MAX_STORE_TAGS = MAX_TAGS
export const CATEGORIES = TAGS
export type Category = Tag

export const PAYMENT_MODES = ['upi', 'cash', 'netbanking'] as const
export type PaymentMode = (typeof PAYMENT_MODES)[number]

export interface StoreLocation {
  lat: number
  lng: number
  address: string
  area?: string
}

export interface UserProfile {
  uid: string
  role: Role
  displayName: string
  username?: string
  phone?: string
  email?: string
  avatarUrl: string | null
  location?: StoreLocation | null
  interests?: string[]
  /** Swipe economy */
  swipes: number
  superSwipes: number
  lastDailyGrant: string | null
  appBonusGranted: boolean
  hasShop: boolean
  createdAt: Timestamp | null
}

export const DAILY_SWIPES = 5
export const APP_BONUS_SUPER = 2

/** Owner profile: credentials, verification, tokens and payment ids. Doc id == owner uid. */
export interface Vendor {
  id: string
  ownerUid: string
  ownerName: string
  ownerPhone: string
  ownerEmail: string
  phoneVerified: boolean
  emailVerified: boolean
  verified: boolean
  tokens: number
  uploadsRemaining: number
  paymentIds: { upi: string; bank: string }
  primaryShopId: string | null
  createdAt: Timestamp | null
}

export const UPLOADS_PER_TOKEN = 10
export const FREE_TOKENS = 1

export type FrameStyle = 'none' | 'lime' | 'bone' | 'double' | 'dashed'

export interface ShopTheme {
  frame: FrameStyle
  badge: string | null
}

export interface Shop {
  id: string
  ownerUid: string
  name: string
  description: string
  tags: string[]
  website: string | null
  storefrontUrl: string | null
  logoUrl: string | null
  location: StoreLocation | null
  autoMessage: string
  autoMatchUntil: Timestamp | null
  theme: ShopTheme
  decorations: string[]
  createdAt: Timestamp | null
}

export interface Product {
  id: string
  productCode: string
  vendorId: string
  vendorName: string
  shopId: string
  shopName: string
  title: string
  description: string
  tags: string[]
  category: string
  priceMin: number | null
  priceMax: number | null
  /** Legacy single price; prefer priceMin/priceMax. */
  price: number | null
  currency: string
  imageUrls: string[]
  availability: Availability
  paymentModes: PaymentMode[]
  superOnly: boolean
  lat: number | null
  lng: number | null
  geohash: string | null
  area: string | null
  vendorTags: string[]
  /** Set by a super swipe: the product is reserved for this buyer and leaves other feeds. */
  claimedBy?: string | null
  claimedByName?: string | null
  claimedAt?: Timestamp | null
  createdAt: Timestamp | null
  updatedAt: Timestamp | null
}

export type LikeType = 'swipe' | 'super'
export type LikeStatus = 'pending' | 'accepted' | 'declined'

/** A right swipe. Doc id == buyerUid_productId. */
export interface Like {
  id: string
  buyerUid: string
  buyerName: string
  vendorId: string
  shopId: string
  productId: string
  productTitle: string
  productImage: string | null
  type: LikeType
  status: LikeStatus
  createdAt: Timestamp | null
  decidedAt: Timestamp | null
}

export interface Match {
  id: string
  buyerUid: string
  buyerName: string
  vendorId: string
  vendorName: string
  shopId: string
  shopName: string
  productId: string
  productTitle: string
  productImage: string | null
  productAvailability: Availability
  likeType: LikeType
  autoMessage: string | null
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

export type NotificationType = 'availability' | 'like' | 'match' | 'superswipe' | 'system'

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

export type PurchaseKind = 'swipes' | 'superSwipes' | 'tokens' | 'autoMatch' | 'decoration'

export interface Bundle {
  qty: number
  listPrice: number
  price: number
}

export const SWIPE_BUNDLES: Bundle[] = [
  { qty: 10, listPrice: 444, price: 350 },
  { qty: 15, listPrice: 1111, price: 950 },
  { qty: 25, listPrice: 1333, price: 1200 },
]
export const SUPER_BUNDLES: Bundle[] = [
  { qty: 5, listPrice: 444, price: 350 },
  { qty: 10, listPrice: 1111, price: 950 },
  { qty: 15, listPrice: 1333, price: 1200 },
]
export const TOKEN_BUNDLES: Bundle[] = [
  { qty: 5, listPrice: 512.34, price: 499.99 },
  { qty: 10, listPrice: 1015.56, price: 999.99 },
  { qty: 15, listPrice: 1518.78, price: 1499.99 },
  { qty: 20, listPrice: 2022.0, price: 1999.99 },
]
export const AUTO_MATCH_PRICE_PER_DAY = 99.99

export interface Decoration {
  id: string
  name: string
  blurb: string
  price: number
  frame?: FrameStyle
  badge?: string
}
export const DECORATIONS: Decoration[] = [
  { id: 'frame-lime', name: 'Surveyor frame', blurb: 'Lime hairline around every product card.', price: 149, frame: 'lime' },
  { id: 'frame-bone', name: 'Vellum frame', blurb: 'Thick bone border, editorial look.', price: 149, frame: 'bone' },
  { id: 'frame-double', name: 'Double rule', blurb: 'Two thin rules, like a print catalogue.', price: 199, frame: 'double' },
  { id: 'frame-dashed', name: 'Survey dashes', blurb: 'Dashed survey-marker outline.', price: 99, frame: 'dashed' },
  { id: 'badge-studio', name: '“Studio” badge', blurb: 'A mono STUDIO tag on your cards.', price: 249, badge: 'Studio' },
  { id: 'badge-original', name: '“Original” badge', blurb: 'Marks hand-made originals.', price: 249, badge: 'Original' },
]

export const RADIUS_STEPS_KM = [10, 25, 50] as const
export const FEED_MIN_RESULTS = 20

export const matchIdFor = (buyerUid: string, productId: string) => `${buyerUid}_${productId}`
export const likeIdFor = matchIdFor
export const reviewIdFor = matchIdFor

export function countWords(s: string): number {
  return s.trim().split(/\s+/).filter(Boolean).length
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Random product code such as WN-7F3K2Q. */
export function newProductCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let s = ''
  const arr = new Uint8Array(6)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(arr)
  else for (let i = 0; i < 6; i++) arr[i] = Math.floor(Math.random() * 256)
  for (const b of arr) s += alphabet[b % alphabet.length]
  return `WN-${s}`
}
