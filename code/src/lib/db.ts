import {
  collection,
  deleteDoc,
  doc,
  endAt,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  startAt,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { areaLabel, geohashBounds, geohashOf, type LatLng } from './geo'
import {
  APP_BONUS_SUPER,
  DAILY_SWIPES,
  FREE_TOKENS,
  UPLOADS_PER_TOKEN,
  likeIdFor,
  matchIdFor,
  newProductCode,
  reviewIdFor,
  todayKey,
  type AppNotification,
  type Availability,
  type Like,
  type LikeType,
  type Match,
  type Message,
  type PaymentMode,
  type Product,
  type PurchaseKind,
  type Review,
  type Role,
  type Shop,
  type ShopTheme,
  type StoreLocation,
  type UserProfile,
  type Vendor,
} from './types'

// ---------- generic helpers ----------

function fromSnap<T>(snap: DocumentSnapshot<DocumentData>): T | null {
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data({ serverTimestamps: 'estimate' }) as object) } as T
}

function fromQuerySnap<T>(snap: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snap.id, ...(snap.data({ serverTimestamps: 'estimate' }) as object) } as T
}

function profileFrom(snap: DocumentSnapshot<DocumentData>): UserProfile | null {
  if (!snap.exists()) return null
  const d = snap.data() as Partial<UserProfile>
  return {
    uid: snap.id,
    role: d.role ?? 'buyer',
    displayName: d.displayName ?? '',
    username: d.username,
    phone: d.phone,
    email: d.email,
    avatarUrl: d.avatarUrl ?? null,
    location: d.location ?? null,
    interests: d.interests ?? [],
    swipes: d.swipes ?? 0,
    superSwipes: d.superSwipes ?? 0,
    lastDailyGrant: d.lastDailyGrant ?? null,
    appBonusGranted: d.appBonusGranted ?? false,
    hasShop: d.hasShop ?? false,
    createdAt: d.createdAt ?? null,
  }
}

// ---------- refs ----------

export const refs = {
  user: (uid: string) => doc(db, 'users', uid),
  swipes: (uid: string) => collection(db, 'users', uid, 'swipes'),
  swipe: (uid: string, productId: string) => doc(db, 'users', uid, 'swipes', productId),
  notifications: (uid: string) => collection(db, 'users', uid, 'notifications'),
  notification: (uid: string, id: string) => doc(db, 'users', uid, 'notifications', id),
  vendor: (id: string) => doc(db, 'vendors', id),
  shops: () => collection(db, 'shops'),
  shop: (id: string) => doc(db, 'shops', id),
  products: () => collection(db, 'products'),
  product: (id: string) => doc(db, 'products', id),
  likes: () => collection(db, 'likes'),
  like: (id: string) => doc(db, 'likes', id),
  matches: () => collection(db, 'matches'),
  match: (id: string) => doc(db, 'matches', id),
  messages: (matchId: string) => collection(db, 'matches', matchId, 'messages'),
  reviews: () => collection(db, 'reviews'),
  review: (id: string) => doc(db, 'reviews', id),
  purchases: () => collection(db, 'purchases'),
}

// ---------- users ----------

export function listenProfile(uid: string, cb: (p: UserProfile | null) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(refs.user(uid), (snap) => cb(profileFrom(snap)), (e) => onError?.(e))
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  return profileFrom(await getDoc(refs.user(uid)))
}

export async function createProfile(
  uid: string,
  role: Role,
  displayName: string,
  extras: { avatarUrl?: string | null; location?: StoreLocation | null; interests?: string[]; email?: string | null; phone?: string | null } = {},
) {
  await setDoc(refs.user(uid), {
    role,
    displayName,
    username: displayName.toLowerCase().replace(/[^a-z0-9]+/g, '').slice(0, 16) || `user${uid.slice(0, 5).toLowerCase()}`,
    email: extras.email ?? null,
    phone: extras.phone ?? null,
    avatarUrl: extras.avatarUrl ?? null,
    location: extras.location ?? null,
    interests: (extras.interests ?? []).slice(0, 3),
    swipes: DAILY_SWIPES,
    superSwipes: 0,
    lastDailyGrant: todayKey(),
    appBonusGranted: false,
    hasShop: role === 'vendor',
    createdAt: serverTimestamp(),
  })
}

export async function updateProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'username' | 'phone' | 'email' | 'avatarUrl' | 'location' | 'interests' | 'hasShop'>>,
) {
  await updateDoc(refs.user(uid), data)
}

/** Grants the daily swipes once per calendar day. Returns true when something was granted. */
export async function grantDailySwipes(profile: UserProfile): Promise<boolean> {
  const today = todayKey()
  if (profile.lastDailyGrant === today) return false
  await updateDoc(refs.user(profile.uid), { swipes: profile.swipes + DAILY_SWIPES, lastDailyGrant: today })
  return true
}

/** Backfills fields on profiles created before the swipe economy existed. */
export async function ensureProfileDefaults(uid: string): Promise<boolean> {
  const snap = await getDoc(refs.user(uid))
  if (!snap.exists()) return false
  const d = snap.data() as Record<string, unknown>
  const patch: Record<string, unknown> = {}
  if (typeof d.swipes !== 'number') patch.swipes = DAILY_SWIPES
  if (typeof d.superSwipes !== 'number') patch.superSwipes = 0
  if (typeof d.appBonusGranted !== 'boolean') patch.appBonusGranted = false
  if (typeof d.hasShop !== 'boolean') patch.hasShop = d.role === 'vendor'
  if (!Array.isArray(d.interests)) patch.interests = []
  if (d.lastDailyGrant === undefined) patch.lastDailyGrant = typeof d.swipes === 'number' ? null : todayKey()
  if (Object.keys(patch).length === 0) return false
  await updateDoc(refs.user(uid), patch)
  return true
}

/** First login inside the Android app gives 2 super swipes. */
export async function grantAppBonus(profile: UserProfile): Promise<boolean> {
  if (profile.appBonusGranted) return false
  await updateDoc(refs.user(profile.uid), { superSwipes: profile.superSwipes + APP_BONUS_SUPER, appBonusGranted: true })
  return true
}

/** Simulated purchase: records it and credits the balance immediately. */
export async function purchase(uid: string, kind: PurchaseKind, qty: number, amount: number, target?: { shopId?: string; decorationId?: string }) {
  const batch = writeBatch(db)
  batch.set(doc(refs.purchases()), { uid, kind, qty, amount, ...target, createdAt: serverTimestamp() })
  if (kind === 'swipes') batch.update(refs.user(uid), { swipes: increment(qty) })
  if (kind === 'superSwipes') batch.update(refs.user(uid), { superSwipes: increment(qty) })
  if (kind === 'tokens') batch.update(refs.vendor(uid), { tokens: increment(qty) })
  if (kind === 'autoMatch' && target?.shopId) {
    const until = Timestamp.fromMillis(Date.now() + qty * 24 * 3600 * 1000)
    batch.update(refs.shop(target.shopId), { autoMatchUntil: until })
  }
  if (kind === 'decoration' && target?.shopId && target.decorationId) {
    const snap = await getDoc(refs.shop(target.shopId))
    const owned = ((snap.data()?.decorations as string[] | undefined) ?? []).concat(target.decorationId)
    batch.update(refs.shop(target.shopId), { decorations: [...new Set(owned)] })
  }
  await batch.commit()
}

// ---------- vendors (owner profiles) ----------

export async function createVendor(uid: string, data: Partial<Vendor> & { ownerName: string; ownerEmail: string }) {
  await setDoc(refs.vendor(uid), {
    ownerUid: uid,
    ownerName: data.ownerName,
    ownerPhone: data.ownerPhone ?? '',
    ownerEmail: data.ownerEmail,
    phoneVerified: data.phoneVerified ?? false,
    emailVerified: data.emailVerified ?? false,
    verified: false,
    tokens: FREE_TOKENS,
    uploadsRemaining: 0,
    paymentIds: data.paymentIds ?? { upi: '', bank: '' },
    primaryShopId: data.primaryShopId ?? null,
    createdAt: serverTimestamp(),
  })
  await updateDoc(refs.user(uid), { hasShop: true }).catch(() => undefined)
}

export async function updateVendor(uid: string, data: Partial<Pick<Vendor, 'ownerName' | 'ownerPhone' | 'ownerEmail' | 'phoneVerified' | 'emailVerified' | 'paymentIds' | 'primaryShopId'>>) {
  await updateDoc(refs.vendor(uid), data)
}

export async function getVendor(id: string): Promise<Vendor | null> {
  return fromSnap<Vendor>(await getDoc(refs.vendor(id)))
}

export function listenVendor(id: string, cb: (v: Vendor | null) => void): Unsubscribe {
  return onSnapshot(refs.vendor(id), (snap) => cb(fromSnap<Vendor>(snap)))
}

export const uploadsLeft = (v: Vendor) => v.uploadsRemaining + v.tokens * UPLOADS_PER_TOKEN

// ---------- shops ----------

export type ShopInput = Omit<Shop, 'id' | 'ownerUid' | 'createdAt' | 'autoMatchUntil' | 'theme' | 'decorations'> &
  Partial<Pick<Shop, 'theme' | 'decorations' | 'autoMatchUntil'>>

export const emptyShopInput = (): ShopInput => ({
  name: '',
  description: '',
  tags: [],
  website: null,
  storefrontUrl: null,
  logoUrl: null,
  location: null,
  autoMessage: '',
})

export async function createShop(ownerUid: string, input: ShopInput): Promise<string> {
  const ref = doc(refs.shops())
  await setDoc(ref, {
    ...input,
    tags: input.tags.slice(0, 3),
    theme: input.theme ?? { frame: 'none', badge: null },
    decorations: input.decorations ?? [],
    autoMatchUntil: input.autoMatchUntil ?? null,
    ownerUid,
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateShop(shopId: string, data: Partial<ShopInput> & { theme?: ShopTheme }) {
  await updateDoc(refs.shop(shopId), data)
}

export async function getShop(id: string): Promise<Shop | null> {
  return fromSnap<Shop>(await getDoc(refs.shop(id)))
}

export function listenShop(id: string, cb: (s: Shop | null) => void): Unsubscribe {
  return onSnapshot(refs.shop(id), (snap) => cb(fromSnap<Shop>(snap)))
}

export function listenOwnerShops(ownerUid: string, cb: (s: Shop[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(refs.shops(), where('ownerUid', '==', ownerUid), orderBy('createdAt', 'asc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<Shop>(d))), (e) => onError?.(e))
}

export async function getOwnerShops(ownerUid: string): Promise<Shop[]> {
  const snap = await getDocs(query(refs.shops(), where('ownerUid', '==', ownerUid), orderBy('createdAt', 'asc')))
  return snap.docs.map((d) => fromQuerySnap<Shop>(d))
}

export const autoMatchActive = (shop: Pick<Shop, 'autoMatchUntil'> | null | undefined) =>
  Boolean(shop?.autoMatchUntil && shop.autoMatchUntil.toMillis() > Date.now())

// ---------- products ----------

export interface ProductInput {
  title: string
  description: string
  tags: string[]
  priceMin: number | null
  priceMax: number | null
  currency: string
  imageUrls: string[]
  availability: Availability
  paymentModes: PaymentMode[]
  superOnly: boolean
}

/** Location + tags every product carries so the feed can filter by area and interests. */
export function shopGeoFields(shop: Pick<Shop, 'id' | 'location' | 'tags' | 'name'>) {
  const loc = shop.location
  return {
    shopId: shop.id,
    shopName: shop.name,
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    geohash: loc ? geohashOf(loc) : null,
    area: loc ? areaLabel(loc) : null,
    vendorTags: (shop.tags ?? []).slice(0, 3),
  }
}

/** Creates the product and spends an upload (or a token when the current batch is used up). */
export async function createProduct(vendor: Vendor, shop: Shop, input: ProductInput): Promise<{ id: string; productCode: string }> {
  if (uploadsLeft(vendor) <= 0) throw new Error('No uploads left. Buy upload tokens in Shop management.')
  const productCode = newProductCode()
  const ref = doc(refs.products())
  const batch = writeBatch(db)
  batch.set(ref, {
    ...input,
    tags: input.tags.slice(0, 3),
    category: input.tags[0] ?? 'other',
    price: input.priceMin,
    productCode,
    vendorId: vendor.id,
    vendorName: vendor.ownerName,
    ...shopGeoFields(shop),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  if (vendor.uploadsRemaining > 0) batch.update(refs.vendor(vendor.id), { uploadsRemaining: increment(-1) })
  else batch.update(refs.vendor(vendor.id), { tokens: increment(-1), uploadsRemaining: UPLOADS_PER_TOKEN - 1 })
  await batch.commit()
  return { id: ref.id, productCode }
}

export async function updateProduct(productId: string, input: Partial<ProductInput>) {
  const patch: Record<string, unknown> = { ...input, updatedAt: serverTimestamp() }
  if (input.tags) {
    patch.tags = input.tags.slice(0, 3)
    patch.category = input.tags[0] ?? 'other'
  }
  if ('priceMin' in input) patch.price = input.priceMin ?? null
  await updateDoc(refs.product(productId), patch)
}

/** Seller puts a claimed product back on the market. */
export async function releaseClaim(productId: string) {
  await updateDoc(refs.product(productId), { claimedBy: null, claimedByName: null, claimedAt: null, updatedAt: serverTimestamp() })
}

export async function deleteProduct(productId: string) {
  await deleteDoc(refs.product(productId))
}

export async function getProduct(id: string): Promise<Product | null> {
  return fromSnap<Product>(await getDoc(refs.product(id)))
}

export function listenProduct(id: string, cb: (p: Product | null) => void): Unsubscribe {
  return onSnapshot(refs.product(id), (snap) => cb(fromSnap<Product>(snap)))
}

export function listenVendorProducts(vendorId: string, cb: (p: Product[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(refs.products(), where('vendorId', '==', vendorId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<Product>(d))), (e) => onError?.(e))
}

export function listenShopProducts(shopId: string, cb: (p: Product[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(refs.products(), where('shopId', '==', shopId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<Product>(d))), (e) => onError?.(e))
}

/** After a shop edits name, tags or location, push the copies down to its products. */
export async function syncShopToProducts(shop: Shop): Promise<number> {
  const snap = await getDocs(query(refs.products(), where('shopId', '==', shop.id)))
  if (snap.empty) return 0
  const fields = shopGeoFields(shop)
  const batch = writeBatch(db)
  for (const d of snap.docs) batch.update(d.ref, fields)
  await batch.commit()
  return snap.size
}

export const FEED_PAGE = 20

/** Newest-first page of in-stock products, no location filter (fallback when no area is set). */
export async function fetchFeedPage(cursor: QueryDocumentSnapshot<DocumentData> | null) {
  const base = [where('availability', 'in', ['in_stock', 'low']), orderBy('createdAt', 'desc'), limit(FEED_PAGE)] as const
  const q = cursor ? query(refs.products(), ...base, startAfter(cursor)) : query(refs.products(), ...base)
  const snap = await getDocs(q)
  return {
    products: snap.docs.map((d) => fromQuerySnap<Product>(d)),
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1]! : null,
    done: snap.docs.length < FEED_PAGE,
  }
}

const LOCAL_PAGE = 80

/** Every product whose geohash falls inside the bounding cells for the radius (over-covers; filter by distance). */
export async function fetchLocalProducts(center: LatLng, radiusKm: number): Promise<Product[]> {
  const bounds = geohashBounds(center, radiusKm)
  const snaps = await Promise.all(
    bounds.map(([start, end]) => getDocs(query(refs.products(), orderBy('geohash'), startAt(start), endAt(end), limit(LOCAL_PAGE)))),
  )
  const out = new Map<string, Product>()
  for (const snap of snaps) for (const d of snap.docs) out.set(d.id, fromQuerySnap<Product>(d))
  return [...out.values()]
}

// ---------- swipes, likes & matches ----------

export async function loadSwipedIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(refs.swipes(uid))
  return new Set(snap.docs.map((d) => d.id))
}

/** Left swipe: remembered so the card does not come back; costs nothing. */
export async function recordPass(buyer: UserProfile, product: Product) {
  await setDoc(refs.swipe(buyer.uid, product.id), { direction: 'left', clientTs: Date.now(), createdAt: serverTimestamp() })
}

function matchData(buyer: UserProfile, product: Product, type: LikeType, shop: Shop | null, clientTs: number) {
  return {
    buyerUid: buyer.uid,
    buyerName: buyer.displayName,
    vendorId: product.vendorId,
    vendorName: product.vendorName,
    shopId: product.shopId,
    shopName: product.shopName,
    productId: product.id,
    productTitle: product.title,
    productImage: product.imageUrls[0] ?? null,
    productAvailability: product.availability,
    likeType: type,
    autoMessage: shop?.autoMessage?.trim() ? shop.autoMessage.trim() : null,
    createdAt: serverTimestamp(),
    swipeClientTs: clientTs,
    lastMessageAt: serverTimestamp(),
    lastMessageText: shop?.autoMessage?.trim() ? shop.autoMessage.trim().slice(0, 120) : '',
    lastMessageSender: shop?.autoMessage?.trim() ? product.vendorId : null,
    unread: { [buyer.uid]: shop?.autoMessage?.trim() ? 1 : 0, [product.vendorId]: 0 },
  }
}

export type LikeOutcome = { kind: 'matched'; matchId: string } | { kind: 'pending'; likeId: string }

/** Writes the claim on the product and the seller's notification into an in-progress super-swipe batch. */
function claimInBatch(batch: ReturnType<typeof writeBatch>, buyer: UserProfile, product: Product, likeId: string) {
  batch.update(refs.product(product.id), { claimedBy: buyer.uid, claimedByName: buyer.displayName, claimedAt: serverTimestamp(), updatedAt: serverTimestamp() })
  batch.set(doc(refs.notifications(product.vendorId)), {
    type: 'superswipe',
    matchId: likeId,
    productId: product.id,
    title: product.title,
    body: `${buyer.displayName} super swiped ${product.title}. It is reserved for them; the chat is open.`,
    read: false,
    createdAt: serverTimestamp(),
    sentAt: Date.now(),
  })
}

/**
 * Right swipe or super swipe. Spends the balance, writes the swipe + like, and
 * creates the match immediately for super swipes or when the shop's auto-matcher is on.
 */
export async function recordLike(buyer: UserProfile, product: Product, type: LikeType): Promise<LikeOutcome> {
  if (type === 'swipe' && product.superOnly) throw new Error('This product only accepts super swipes.')
  if (type === 'swipe' && buyer.swipes <= 0) throw new Error('No swipes left.')
  if (type === 'super' && buyer.superSwipes <= 0) throw new Error('No super swipes left.')
  if (product.claimedBy && product.claimedBy !== buyer.uid) throw new Error('Someone already claimed this product with a super swipe.')
  const shop = product.shopId ? await getShop(product.shopId) : null
  const instant = type === 'super' || autoMatchActive(shop)
  const clientTs = Date.now()
  const likeId = likeIdFor(buyer.uid, product.id)
  const batch = writeBatch(db)
  batch.set(refs.swipe(buyer.uid, product.id), { direction: 'right', type, clientTs, createdAt: serverTimestamp() })
  batch.set(refs.like(likeId), {
    buyerUid: buyer.uid,
    buyerName: buyer.displayName,
    vendorId: product.vendorId,
    shopId: product.shopId,
    productId: product.id,
    productTitle: product.title,
    productImage: product.imageUrls[0] ?? null,
    type,
    status: instant ? 'accepted' : 'pending',
    createdAt: serverTimestamp(),
    decidedAt: instant ? serverTimestamp() : null,
  })
  // Absolute values (not increment) so profiles that predate the balances cannot go negative.
  batch.update(refs.user(buyer.uid), type === 'swipe' ? { swipes: Math.max(0, buyer.swipes - 1) } : { superSwipes: Math.max(0, buyer.superSwipes - 1) })
  if (instant) batch.set(refs.match(likeId), matchData(buyer, product, type, shop, clientTs))
  if (type === 'super') claimInBatch(batch, buyer, product, likeId)
  await batch.commit()
  return instant ? { kind: 'matched', matchId: likeId } : { kind: 'pending', likeId }
}

/**
 * Buyer turns a pending like into a super swipe: the match opens now, the super swipe is
 * spent and the regular swipe that was used is refunded.
 */
export async function upgradeLikeToSuper(buyer: UserProfile, product: Product): Promise<LikeOutcome> {
  if (buyer.superSwipes <= 0) throw new Error('No super swipes left.')
  const likeId = likeIdFor(buyer.uid, product.id)
  const existing = await getDoc(refs.like(likeId))
  if (!existing.exists()) return recordLike(buyer, product, 'super')
  const like = existing.data() as Like
  if (like.status === 'accepted') return { kind: 'matched', matchId: likeId }
  if (like.status !== 'pending' || like.type !== 'swipe') throw new Error('This like can no longer be upgraded.')
  if (product.claimedBy && product.claimedBy !== buyer.uid) throw new Error('Someone already claimed this product with a super swipe.')
  const shop = product.shopId ? await getShop(product.shopId) : null
  const batch = writeBatch(db)
  batch.update(refs.like(likeId), { type: 'super', status: 'accepted', decidedAt: serverTimestamp() })
  batch.set(refs.match(likeId), matchData(buyer, product, 'super', shop, Date.now()))
  batch.update(refs.user(buyer.uid), { superSwipes: Math.max(0, buyer.superSwipes - 1), swipes: buyer.swipes + 1 })
  claimInBatch(batch, buyer, product, likeId)
  await batch.commit()
  return { kind: 'matched', matchId: likeId }
}

/** Vendor accepts a pending like: the match (and chat) is created. */
export async function acceptLike(like: Like, vendor: Vendor): Promise<string> {
  const [product, shop, buyer] = await Promise.all([getProduct(like.productId), getShop(like.shopId), getProfile(like.buyerUid)])
  if (!product) throw new Error('Product no longer exists')
  const buyerProfile: UserProfile = buyer ?? { uid: like.buyerUid, role: 'buyer', displayName: like.buyerName, avatarUrl: null, swipes: 0, superSwipes: 0, lastDailyGrant: null, appBonusGranted: false, hasShop: false, createdAt: null }
  const batch = writeBatch(db)
  batch.update(refs.like(like.id), { status: 'accepted', decidedAt: serverTimestamp() })
  batch.set(refs.match(like.id), { ...matchData(buyerProfile, product, like.type, shop, Date.now()), vendorName: vendor.ownerName })
  batch.set(doc(refs.notifications(like.buyerUid)), {
    type: 'match',
    matchId: like.id,
    productId: like.productId,
    title: like.productTitle,
    body: `${shop?.name ?? vendor.ownerName} accepted your like on ${like.productTitle}. Say hi!`,
    read: false,
    createdAt: serverTimestamp(),
    sentAt: Date.now(),
  })
  await batch.commit()
  return like.id
}

export async function declineLike(like: Like) {
  await updateDoc(refs.like(like.id), { status: 'declined', decidedAt: serverTimestamp() })
}

export function listenBuyerLikes(uid: string, cb: (l: Like[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(refs.likes(), where('buyerUid', '==', uid), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<Like>(d))), (e) => onError?.(e))
}

export function listenVendorLikes(vendorId: string, cb: (l: Like[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(refs.likes(), where('vendorId', '==', vendorId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<Like>(d))), (e) => onError?.(e))
}

export function listenMatches(uid: string, side: 'buyer' | 'vendor', cb: (m: Match[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const field = side === 'vendor' ? 'vendorId' : 'buyerUid'
  const q = query(refs.matches(), where(field, '==', uid), orderBy('lastMessageAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<Match>(d))), (e) => onError?.(e))
}

export function listenMatch(id: string, cb: (m: Match | null) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(refs.match(id), (snap) => cb(fromSnap<Match>(snap)), (e) => onError?.(e))
}

export async function getMatch(id: string): Promise<Match | null> {
  return fromSnap<Match>(await getDoc(refs.match(id)))
}

// ---------- messages ----------

export function listenMessages(matchId: string, cb: (m: Message[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(refs.messages(matchId), orderBy('createdAt', 'asc'))
  return onSnapshot(
    q,
    { includeMetadataChanges: true },
    (snap) => cb(snap.docs.map((d) => ({ ...fromQuerySnap<Message>(d), pending: d.metadata.hasPendingWrites }))),
    (e) => onError?.(e),
  )
}

export async function sendMessage(match: Match, senderUid: string, body: string) {
  const other = senderUid === match.buyerUid ? match.vendorId : match.buyerUid
  const clientTs = Date.now()
  const batch = writeBatch(db)
  batch.set(doc(refs.messages(match.id)), { senderUid, body, clientTs, createdAt: serverTimestamp() })
  batch.update(refs.match(match.id), {
    lastMessageAt: serverTimestamp(),
    lastMessageText: body.slice(0, 120),
    lastMessageSender: senderUid,
    [`unread.${other}`]: increment(1),
  })
  await batch.commit()
}

export async function markMatchRead(matchId: string, uid: string) {
  await updateDoc(refs.match(matchId), { [`unread.${uid}`]: 0 })
}

// ---------- availability fan-out ----------

export async function setAvailability(product: Product, availability: Availability): Promise<number> {
  await updateDoc(refs.product(product.id), { availability, updatedAt: serverTimestamp() })
  const q = query(refs.matches(), where('vendorId', '==', product.vendorId), where('productId', '==', product.id))
  const snap = await getDocs(q)
  if (snap.empty) return 0
  const label: Record<Availability, string> = { in_stock: 'is back in stock', low: 'is almost sold out', out_of_stock: 'is out of stock' }
  const batch = writeBatch(db)
  for (const d of snap.docs) {
    const m = fromQuerySnap<Match>(d)
    batch.update(refs.match(m.id), { productAvailability: availability })
    batch.set(doc(refs.notifications(m.buyerUid)), {
      type: 'availability',
      matchId: m.id,
      productId: product.id,
      title: product.title,
      body: `${product.title} from ${product.shopName || product.vendorName} ${label[availability]}.`,
      availability,
      read: false,
      createdAt: serverTimestamp(),
      sentAt: Date.now(),
    })
  }
  await batch.commit()
  return snap.size
}

// ---------- notifications ----------

export function listenNotifications(uid: string, cb: (n: AppNotification[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q = query(refs.notifications(uid), orderBy('createdAt', 'desc'), limit(50))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<AppNotification>(d))), (e) => onError?.(e))
}

export async function markNotificationRead(uid: string, id: string) {
  await updateDoc(refs.notification(uid, id), { read: true })
}

export async function markAllNotificationsRead(uid: string, ids: string[]) {
  if (!ids.length) return
  const batch = writeBatch(db)
  for (const id of ids) batch.update(refs.notification(uid, id), { read: true })
  await batch.commit()
}

// ---------- reviews ----------

export async function upsertReview(buyer: UserProfile, product: Pick<Product, 'id' | 'vendorId' | 'title'>, rating: number, body: string) {
  const id = reviewIdFor(buyer.uid, product.id)
  const existing = await getDoc(refs.review(id))
  if (existing.exists()) await updateDoc(refs.review(id), { rating, body })
  else
    await setDoc(refs.review(id), {
      buyerUid: buyer.uid,
      buyerName: buyer.displayName,
      vendorId: product.vendorId,
      productId: product.id,
      productTitle: product.title,
      rating,
      body,
      createdAt: serverTimestamp(),
    })
}

export async function getReview(buyerUid: string, productId: string): Promise<Review | null> {
  return fromSnap<Review>(await getDoc(refs.review(reviewIdFor(buyerUid, productId))))
}

export function listenReviews(by: { productId: string } | { vendorId: string }, cb: (r: Review[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const q =
    'productId' in by
      ? query(refs.reviews(), where('productId', '==', by.productId), orderBy('createdAt', 'desc'))
      : query(refs.reviews(), where('vendorId', '==', by.vendorId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => cb(snap.docs.map((d) => fromQuerySnap<Review>(d))), (e) => onError?.(e))
}

export function ratingSummary(reviews: Review[]) {
  if (!reviews.length) return { avg: null as number | null, count: 0 }
  const sum = reviews.reduce((a, r) => a + r.rating, 0)
  return { avg: Math.round((sum / reviews.length) * 10) / 10, count: reviews.length }
}

export { matchIdFor }
