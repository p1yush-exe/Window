import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'

const PROJECT = 'window-rules-test'
const BUYER = 'buyer1'
const VENDOR = 'vendor1'
const OTHER = 'other1'
const PRODUCT = 'prod1'
const MATCH = `${BUYER}_${PRODUCT}`

let env: RulesTestEnvironment

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT,
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})

afterAll(async () => {
  await env.cleanup()
})

beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', BUYER), { role: 'buyer', displayName: 'Buyer', avatarUrl: null })
    await setDoc(doc(db, 'users', VENDOR), { role: 'vendor', displayName: 'Vendor', avatarUrl: null })
    await setDoc(doc(db, 'users', OTHER), { role: 'buyer', displayName: 'Other', avatarUrl: null })
    await setDoc(doc(db, 'vendors', VENDOR), { ownerUid: VENDOR, name: 'Shop', description: '', logoUrl: null, verified: false })
    await setDoc(doc(db, 'products', PRODUCT), {
      vendorId: VENDOR,
      vendorName: 'Shop',
      title: 'Kurta',
      description: '',
      price: 999,
      currency: 'INR',
      category: 'Clothes',
      imageUrls: [],
      availability: 'in_stock',
    })
  })
})

const as = (uid: string | null) => (uid ? env.authenticatedContext(uid).firestore() : env.unauthenticatedContext().firestore())

const matchData = (overrides: Record<string, unknown> = {}) => ({
  buyerUid: BUYER,
  buyerName: 'Buyer',
  vendorId: VENDOR,
  vendorName: 'Shop',
  productId: PRODUCT,
  productTitle: 'Kurta',
  productImage: null,
  productAvailability: 'in_stock',
  createdAt: serverTimestamp(),
  swipeClientTs: Date.now(),
  lastMessageAt: serverTimestamp(),
  lastMessageText: '',
  lastMessageSender: null,
  unread: { [BUYER]: 0, [VENDOR]: 0 },
  ...overrides,
})

async function seedMatch() {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'matches', MATCH), matchData())
  })
}

describe('users', () => {
  it('a user can create their own profile with a valid role', async () => {
    await assertSucceeds(setDoc(doc(as('new1'), 'users', 'new1'), { role: 'buyer', displayName: 'N', avatarUrl: null }))
  })
  it('cannot create a profile for someone else or with a bad role', async () => {
    await assertFails(setDoc(doc(as('new1'), 'users', 'new2'), { role: 'buyer', displayName: 'N' }))
    await assertFails(setDoc(doc(as('new3'), 'users', 'new3'), { role: 'admin', displayName: 'N' }))
  })
  it('role is immutable', async () => {
    await assertFails(updateDoc(doc(as(BUYER), 'users', BUYER), { role: 'vendor' }))
    await assertSucceeds(updateDoc(doc(as(BUYER), 'users', BUYER), { displayName: 'Renamed' }))
  })
  it('swipes are private to the owner', async () => {
    await assertSucceeds(setDoc(doc(as(BUYER), 'users', BUYER, 'swipes', PRODUCT), { direction: 'left', clientTs: 1 }))
    await assertFails(setDoc(doc(as(OTHER), 'users', BUYER, 'swipes', 'x'), { direction: 'left', clientTs: 1 }))
    await assertFails(getDoc(doc(as(OTHER), 'users', BUYER, 'swipes', PRODUCT)))
  })
})

describe('products', () => {
  it('anyone can read products', async () => {
    await assertSucceeds(getDoc(doc(as(null), 'products', PRODUCT)))
  })
  it('only a vendor with a store can create products for themselves', async () => {
    await assertSucceeds(
      setDoc(doc(as(VENDOR), 'products', 'p2'), { vendorId: VENDOR, title: 'Shoes', availability: 'in_stock' }),
    )
    await assertFails(setDoc(doc(as(BUYER), 'products', 'p3'), { vendorId: BUYER, title: 'Nope', availability: 'in_stock' }))
    await assertFails(setDoc(doc(as(VENDOR), 'products', 'p4'), { vendorId: OTHER, title: 'Nope', availability: 'in_stock' }))
  })
  it('only the owner can update and availability must be valid', async () => {
    await assertSucceeds(updateDoc(doc(as(VENDOR), 'products', PRODUCT), { availability: 'low' }))
    await assertFails(updateDoc(doc(as(VENDOR), 'products', PRODUCT), { availability: 'gone' }))
    await assertFails(updateDoc(doc(as(BUYER), 'products', PRODUCT), { title: 'Hacked' }))
  })
})

describe('matches', () => {
  it('a buyer can create a match for themselves with the deterministic id', async () => {
    await assertSucceeds(setDoc(doc(as(BUYER), 'matches', MATCH), matchData()))
  })
  it('rejects wrong id, wrong vendor, or another buyer', async () => {
    await assertFails(setDoc(doc(as(BUYER), 'matches', 'random'), matchData()))
    await assertFails(setDoc(doc(as(BUYER), 'matches', MATCH), matchData({ vendorId: OTHER })))
    await assertFails(setDoc(doc(as(OTHER), 'matches', MATCH), matchData()))
  })
  it('only participants can read; immutable fields stay fixed', async () => {
    await seedMatch()
    await assertSucceeds(getDoc(doc(as(BUYER), 'matches', MATCH)))
    await assertSucceeds(getDoc(doc(as(VENDOR), 'matches', MATCH)))
    await assertFails(getDoc(doc(as(OTHER), 'matches', MATCH)))
    await assertSucceeds(updateDoc(doc(as(VENDOR), 'matches', MATCH), { productAvailability: 'low' }))
    await assertFails(updateDoc(doc(as(VENDOR), 'matches', MATCH), { buyerUid: OTHER }))
  })
  it('list queries scoped to the participant succeed', async () => {
    await seedMatch()
    await assertSucceeds(getDocs(query(collection(as(BUYER), 'matches'), where('buyerUid', '==', BUYER))))
    await assertSucceeds(getDocs(query(collection(as(VENDOR), 'matches'), where('vendorId', '==', VENDOR), where('productId', '==', PRODUCT))))
    await assertFails(getDocs(query(collection(as(OTHER), 'matches'), where('vendorId', '==', VENDOR))))
  })
})

describe('messages', () => {
  beforeEach(seedMatch)
  it('participants can send and read, outsiders cannot', async () => {
    await assertSucceeds(setDoc(doc(as(BUYER), 'matches', MATCH, 'messages', 'm1'), { senderUid: BUYER, body: 'hi', clientTs: 1, createdAt: serverTimestamp() }))
    await assertSucceeds(setDoc(doc(as(VENDOR), 'matches', MATCH, 'messages', 'm2'), { senderUid: VENDOR, body: 'hello', clientTs: 2, createdAt: serverTimestamp() }))
    await assertSucceeds(getDocs(collection(as(VENDOR), 'matches', MATCH, 'messages')))
    await assertFails(setDoc(doc(as(OTHER), 'matches', MATCH, 'messages', 'm3'), { senderUid: OTHER, body: 'spam', clientTs: 3, createdAt: serverTimestamp() }))
    await assertFails(getDocs(collection(as(OTHER), 'matches', MATCH, 'messages')))
  })
  it('cannot spoof the sender or send an empty body', async () => {
    await assertFails(setDoc(doc(as(BUYER), 'matches', MATCH, 'messages', 'm4'), { senderUid: VENDOR, body: 'x', clientTs: 1, createdAt: serverTimestamp() }))
    await assertFails(setDoc(doc(as(BUYER), 'matches', MATCH, 'messages', 'm5'), { senderUid: BUYER, body: '', clientTs: 1, createdAt: serverTimestamp() }))
  })
})

describe('notifications', () => {
  beforeEach(seedMatch)
  it('vendor can notify a matched buyer about availability, but nobody else', async () => {
    const payload = { type: 'availability', matchId: MATCH, productId: PRODUCT, title: 'Kurta', body: 'low', read: false, createdAt: serverTimestamp() }
    await assertSucceeds(setDoc(doc(as(VENDOR), 'users', BUYER, 'notifications', 'n1'), payload))
    await assertFails(setDoc(doc(as(VENDOR), 'users', OTHER, 'notifications', 'n2'), payload))
    await assertFails(setDoc(doc(as(OTHER), 'users', BUYER, 'notifications', 'n3'), payload))
    await assertFails(setDoc(doc(as(VENDOR), 'users', BUYER, 'notifications', 'n4'), { ...payload, type: 'system' }))
  })
  it('only the owner reads notifications', async () => {
    await assertSucceeds(getDocs(collection(as(BUYER), 'users', BUYER, 'notifications')))
    await assertFails(getDocs(collection(as(VENDOR), 'users', BUYER, 'notifications')))
  })
})

describe('reviews', () => {
  it('requires a match and a valid rating', async () => {
    const base = { buyerUid: BUYER, buyerName: 'Buyer', vendorId: VENDOR, productId: PRODUCT, productTitle: 'Kurta', body: 'nice', createdAt: serverTimestamp() }
    await assertFails(setDoc(doc(as(BUYER), 'reviews', MATCH), { ...base, rating: 5 }))
    await seedMatch()
    await assertFails(setDoc(doc(as(BUYER), 'reviews', MATCH), { ...base, rating: 6 }))
    await assertFails(setDoc(doc(as(BUYER), 'reviews', MATCH), { ...base, rating: 4, vendorId: OTHER }))
    await assertSucceeds(setDoc(doc(as(BUYER), 'reviews', MATCH), { ...base, rating: 4 }))
    await assertSucceeds(getDoc(doc(as(null), 'reviews', MATCH)))
    await assertFails(updateDoc(doc(as(VENDOR), 'reviews', MATCH), { rating: 5 }))
  })
})
