import {
  addDoc,
  collection,
  doc,
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
  endAt,
  updateDoc,
  where,
  writeBatch,
  deleteDoc,
  type DocumentData,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'
import { areaLabel, geohashBounds, geohashOf, type LatLng } from './geo'
import {
  matchIdFor,
  reviewIdFor,
  type AppNotification,
  type Availability,
  type Category,
  type Match,
  type Message,
  type Product,
  type Review,
  type Role,
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

// ---------- refs ----------

export const refs = {
  user: (uid: string) => doc(db, 'users', uid),
  swipes: (uid: string) => collection(db, 'users', uid, 'swipes'),
  swipe: (uid: string, productId: string) => doc(db, 'users', uid, 'swipes', productId),
  notifications: (uid: string) => collection(db, 'users', uid, 'notifications'),
  notification: (uid: string, id: string) => doc(db, 'users', uid, 'notifications', id),
  vendor: (id: string) => doc(db, 'vendors', id),
  products: () => collection(db, 'products'),
  product: (id: string) => doc(db, 'products', id),
  matches: () => collection(db, 'matches'),
  match: (id: string) => doc(db, 'matches', id),
  messages: (matchId: string) => collection(db, 'matches', matchId, 'messages'),
  reviews: () => collection(db, 'reviews'),
  review: (id: string) => doc(db, 'reviews', id),
}

// ---------- users ----------

export function listenProfile(uid: string, cb: (p: UserProfile | null) => void, onError?: (e: Error) => void): Unsubscribe {
  return onSnapshot(
    refs.user(uid),
    (snap) => cb(snap.exists() ? ({ uid: snap.id, ...(snap.data() as object) } as UserProfile) : null),
    (e) => onError?.(e),
  )
}

export async function getProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(refs.user(uid))
  return snap.exists() ? ({ uid: snap.id, ...(snap.data() as object) } as UserProfile) : null
}

export async function createProfile(
  uid: string,
  role: Role,
  displayName: string,
  extras: { avatarUrl?: string | null; location?: StoreLocation | null; interests?: string[] } = {},
) {
  await setDoc(refs.user(uid), {
    role,
    displayName,
    avatarUrl: extras.avatarUrl ?? null,
    location: extras.location ?? null,
    interests: (extras.interests ?? []).slice(0, 3),
    createdAt: serverTimestamp(),
  })
}

export async function updateProfile(uid: string, data: Partial<Pick<UserProfile, 'displayName' | 'avatarUrl' | 'location' | 'interests'>>) {
  await updateDoc(refs.user(uid), data)
}

// ---------- vendors ----------

export type VendorInput = Omit<Vendor, 'id' | 'ownerUid' | 'verified' | 'createdAt'>

export const emptyVendorInput = (): VendorInput => ({
  name: '',
  description: '',
  logoUrl: null,
  storefrontUrl: null,
  website: null,
  tags: [],
  location: null,
  ownerName: '',
  ownerPhone: '',
  ownerEmail: '',
  phoneVerified: false,
  emailVerified: false,
})

export async function createVendor(uid: string, data: Partial<VendorInput> & { name: string }) {
  await setDoc(refs.vendor(uid), {
    ...emptyVendorInput(),
    ...data,
    ownerUid: uid,
    verified: false,
    createdAt: serverTimestamp(),
  })
}

export async function updateVendor(uid: string, data: Partial<VendorInput>) {
  await updateDoc(refs.vendor(uid), data)
}

export async function getVendor(id: string): Promise<Vendor | null> {
  return fromSnap<Vendor>(await getDoc(refs.vendor(id)))
}

export function listenVendor(id: string, cb: (v: Vendor | null) => void): Unsubscribe {
  return onSnapshot(refs.vendor(id), (snap) => cb(fromSnap<Vendor>(snap)))
}

// ---------- products ----------

export interface ProductInput {
  title: string
  description: string
  price: number | null
  currency: string
  category: Category
  imageUrls: string[]
  availability: Availability
}

/** Location + tags every product carries so the feed can filter by area and interests. */
export function vendorGeoFields(vendor: Pick<Vendor, 'location' | 'tags' | 'name'>) {
  const loc = vendor.location
  return {
    lat: loc?.lat ?? null,
    lng: loc?.lng ?? null,
    geohash: loc ? geohashOf(loc) : null,
    area: loc ? areaLabel(loc) : null,
    vendorTags: (vendor.tags ?? []).slice(0, 3),
    vendorName: vendor.name,
  }
}

export async function createProduct(vendor: Vendor, input: ProductInput): Promise<string> {
  const ref = await addDoc(refs.products(), {
    ...input,
    vendorId: vendor.id,
    ...vendorGeoFields(vendor),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

/** After a vendor edits name, tags or location, push the copies down to their products. */
export async function syncVendorToProducts(vendor: Vendor): Promise<number> {
  const snap = await getDocs(query(refs.products(), where('vendorId', '==', vendor.id)))
  if (snap.empty) return 0
  const fields = vendorGeoFields(vendor)
  const batch = writeBatch(db)
  for (const d of snap.docs) batch.update(d.ref, fields)
  await batch.commit()
  return snap.size
}

export async function updateProduct(productId: string, input: Partial<ProductInput>) {
  await updateDoc(refs.product(productId), { ...input, updatedAt: serverTimestamp() })
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

export const FEED_PAGE = 20

/** Newest-first page of in-stock products, no location filter (fallback when no area is set). */
export async function fetchFeedPage(cursor: QueryDocumentSnapshot<DocumentData> | null) {
  const base = [
    where('availability', 'in', ['in_stock', 'low']),
    orderBy('createdAt', 'desc'),
    limit(FEED_PAGE),
  ] as const
  const q = cursor
    ? query(refs.products(), ...base, startAfter(cursor))
    : query(refs.products(), ...base)
  const snap = await getDocs(q)
  return {
    products: snap.docs.map((d) => fromQuerySnap<Product>(d)),
    cursor: snap.docs.length ? snap.docs[snap.docs.length - 1]! : null,
    done: snap.docs.length < FEED_PAGE,
  }
}

const LOCAL_PAGE = 80

/**
 * Every product whose geohash falls inside the bounding cells for the radius.
 * Callers still filter by exact distance (the cells over-cover) and availability.
 */
export async function fetchLocalProducts(center: LatLng, radiusKm: number): Promise<Product[]> {
  const bounds = geohashBounds(center, radiusKm)
  const snaps = await Promise.all(
    bounds.map(([start, end]) => getDocs(query(refs.products(), orderBy('geohash'), startAt(start), endAt(end), limit(LOCAL_PAGE)))),
  )
  const out = new Map<string, Product>()
  for (const snap of snaps) for (const d of snap.docs) out.set(d.id, fromQuerySnap<Product>(d))
  return [...out.values()]
}

// ---------- swipes & matches ----------

export async function loadSwipedIds(uid: string): Promise<Set<string>> {
  const snap = await getDocs(refs.swipes(uid))
  return new Set(snap.docs.map((d) => d.id))
}

export async function recordSwipe(
  buyer: UserProfile,
  product: Product,
  direction: 'left' | 'right',
): Promise<{ clientTs: number; matchId: string | null }> {
  const clientTs = Date.now()
  const batch = writeBatch(db)
  batch.set(refs.swipe(buyer.uid, product.id), {
    direction,
    clientTs,
    createdAt: serverTimestamp(),
  })
  let matchId: string | null = null
  if (direction === 'right') {
    matchId = matchIdFor(buyer.uid, product.id)
    batch.set(refs.match(matchId), {
      buyerUid: buyer.uid,
      buyerName: buyer.displayName,
      vendorId: product.vendorId,
      vendorName: product.vendorName,
      productId: product.id,
      productTitle: product.title,
      productImage: product.imageUrls[0] ?? null,
      productAvailability: product.availability,
      createdAt: serverTimestamp(),
      swipeClientTs: clientTs,
      lastMessageAt: serverTimestamp(),
      lastMessageText: '',
      lastMessageSender: null,
      unread: { [buyer.uid]: 0, [product.vendorId]: 0 },
    })
  }
  await batch.commit()
  return { clientTs, matchId }
}

export function listenMatches(uid: string, role: Role, cb: (m: Match[]) => void, onError?: (e: Error) => void): Unsubscribe {
  const field = role === 'vendor' ? 'vendorId' : 'buyerUid'
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
    (snap) =>
      cb(
        snap.docs.map((d) => ({
          ...fromQuerySnap<Message>(d),
          pending: d.metadata.hasPendingWrites,
        })),
      ),
    (e) => onError?.(e),
  )
}

export async function sendMessage(match: Match, senderUid: string, body: string) {
  const other = senderUid === match.buyerUid ? match.vendorId : match.buyerUid
  const clientTs = Date.now()
  const batch = writeBatch(db)
  batch.set(doc(refs.messages(match.id)), {
    senderUid,
    body,
    clientTs,
    createdAt: serverTimestamp(),
  })
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
  const label: Record<Availability, string> = {
    in_stock: 'is back in stock',
    low: 'is almost sold out',
    out_of_stock: 'is out of stock',
  }
  const batch = writeBatch(db)
  for (const d of snap.docs) {
    const m = fromQuerySnap<Match>(d)
    batch.update(refs.match(m.id), { productAvailability: availability })
    batch.set(doc(refs.notifications(m.buyerUid)), {
      type: 'availability',
      matchId: m.id,
      productId: product.id,
      title: product.title,
      body: `${product.title} from ${product.vendorName} ${label[availability]}.`,
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

export async function upsertReview(
  buyer: UserProfile,
  product: Pick<Product, 'id' | 'vendorId' | 'title'>,
  rating: number,
  body: string,
) {
  const id = reviewIdFor(buyer.uid, product.id)
  const existing = await getDoc(refs.review(id))
  if (existing.exists()) {
    await updateDoc(refs.review(id), { rating, body })
  } else {
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
}

export async function getReview(buyerUid: string, productId: string): Promise<Review | null> {
  return fromSnap<Review>(await getDoc(refs.review(reviewIdFor(buyerUid, productId))))
}

export function listenReviews(
  by: { productId: string } | { vendorId: string },
  cb: (r: Review[]) => void,
  onError?: (e: Error) => void,
): Unsubscribe {
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
