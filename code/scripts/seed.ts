/**
 * Seeds demo sellers (owner + shop), products and a demo shopper.
 *   pnpm seed:emu  -> local emulators (.env.emulator)
 *   pnpm seed      -> hosted project (.env)
 * Runs with the web SDK as each seller so security rules are exercised.
 * Safe to re-run: accounts are reused, shops and products are keyed by slug.
 */
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'
import { geohashForLocation } from 'geofire-common'

const env = (k: string, fallback = '') => process.env[k] ?? fallback
const app = initializeApp({ apiKey: env('VITE_FIREBASE_API_KEY', 'demo-key'), authDomain: env('VITE_FIREBASE_AUTH_DOMAIN', 'localhost'), projectId: env('VITE_FIREBASE_PROJECT_ID', 'window-dev'), appId: env('VITE_FIREBASE_APP_ID', 'demo') })
const auth = getAuth(app)
const db = getFirestore(app)
if (env('VITE_USE_EMULATOR') === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const DEMO_PASSWORD = 'window123'

type Avail = 'in_stock' | 'low' | 'out_of_stock'
interface SeedProduct { slug: string; title: string; description: string; priceMin: number | null; priceMax: number | null; category: string; tags: string[]; paymentModes: string[]; superOnly: boolean; query: string[]; availability?: Avail }
interface SeedVendor { email: string; owner: string; name: string; description: string; tags: string[]; website: string | null; location: { lat: number; lng: number; address: string }; ownerPhone: string; autoMessage: string; products: SeedProduct[] }

const here = path.dirname(fileURLToPath(import.meta.url))
const { vendors } = JSON.parse(readFileSync(path.join(here, 'catalog.json'), 'utf8')) as { vendors: SeedVendor[] }
const imagesPath = path.join(here, 'seed-images.json')
const images: Record<string, string[]> = existsSync(imagesPath) ? JSON.parse(readFileSync(imagesPath, 'utf8')) : {}
const placeholder = (label: string) => `https://placehold.co/640x854/1c1d15/ebfc72/png?text=${encodeURIComponent(label.slice(0, 40))}&font=jetbrains-mono`
const imageUrls = (p: SeedProduct) => (images[p.slug]?.length ? images[p.slug]! : [placeholder(p.title)])
const code = (slug: string) => 'WN-' + slug.toUpperCase().replace(/[^A-Z0-9]/g, '').padEnd(6, 'X').slice(0, 6)

async function signInOrCreate(email: string) {
  try {
    return (await signInWithEmailAndPassword(auth, email, DEMO_PASSWORD)).user
  } catch {
    return (await createUserWithEmailAndPassword(auth, email, DEMO_PASSWORD)).user
  }
}

async function seedVendor(v: SeedVendor, vendorIndex: number) {
  const user = await signInOrCreate(v.email)
  const uid = user.uid
  const shopId = `shop-${uid.slice(0, 8)}`
  if (!(await getDoc(doc(db, 'users', uid))).exists()) {
    await setDoc(doc(db, 'users', uid), { role: 'vendor', displayName: v.owner, username: v.owner.toLowerCase().replace(/[^a-z0-9]/g, ''), email: v.email, phone: v.ownerPhone, avatarUrl: null, location: null, interests: [], swipes: 5, superSwipes: 2, lastDailyGrant: null, appBonusGranted: false, hasShop: true, createdAt: serverTimestamp() })
  } else {
    const cur = (await getDoc(doc(db, 'users', uid))).data() ?? {}
    await setDoc(doc(db, 'users', uid), { hasShop: true, swipes: cur.swipes ?? 5, superSwipes: cur.superSwipes ?? 2, lastDailyGrant: cur.lastDailyGrant ?? null, appBonusGranted: cur.appBonusGranted ?? false }, { merge: true })
  }
  const existingVendor = await getDoc(doc(db, 'vendors', uid))
  await setDoc(
    doc(db, 'vendors', uid),
    {
      ownerUid: uid, ownerName: v.owner, ownerPhone: v.ownerPhone, ownerEmail: v.email, phoneVerified: true, emailVerified: true,
      verified: existingVendor.exists() ? (existingVendor.data()!.verified ?? false) : false,
      tokens: existingVendor.exists() ? (existingVendor.data()!.tokens ?? 3) : 3,
      uploadsRemaining: existingVendor.exists() ? (existingVendor.data()!.uploadsRemaining ?? 0) : 0,
      paymentIds: { upi: `${v.owner.split(' ')[0]!.toLowerCase()}@upi`, bank: '' }, primaryShopId: shopId, createdAt: serverTimestamp(),
    },
    { merge: true },
  )
  const storefront = (images[v.products[0]!.slug] ?? [])[0] ?? placeholder(v.name)
  const area = v.location.address.split(',')[0]!.trim()
  const existingShop = await getDoc(doc(db, 'shops', shopId))
  await setDoc(
    doc(db, 'shops', shopId),
    {
      ownerUid: uid, name: v.name, description: v.description, tags: v.tags, website: v.website, storefrontUrl: storefront, logoUrl: null,
      location: { ...v.location, area }, autoMessage: v.autoMessage,
      autoMatchUntil: existingShop.exists() ? (existingShop.data()!.autoMatchUntil ?? null) : null,
      theme: existingShop.exists() ? (existingShop.data()!.theme ?? { frame: 'none', badge: null }) : { frame: 'none', badge: null },
      decorations: existingShop.exists() ? (existingShop.data()!.decorations ?? []) : [],
      createdAt: serverTimestamp(),
    },
    { merge: true },
  )
  const batch = writeBatch(db)
  v.products.forEach((p, i) => {
    const id = `${uid.slice(0, 6)}-${p.slug}`
    const lat = v.location.lat + Math.sin(i * 1.7) * 0.003
    const lng = v.location.lng + Math.cos(i * 1.3) * 0.003
    batch.set(doc(db, 'products', id), {
      productCode: code(p.slug), vendorId: uid, vendorName: v.owner, shopId, shopName: v.name,
      title: p.title, description: p.description, tags: p.tags, category: p.tags[0] ?? 'other',
      priceMin: p.priceMin, priceMax: p.priceMax, price: p.priceMin, currency: 'INR', imageUrls: imageUrls(p),
      availability: p.availability ?? 'in_stock', paymentModes: p.paymentModes, superOnly: p.superOnly,
      lat, lng, geohash: geohashForLocation([lat, lng]), area, vendorTags: v.tags,
      createdAt: new Date(Date.now() - (i * 4 + vendorIndex) * 3_600_000), updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
  console.log(`✔ ${v.name} (${v.email}): ${v.products.length} products`)
  await signOut(auth)
}

async function seedBuyer() {
  const user = await signInOrCreate('buyer@window.demo')
  if (!(await getDoc(doc(db, 'users', user.uid))).exists()) {
    await setDoc(doc(db, 'users', user.uid), {
      role: 'buyer', displayName: 'Demo Shopper', username: 'demoshopper', email: 'buyer@window.demo', phone: '9876500000', avatarUrl: null,
      location: { lat: 30.3398, lng: 76.3869, address: 'Thapar Institute, Patiala, Punjab', area: 'Thapar Institute' },
      interests: ['clothing', 'shoes', 'interior'], swipes: 5, superSwipes: 2, lastDailyGrant: null, appBonusGranted: false, hasShop: false, createdAt: serverTimestamp(),
    })
  }
  console.log('✔ buyer@window.demo')
  await signOut(auth)
}

async function main() {
  console.log(`Seeding project ${env('VITE_FIREBASE_PROJECT_ID')} ${env('VITE_USE_EMULATOR') === 'true' ? '(emulator)' : '(hosted)'}`)
  for (let i = 0; i < vendors.length; i++) await seedVendor(vendors[i]!, i)
  await seedBuyer()
  console.log(`\nDemo accounts (password: ${DEMO_PASSWORD}):`)
  for (const v of vendors) console.log(`  seller  ${v.email}`)
  console.log('  shopper buyer@window.demo')
  process.exit(0)
}
main().catch((e) => {
  console.error(e)
  process.exit(1)
})
