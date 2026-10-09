/**
 * End-to-end flow through the real data layer (src/lib/db.ts) against the
 * Auth + Firestore emulators:  vendor lists product → buyer swipes →
 * match → chat both ways → availability fan-out → review.
 *
 * Run with: pnpm test:e2e   (starts the emulators itself)
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  createProduct,
  createProfile,
  createVendor,
  fetchFeedPage,
  fetchLocalProducts,
  getMatch,
  getProduct,
  getReview,
  getVendor,
  listenMessages,
  listenNotifications,
  loadSwipedIds,
  markMatchRead,
  recordSwipe,
  sendMessage,
  setAvailability,
  upsertReview,
} from '@/lib/db'
import { matchIdFor, type AppNotification, type Match, type Message, type Product, type UserProfile, type Vendor } from '@/lib/types'

const run = Date.now().toString(36)
const PASSWORD = 'window123'
const vendorEmail = `e2e-vendor-${run}@window.demo`
const buyerEmail = `e2e-buyer-${run}@window.demo`

let vendorUid = ''
let buyerUid = ''
let vendor: Vendor
let buyer: UserProfile
let product: Product
let match: Match

async function as(email: string) {
  await signOut(auth)
  const cred = await signInWithEmailAndPassword(auth, email, PASSWORD)
  return cred.user.uid
}

function waitFor<T>(subscribe: (cb: (v: T) => void) => () => void, predicate: (v: T) => boolean, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsub()
      reject(new Error('timed out waiting for snapshot'))
    }, ms)
    const unsub = subscribe((v) => {
      if (predicate(v)) {
        clearTimeout(timer)
        unsub()
        resolve(v)
      }
    })
  })
}

beforeAll(async () => {
  vendorUid = (await createUserWithEmailAndPassword(auth, vendorEmail, PASSWORD)).user.uid
  await createProfile(vendorUid, 'vendor', 'E2E Vendor')
  await createVendor(vendorUid, {
    name: 'E2E Store',
    description: 'test',
    tags: ['Clothes', 'Handmade'],
    location: { lat: 30.34, lng: 76.39, address: 'Patiala' },
    ownerName: 'E2E Owner',
    ownerPhone: '9999999999',
    ownerEmail: vendorEmail,
    phoneVerified: true,
    emailVerified: true,
  })
  vendor = (await getVendor(vendorUid))!
  expect(vendor.tags).toEqual(['Clothes', 'Handmade'])
  expect(vendor.location?.address).toBe('Patiala')
  await signOut(auth)
  buyerUid = (await createUserWithEmailAndPassword(auth, buyerEmail, PASSWORD)).user.uid
  await createProfile(buyerUid, 'buyer', 'E2E Buyer')
  buyer = { uid: buyerUid, role: 'buyer', displayName: 'E2E Buyer', avatarUrl: null, createdAt: null }
})

afterAll(async () => {
  await signOut(auth)
})

describe('Window end-to-end', () => {
  it('vendor lists a product', async () => {
    await as(vendorEmail)
    const id = await createProduct(vendor, {
      title: `E2E Kurta ${run}`,
      description: 'd',
      price: null,
      currency: 'INR',
      category: 'Clothes',
      imageUrls: ['https://example.com/a.jpg'],
      availability: 'in_stock',
    })
    product = (await getProduct(id))!
    expect(product.vendorName).toBe('E2E Store')
  })

  it('buyer sees it in the feed and swipes right → match', async () => {
    await as(buyerEmail)
    const page = await fetchFeedPage(null)
    expect(page.products.some((p) => p.id === product.id)).toBe(true)
    // Product inherited the store's location and tags
    expect(product.geohash).toBeTruthy()
    expect(product.vendorTags).toEqual(['Clothes', 'Handmade'])
    expect(product.area).toBe('Patiala')
    // Visible from 2 km away, not from 150 km away
    const near = await fetchLocalProducts({ lat: 30.35, lng: 76.4 }, 10)
    expect(near.some((p) => p.id === product.id)).toBe(true)
    const far = await fetchLocalProducts({ lat: 31.6, lng: 74.9 }, 10) // Amritsar
    expect(far.some((p) => p.id === product.id)).toBe(false)
    expect((await loadSwipedIds(buyerUid)).size).toBe(0)

    const t0 = performance.now()
    const { matchId } = await recordSwipe(buyer, product, 'right')
    const latency = performance.now() - t0
    expect(matchId).toBe(matchIdFor(buyerUid, product.id))
    expect(latency).toBeLessThan(2000)

    match = (await getMatch(matchId!))!
    expect(match.vendorId).toBe(vendorUid)
    expect(match.productTitle).toBe(product.title)
    expect((await loadSwipedIds(buyerUid)).has(product.id)).toBe(true)
  })

  it('left swipes do not create matches', async () => {
    const other = { ...product, id: 'nonexistent-' + run }
    const { matchId } = await recordSwipe(buyer, other, 'left')
    expect(matchId).toBeNull()
  })

  it('buyer and vendor chat in real time; unread counters move', async () => {
    await sendMessage(match, buyerUid, 'Hi, is this available in M?')
    match = (await getMatch(match.id))!
    expect(match.unread[vendorUid]).toBe(1)
    expect(match.lastMessageText).toMatch(/available in M/)

    await as(vendorEmail)
    const msgs = await waitFor<Message[]>((cb) => listenMessages(match.id, cb), (m) => m.length >= 1)
    expect(msgs[0]!.senderUid).toBe(buyerUid)
    await markMatchRead(match.id, vendorUid)
    await sendMessage(match, vendorUid, 'Yes! M and L in stock.')
    match = (await getMatch(match.id))!
    expect(match.unread[vendorUid]).toBe(0)
    expect(match.unread[buyerUid]).toBe(1)
  })

  it('vendor availability change fans out to the matched buyer', async () => {
    const notified = await setAvailability(product, 'low')
    expect(notified).toBe(1)
    expect((await getMatch(match.id))!.productAvailability).toBe('low')

    await as(buyerEmail)
    const notes = await waitFor<AppNotification[]>((cb) => listenNotifications(buyerUid, cb), (n) => n.length >= 1)
    expect(notes[0]!.type).toBe('availability')
    expect(notes[0]!.body).toMatch(/almost sold out/)
    expect(notes[0]!.matchId).toBe(match.id)
  })

  it('buyer leaves and edits a review', async () => {
    await upsertReview(buyer, product, 4, 'Good fabric')
    expect((await getReview(buyerUid, product.id))!.rating).toBe(4)
    await upsertReview(buyer, product, 5, 'Great fabric')
    expect((await getReview(buyerUid, product.id))!.rating).toBe(5)
  })

  it('a stranger cannot read the chat', async () => {
    await signOut(auth)
    const strangerUid = (await createUserWithEmailAndPassword(auth, `e2e-x-${run}@window.demo`, PASSWORD)).user.uid
    await createProfile(strangerUid, 'buyer', 'Stranger')
    await expect(getMatch(match.id)).rejects.toThrow()
  })
})
