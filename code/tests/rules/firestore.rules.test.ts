import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, Timestamp, updateDoc, where, writeBatch } from 'firebase/firestore'

const PROJECT = 'window-rules-test'
const BUYER = 'buyer1'
const VENDOR = 'vendor1'
const OTHER = 'other1'
const SHOP = 'shop1'
const PRODUCT = 'prod1'
const LIKE = `${BUYER}_${PRODUCT}`

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: PROJECT, firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(async () => {
  await env.cleanup()
})

const user = (role: 'buyer' | 'vendor', name: string, hasShop = false) => ({ role, displayName: name, avatarUrl: null, swipes: 5, superSwipes: 2, lastDailyGrant: null, appBonusGranted: false, hasShop })

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', BUYER), user('buyer', 'Buyer'))
    await setDoc(doc(db, 'users', VENDOR), user('vendor', 'Vendor', true))
    await setDoc(doc(db, 'users', OTHER), user('buyer', 'Other'))
    await setDoc(doc(db, 'vendors', VENDOR), { ownerUid: VENDOR, ownerName: 'Vendor', ownerPhone: '', ownerEmail: 'v@x', phoneVerified: true, emailVerified: true, verified: false, tokens: 1, uploadsRemaining: 0, paymentIds: { upi: '', bank: '' }, primaryShopId: SHOP })
    await setDoc(doc(db, 'shops', SHOP), { ownerUid: VENDOR, name: 'Shop', description: '', tags: ['shoes'], website: null, storefrontUrl: null, logoUrl: null, location: null, autoMessage: '', autoMatchUntil: null, theme: { frame: 'none', badge: null }, decorations: [] })
    await setDoc(doc(db, 'products', PRODUCT), { productCode: 'WN-AAAAAA', vendorId: VENDOR, vendorName: 'Vendor', shopId: SHOP, shopName: 'Shop', title: 'Kurta', description: '', tags: ['kurta'], category: 'kurta', priceMin: 500, priceMax: 900, price: 500, currency: 'INR', imageUrls: [], availability: 'in_stock', paymentModes: ['upi'], superOnly: false, geohash: 'ttq8', vendorTags: ['shoes'] })
    await setDoc(doc(db, 'products', 'superonly'), { productCode: 'WN-BBBBBB', vendorId: VENDOR, vendorName: 'Vendor', shopId: SHOP, shopName: 'Shop', title: 'Rare', description: '', tags: ['art'], category: 'art', priceMin: null, priceMax: null, price: null, currency: 'INR', imageUrls: [], availability: 'in_stock', paymentModes: ['upi'], superOnly: true, geohash: 'ttq8', vendorTags: ['shoes'] })
  })
})

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore())

const likeData = (type: 'swipe' | 'super', status: 'pending' | 'accepted', productId = PRODUCT) => ({
  buyerUid: BUYER, buyerName: 'Buyer', vendorId: VENDOR, shopId: SHOP, productId, productTitle: 'Kurta', productImage: null, type, status, createdAt: serverTimestamp(), decidedAt: null,
})
const matchData = (productId = PRODUCT) => ({
  buyerUid: BUYER, buyerName: 'Buyer', vendorId: VENDOR, vendorName: 'Vendor', shopId: SHOP, shopName: 'Shop', productId, productTitle: 'Kurta', productImage: null, productAvailability: 'in_stock', likeType: 'swipe', autoMessage: null,
  createdAt: serverTimestamp(), swipeClientTs: 1, lastMessageAt: serverTimestamp(), lastMessageText: '', lastMessageSender: null, unread: { [BUYER]: 0, [VENDOR]: 0 },
})

async function seedAccepted() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'likes', LIKE), likeData('swipe', 'accepted'))
    await setDoc(doc(db, 'matches', LIKE), matchData())
  })
}

describe('users and balances', () => {
  it('creates own profile; balances must be non-negative ints', async () => {
    await assertSucceeds(setDoc(doc(as('new1'), 'users', 'new1'), user('buyer', 'N')))
    await assertFails(setDoc(doc(as('new2'), 'users', 'new2'), { ...user('buyer', 'N'), swipes: -1 }))
    await assertFails(setDoc(doc(as('new3'), 'users', 'new3'), { ...user('buyer', 'N'), role: 'admin' }))
  })
  it('role immutable, prefs limited', async () => {
    await assertFails(updateDoc(doc(as(BUYER), 'users', BUYER), { role: 'vendor' }))
    await assertSucceeds(updateDoc(doc(as(BUYER), 'users', BUYER), { interests: ['a', 'b'], hasShop: true }))
    await assertFails(updateDoc(doc(as(BUYER), 'users', BUYER), { interests: ['a', 'b', 'c', 'd'] }))
  })
})

describe('vendors and shops', () => {
  it('anyone with a vendor doc may create shops for themselves only', async () => {
    const shop = { ownerUid: VENDOR, name: 'Second', description: '', tags: ['art'], website: null, storefrontUrl: null, logoUrl: null, location: null, autoMessage: '', autoMatchUntil: null, theme: { frame: 'none', badge: null }, decorations: [] }
    await assertSucceeds(setDoc(doc(as(VENDOR), 'shops', 'shop2'), shop))
    await assertFails(setDoc(doc(as(VENDOR), 'shops', 'shop3'), { ...shop, ownerUid: OTHER }))
    await assertFails(setDoc(doc(as(BUYER), 'shops', 'shop4'), { ...shop, ownerUid: BUYER }))
    await assertFails(setDoc(doc(as(VENDOR), 'shops', 'shop5'), { ...shop, tags: ['a', 'b', 'c', 'd'] }))
  })
  it('verified flag cannot be set by the owner', async () => {
    await assertFails(updateDoc(doc(as(VENDOR), 'vendors', VENDOR), { verified: true }))
    await assertSucceeds(updateDoc(doc(as(VENDOR), 'vendors', VENDOR), { tokens: 5 }))
    await assertFails(updateDoc(doc(as(VENDOR), 'vendors', VENDOR), { tokens: -1 }))
  })
})

describe('products', () => {
  const base = { productCode: 'WN-CCCCCC', vendorId: VENDOR, vendorName: 'Vendor', shopId: SHOP, shopName: 'Shop', title: 'Shoes', description: '', tags: ['shoes'], category: 'shoes', priceMin: null, priceMax: null, price: null, currency: 'INR', imageUrls: [], availability: 'in_stock', paymentModes: ['cash'], superOnly: false, geohash: null, vendorTags: ['shoes'] }
  it('only the shop owner creates products in that shop', async () => {
    await assertSucceeds(setDoc(doc(as(VENDOR), 'products', 'p2'), base))
    await assertFails(setDoc(doc(as(BUYER), 'products', 'p3'), { ...base, vendorId: BUYER }))
    await assertFails(setDoc(doc(as(VENDOR), 'products', 'p4'), { ...base, tags: ['a', 'b', 'c', 'd'] }))
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), 'shops', 'foreign'), { ownerUid: OTHER, name: 'F', tags: [], autoMessage: '' }))
    await assertFails(setDoc(doc(as(VENDOR), 'products', 'p5'), { ...base, shopId: 'foreign' }))
  })
  it('anyone can read; only owner updates', async () => {
    await assertSucceeds(getDoc(doc(as(null), 'products', PRODUCT)))
    await assertFails(updateDoc(doc(as(BUYER), 'products', PRODUCT), { title: 'Hacked' }))
    await assertSucceeds(updateDoc(doc(as(VENDOR), 'products', PRODUCT), { availability: 'low' }))
  })
})

describe('likes and matches', () => {
  it('a plain right swipe is a pending like, no match', async () => {
    await assertSucceeds(setDoc(doc(as(BUYER), 'likes', LIKE), likeData('swipe', 'pending')))
    await assertFails(setDoc(doc(as(BUYER), 'matches', LIKE), matchData()))
  })
  it('a plain swipe cannot start accepted, and cannot target super-only products', async () => {
    await assertFails(setDoc(doc(as(BUYER), 'likes', LIKE), likeData('swipe', 'accepted')))
    await assertFails(setDoc(doc(as(BUYER), 'likes', `${BUYER}_superonly`), likeData('swipe', 'pending', 'superonly')))
  })
  it('a super swipe creates like + match in one batch', async () => {
    const db = as(BUYER)
    const batch = writeBatch(db)
    batch.set(doc(db, 'likes', LIKE), likeData('super', 'accepted'))
    batch.set(doc(db, 'matches', LIKE), { ...matchData(), likeType: 'super' })
    await assertSucceeds(batch.commit())
  })
  it('auto-matching shop lets a plain swipe match instantly', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => updateDoc(doc(ctx.firestore(), 'shops', SHOP), { autoMatchUntil: Timestamp.fromMillis(Date.now() + 3600_000) }))
    const db = as(BUYER)
    const batch = writeBatch(db)
    batch.set(doc(db, 'likes', LIKE), likeData('swipe', 'accepted'))
    batch.set(doc(db, 'matches', LIKE), matchData())
    await assertSucceeds(batch.commit())
  })
  it('vendor accepts a pending like by creating the match; others cannot', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), 'likes', LIKE), likeData('swipe', 'pending')))
    const other = as(OTHER)
    await assertFails(updateDoc(doc(other, 'likes', LIKE), { status: 'accepted' }))
    const db = as(VENDOR)
    const batch = writeBatch(db)
    batch.update(doc(db, 'likes', LIKE), { status: 'accepted', decidedAt: serverTimestamp() })
    batch.set(doc(db, 'matches', LIKE), matchData())
    await assertSucceeds(batch.commit())
  })
  it('buyer cannot flip their own plain like to accepted, but may upgrade it to a super swipe with a match', async () => {
    await env.withSecurityRulesDisabled(async (ctx) => setDoc(doc(ctx.firestore(), 'likes', LIKE), likeData('swipe', 'pending')))
    await assertFails(updateDoc(doc(as(BUYER), 'likes', LIKE), { status: 'accepted' }))
    await assertFails(updateDoc(doc(as(OTHER), 'likes', LIKE), { type: 'super', status: 'accepted' }))
    const db = as(BUYER)
    const batch = writeBatch(db)
    batch.update(doc(db, 'likes', LIKE), { type: 'super', status: 'accepted', decidedAt: serverTimestamp() })
    batch.set(doc(db, 'matches', LIKE), { ...matchData(), likeType: 'super' })
    await assertSucceeds(batch.commit())
  })
  it('only participants read matches and likes', async () => {
    await seedAccepted()
    await assertSucceeds(getDoc(doc(as(BUYER), 'matches', LIKE)))
    await assertSucceeds(getDoc(doc(as(VENDOR), 'likes', LIKE)))
    await assertFails(getDoc(doc(as(OTHER), 'matches', LIKE)))
    await assertSucceeds(getDocs(query(collection(as(VENDOR), 'likes'), where('vendorId', '==', VENDOR))))
    await assertFails(getDocs(query(collection(as(OTHER), 'likes'), where('vendorId', '==', VENDOR))))
  })
})

describe('messages', () => {
  beforeEach(seedAccepted)
  it('participants chat; outsiders cannot; sender cannot be spoofed', async () => {
    await assertSucceeds(setDoc(doc(as(BUYER), 'matches', LIKE, 'messages', 'm1'), { senderUid: BUYER, body: 'hi', clientTs: 1, createdAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(as(VENDOR), 'matches', LIKE, 'messages', 'm2'), { senderUid: VENDOR, body: 'hello', clientTs: 2, createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as(OTHER), 'matches', LIKE, 'messages', 'm3'), { senderUid: OTHER, body: 'spam', clientTs: 3, createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as(BUYER), 'matches', LIKE, 'messages', 'm4'), { senderUid: VENDOR, body: 'x', clientTs: 1, createdAt: serverTimestamp() }))
  })
})

describe('purchases and notifications', () => {
  it('purchases are recorded for self only', async () => {
    await assertSucceeds(setDoc(doc(as(BUYER), 'purchases', 'x1'), { uid: BUYER, kind: 'swipes', qty: 10, amount: 350, createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as(BUYER), 'purchases', 'x2'), { uid: OTHER, kind: 'swipes', qty: 10, amount: 350, createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as(BUYER), 'purchases', 'x3'), { uid: BUYER, kind: 'gold', qty: 10, amount: 350, createdAt: serverTimestamp() }))
  })
  it('vendor may notify a matched buyer, nobody else', async () => {
    await seedAccepted()
    const payload = { type: 'availability', matchId: LIKE, productId: PRODUCT, title: 'Kurta', body: 'low', read: false, createdAt: serverTimestamp() }
    await assertSucceeds(setDoc(doc(as(VENDOR), 'users', BUYER, 'notifications', 'n1'), payload))
    await assertFails(setDoc(doc(as(VENDOR), 'users', OTHER, 'notifications', 'n2'), payload))
    await assertFails(setDoc(doc(as(OTHER), 'users', BUYER, 'notifications', 'n3'), payload))
  })
})

describe('reviews', () => {
  it('require a match and a valid rating', async () => {
    const base = { buyerUid: BUYER, buyerName: 'Buyer', vendorId: VENDOR, productId: PRODUCT, productTitle: 'Kurta', body: 'nice', createdAt: serverTimestamp() }
    await assertFails(setDoc(doc(as(BUYER), 'reviews', LIKE), { ...base, rating: 5 }))
    await seedAccepted()
    await assertFails(setDoc(doc(as(BUYER), 'reviews', LIKE), { ...base, rating: 6 }))
    await assertSucceeds(setDoc(doc(as(BUYER), 'reviews', LIKE), { ...base, rating: 4 }))
    await assertFails(updateDoc(doc(as(VENDOR), 'reviews', LIKE), { rating: 5 }))
  })
})
