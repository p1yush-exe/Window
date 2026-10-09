/**
 * End-to-end through src/lib/db.ts on the Auth + Firestore emulators:
 * seller sets up shop → lists a product (spends an upload) → shopper likes (pending) →
 * seller accepts → chat → super swipe matches instantly → auto-matcher → availability → review.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import {
  acceptLike, createProduct, createProfile, createShop, createVendor, fetchLocalProducts, getMatch, getProduct, getProfile, getReview, getShop, getVendor,
  listenMessages, listenNotifications, listenVendorLikes, loadSwipedIds, markMatchRead, purchase, recordLike, recordPass, sendMessage, setAvailability, upsertReview,
} from '@/lib/db'
import { likeIdFor, type AppNotification, type Like, type Message, type Product, type Shop, type UserProfile, type Vendor } from '@/lib/types'

const run = Date.now().toString(36)
const PASSWORD = 'window123'
const vendorEmail = `e2e-vendor-${run}@window.demo`
const buyerEmail = `e2e-buyer-${run}@window.demo`
let vendorUid = ''
let buyerUid = ''
let vendor: Vendor
let shop: Shop
let buyer: UserProfile
let product: Product
let superProduct: Product

async function as(email: string) {
  await signOut(auth)
  return (await signInWithEmailAndPassword(auth, email, PASSWORD)).user.uid
}
function waitFor<T>(subscribe: (cb: (v: T) => void) => () => void, predicate: (v: T) => boolean, ms = 8000): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { unsub(); reject(new Error('timed out waiting for snapshot')) }, ms)
    const unsub = subscribe((v) => { if (predicate(v)) { clearTimeout(timer); unsub(); resolve(v) } })
  })
}
const refreshBuyer = async () => { buyer = (await getProfile(buyerUid))! }

beforeAll(async () => {
  vendorUid = (await createUserWithEmailAndPassword(auth, vendorEmail, PASSWORD)).user.uid
  await createProfile(vendorUid, 'vendor', 'E2E Vendor')
  await createVendor(vendorUid, { ownerName: 'E2E Vendor', ownerEmail: vendorEmail, ownerPhone: '9999999999', phoneVerified: true, emailVerified: true })
  const shopId = await createShop(vendorUid, { name: 'E2E Store', description: 't', tags: ['clothing', 'hand-made'], website: null, storefrontUrl: null, logoUrl: null, location: { lat: 30.34, lng: 76.39, address: 'Patiala', area: 'Patiala' }, autoMessage: 'Welcome to E2E Store!' })
  vendor = (await getVendor(vendorUid))!
  shop = (await getShop(shopId))!
  await signOut(auth)
  buyerUid = (await createUserWithEmailAndPassword(auth, buyerEmail, PASSWORD)).user.uid
  await createProfile(buyerUid, 'buyer', 'E2E Buyer', { location: { lat: 30.35, lng: 76.4, address: 'Near' }, interests: ['clothing'] })
  await refreshBuyer()
})
afterAll(async () => { await signOut(auth) })

describe('Window end-to-end', () => {
  it('seller lists two products; uploads are spent from the free token', async () => {
    await as(vendorEmail)
    expect(vendor.tokens).toBe(1)
    const base = { description: 'd', tags: ['kurta', 'clothing'], priceMin: 800, priceMax: 1200, currency: 'INR', imageUrls: ['https://example.com/a.jpg'], availability: 'in_stock' as const, paymentModes: ['upi', 'cash'] as const, superOnly: false }
    const r1 = await createProduct(vendor, shop, { ...base, title: `E2E Kurta ${run}`, paymentModes: ['upi', 'cash'] })
    expect(r1.productCode).toMatch(/^WN-/)
    vendor = (await getVendor(vendorUid))!
    expect(vendor.tokens).toBe(0)
    expect(vendor.uploadsRemaining).toBe(9)
    const r2 = await createProduct(vendor, shop, { ...base, title: `E2E Rare ${run}`, superOnly: true, paymentModes: ['upi'] })
    vendor = (await getVendor(vendorUid))!
    expect(vendor.uploadsRemaining).toBe(8)
    product = (await getProduct(r1.id))!
    superProduct = (await getProduct(r2.id))!
    expect(product.shopName).toBe('E2E Store')
    expect(product.geohash).toBeTruthy()
    expect(product.vendorTags).toEqual(['clothing', 'hand-made'])
  })

  it('shopper sees it nearby; a left swipe is free; a right swipe is a pending like', async () => {
    await as(buyerEmail)
    const near = await fetchLocalProducts({ lat: 30.35, lng: 76.4 }, 10)
    expect(near.some((p) => p.id === product.id)).toBe(true)
    expect((await fetchLocalProducts({ lat: 31.6, lng: 74.9 }, 10)).some((p) => p.id === product.id)).toBe(false)
    await recordPass(buyer, superProduct)
    await refreshBuyer()
    expect(buyer.swipes).toBe(5)
    const outcome = await recordLike(buyer, product, 'swipe')
    expect(outcome.kind).toBe('pending')
    await refreshBuyer()
    expect(buyer.swipes).toBe(4)
    expect((await loadSwipedIds(buyerUid)).has(product.id)).toBe(true)
    expect(await getMatch(likeIdFor(buyerUid, product.id))).toBeNull()
  })

  it('a plain swipe on a super-only product is refused', async () => {
    await expect(recordLike(buyer, superProduct, 'swipe')).rejects.toThrow(/super/)
  })

  it('seller sees the like, accepts it, and the chat opens with the auto message', async () => {
    await as(vendorEmail)
    const likes = await waitFor<Like[]>((cb) => listenVendorLikes(vendorUid, cb), (ls) => ls.some((l) => l.productId === product.id))
    const like = likes.find((l) => l.productId === product.id)!
    expect(like.status).toBe('pending')
    const matchId = await acceptLike(like, vendor)
    const match = (await getMatch(matchId))!
    expect(match.autoMessage).toBe('Welcome to E2E Store!')
    expect(match.unread[buyerUid]).toBe(1)
    await sendMessage(match, vendorUid, 'Yes! M and L in stock.')
    await as(buyerEmail)
    const notes = await waitFor<AppNotification[]>((cb) => listenNotifications(buyerUid, cb), (n) => n.some((x) => x.type === 'match'))
    expect(notes[0]!.type).toBe('match')
    const msgs = await waitFor<Message[]>((cb) => listenMessages(matchId, cb), (m) => m.length >= 1)
    expect(msgs[0]!.senderUid).toBe(vendorUid)
    await markMatchRead(matchId, buyerUid)
    await sendMessage((await getMatch(matchId))!, buyerUid, 'Great, M please')
  })

  it('a super swipe claims a super-only product instantly and spends a super swipe', async () => {
    await purchase(buyerUid, 'superSwipes', 5, 350)
    await refreshBuyer()
    expect(buyer.superSwipes).toBe(5)
    const outcome = await recordLike(buyer, superProduct, 'super')
    expect(outcome.kind).toBe('matched')
    await refreshBuyer()
    expect(buyer.superSwipes).toBe(4)
    expect((await getMatch(likeIdFor(buyerUid, superProduct.id)))!.likeType).toBe('super')
    // The product is now reserved for this buyer and gone from other shoppers' feeds
    const claimed = (await getProduct(superProduct.id))!
    expect(claimed.claimedBy).toBe(buyerUid)
    await as(vendorEmail)
    const notes = await waitFor<AppNotification[]>((cb) => listenNotifications(vendorUid, cb), (n) => n.some((x) => x.type === 'superswipe'))
    expect(notes.find((x) => x.type === 'superswipe')!.productId).toBe(superProduct.id)
    await as(buyerEmail)
    await refreshBuyer()
  })

  it('auto-matcher makes plain swipes match instantly', async () => {
    await as(vendorEmail)
    await purchase(vendorUid, 'autoMatch', 1, 99.99, { shopId: shop.id })
    const third = await createProduct((await getVendor(vendorUid))!, (await getShop(shop.id))!, { title: `E2E Auto ${run}`, description: '', tags: ['shirt'], priceMin: null, priceMax: null, currency: 'INR', imageUrls: [], availability: 'in_stock', paymentModes: ['cash'], superOnly: false })
    await as(buyerEmail)
    await refreshBuyer()
    const outcome = await recordLike(buyer, (await getProduct(third.id))!, 'swipe')
    expect(outcome.kind).toBe('matched')
  })

  it('availability change fans out to matched buyers; review needs a match', async () => {
    await as(vendorEmail)
    expect(await setAvailability(product, 'low')).toBeGreaterThanOrEqual(1)
    await as(buyerEmail)
    await refreshBuyer()
    await upsertReview(buyer, product, 4, 'Good fabric')
    expect((await getReview(buyerUid, product.id))!.rating).toBe(4)
  })

  it('a stranger cannot read the chat', async () => {
    await signOut(auth)
    const strangerUid = (await createUserWithEmailAndPassword(auth, `e2e-x-${run}@window.demo`, PASSWORD)).user.uid
    await createProfile(strangerUid, 'buyer', 'Stranger')
    await expect(getMatch(likeIdFor(buyerUid, product.id))).rejects.toThrow()
  })
})
