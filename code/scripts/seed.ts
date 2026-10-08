/**
 * Seeds demo vendors, products and a demo buyer.
 *
 *   pnpm seed:emu   -> against the local emulators (.env.emulator)
 *   pnpm seed       -> against the hosted project (.env)
 *
 * Runs with the web SDK as each vendor, so security rules are exercised too.
 * Safe to re-run: existing accounts are reused and products are keyed by slug.
 */
import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { connectFirestoreEmulator, doc, getDoc, getFirestore, serverTimestamp, setDoc, writeBatch } from 'firebase/firestore'

const env = (k: string, fallback = '') => process.env[k] ?? fallback

const app = initializeApp({
  apiKey: env('VITE_FIREBASE_API_KEY', 'demo-key'),
  authDomain: env('VITE_FIREBASE_AUTH_DOMAIN', 'localhost'),
  projectId: env('VITE_FIREBASE_PROJECT_ID', 'window-dev'),
  appId: env('VITE_FIREBASE_APP_ID', 'demo'),
})
const auth = getAuth(app)
const db = getFirestore(app)
if (env('VITE_USE_EMULATOR') === 'true') {
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true })
  connectFirestoreEmulator(db, '127.0.0.1', 8080)
}

export const DEMO_PASSWORD = 'window123'

type Avail = 'in_stock' | 'low' | 'out_of_stock'
interface SeedProduct {
  slug: string
  title: string
  description: string
  price: number | null
  category: string
  tag: string
  availability?: Avail
}
interface SeedVendor {
  email: string
  owner: string
  name: string
  description: string
  products: SeedProduct[]
}

const img = (tag: string, n: number) => `https://loremflickr.com/640/854/${encodeURIComponent(tag)}?lock=${n}`

const vendors: SeedVendor[] = [
  {
    email: 'threads@window.demo',
    owner: 'Simran Kaur',
    name: 'Patiala Threads',
    description: 'Hand-block printed kurtas, phulkari dupattas and everyday cottons made in Patiala.',
    products: [
      { slug: 'indigo-kurta', title: 'Indigo block-print kurta', description: 'Pure cotton, hand block printed. Sizes S to XXL.', price: 1299, category: 'Clothes', tag: 'kurta' },
      { slug: 'phulkari-dupatta', title: 'Phulkari dupatta', description: 'Traditional Punjabi embroidery on georgette. Ask for colours.', price: null, category: 'Clothes', tag: 'embroidery,scarf' },
      { slug: 'linen-shirt', title: 'Relaxed linen shirt', description: 'Breathable summer linen in sand and olive.', price: 1799, category: 'Clothes', tag: 'linen,shirt' },
      { slug: 'denim-jacket', title: 'Vintage wash denim jacket', description: 'Oversized fit, brass buttons.', price: 2499, category: 'Clothes', tag: 'denim,jacket', availability: 'low' },
      { slug: 'cotton-saree', title: 'Mul cotton saree', description: 'Lightweight daily-wear saree with running blouse.', price: 2199, category: 'Clothes', tag: 'saree' },
      { slug: 'kids-frock', title: 'Kids cotton frock', description: 'Ages 2 to 8. Soft and machine washable.', price: 699, category: 'Clothes', tag: 'dress,kids' },
      { slug: 'wool-shawl', title: 'Kullu wool shawl', description: 'Warm handloom shawl, winter special.', price: null, category: 'Wardrobe', tag: 'shawl,wool' },
      { slug: 'nehru-jacket', title: 'Nehru jacket', description: 'Jacquard weave for weddings and functions.', price: 3499, category: 'Clothes', tag: 'jacket,formal' },
      { slug: 'chikankari-kurti', title: 'Chikankari kurti', description: 'Lucknowi hand embroidery on white mul.', price: 1599, category: 'Clothes', tag: 'kurti,embroidery' },
      { slug: 'palazzo-set', title: 'Printed palazzo set', description: 'Kurta and palazzo, bagru print.', price: 1899, category: 'Clothes', tag: 'palazzo,print' },
      { slug: 'hoodie', title: 'Fleece hoodie', description: 'Campus favourite, heavy fleece.', price: 999, category: 'Clothes', tag: 'hoodie' },
      { slug: 'kids-kurta', title: 'Kids kurta pyjama', description: 'Festival set for ages 3 to 10.', price: 899, category: 'Clothes', tag: 'kids,kurta' },
      { slug: 'silk-stole', title: 'Tussar silk stole', description: 'Natural dyed, limited pieces.', price: 1299, category: 'Wardrobe', tag: 'silk,scarf', availability: 'low' },
      { slug: 'cargo-pants', title: 'Cargo pants', description: 'Six pockets, stretch twill.', price: 1499, category: 'Clothes', tag: 'cargo,pants' },
      { slug: 'bandhani-dupatta', title: 'Bandhani dupatta', description: 'Tie-dye from Kutch, many colours.', price: 799, category: 'Clothes', tag: 'bandhani,textile' },
    ],
  },
  {
    email: 'kicks@window.demo',
    owner: 'Arjun Mehta',
    name: 'Kicks Corner',
    description: 'Sneakers, juttis and sandals. Try before you buy at our Leela Bhawan store.',
    products: [
      { slug: 'white-sneakers', title: 'Classic white sneakers', description: 'Leather upper, cushioned sole. UK 6 to 11.', price: 2999, category: 'Shoes', tag: 'sneakers,white' },
      { slug: 'punjabi-jutti', title: 'Hand-embroidered jutti', description: 'Traditional Punjabi jutti, zari work.', price: 1199, category: 'Shoes', tag: 'jutti,shoes' },
      { slug: 'running-shoes', title: 'Lightweight running shoes', description: 'Breathable mesh, 240 g.', price: 3499, category: 'Shoes', tag: 'running,shoes' },
      { slug: 'leather-loafers', title: 'Tan leather loafers', description: 'Full grain leather, Goodyear welt.', price: 4499, category: 'Shoes', tag: 'loafers,leather', availability: 'low' },
      { slug: 'kolhapuri', title: 'Kolhapuri chappals', description: 'Vegetable tanned leather, unisex.', price: 899, category: 'Shoes', tag: 'sandals,leather' },
      { slug: 'high-tops', title: 'Canvas high-tops', description: 'Black and red available.', price: 1999, category: 'Shoes', tag: 'sneakers,canvas' },
      { slug: 'trekking-boots', title: 'Trekking boots', description: 'Waterproof, ankle support. Ask for sizes.', price: null, category: 'Shoes', tag: 'boots,hiking' },
      { slug: 'kids-sneakers', title: 'Kids velcro sneakers', description: 'Light-up soles, sizes 8C to 3Y.', price: 1299, category: 'Shoes', tag: 'kids,shoes' },
      { slug: 'formal-oxfords', title: 'Black oxfords', description: 'Office and interview ready.', price: 2799, category: 'Shoes', tag: 'oxford,shoes' },
      { slug: 'slides', title: 'Cushion slides', description: 'Cloud-soft EVA slides.', price: 599, category: 'Shoes', tag: 'slides,sandals' },
      { slug: 'heels', title: 'Block heels', description: 'Comfortable 2.5 inch block heel.', price: 1899, category: 'Shoes', tag: 'heels' },
      { slug: 'football-boots', title: 'Football boots', description: 'Firm ground studs.', price: 3299, category: 'Shoes', tag: 'football,boots', availability: 'out_of_stock' },
      { slug: 'mojari', title: 'Rajasthani mojari', description: 'Camel leather, hand stitched.', price: 1499, category: 'Shoes', tag: 'mojari,leather' },
      { slug: 'chelsea-boots', title: 'Suede chelsea boots', description: 'Elastic side panels, taupe suede.', price: 3999, category: 'Shoes', tag: 'boots,suede' },
      { slug: 'flip-flops', title: 'Rubber flip-flops', description: 'Hostel essential. Many colours.', price: 299, category: 'Shoes', tag: 'flipflops' },
    ],
  },
  {
    email: 'canvas@window.demo',
    owner: 'Meera Joshi',
    name: 'Canvas & Clay',
    description: 'Original paintings, prints, pottery and home decor by Patiala artists.',
    products: [
      { slug: 'sunset-oil', title: 'Sunset over Sheesh Mahal (oil)', description: '24x36 inch oil on canvas, framed.', price: 12000, category: 'Paintings', tag: 'painting,sunset' },
      { slug: 'abstract-blue', title: 'Abstract in blue', description: 'Acrylic, 18x24 inch. Open to offers.', price: null, category: 'Paintings', tag: 'abstract,painting' },
      { slug: 'madhubani', title: 'Madhubani fish print', description: 'Giclee print on archival paper, A3.', price: 1500, category: 'Paintings', tag: 'madhubani,folk art' },
      { slug: 'terracotta-planter', title: 'Terracotta planter set', description: 'Set of three hand-thrown planters.', price: 1299, category: 'Decor', tag: 'terracotta,planter' },
      { slug: 'brass-diya', title: 'Brass diya set', description: 'Six diyas, antique finish.', price: 899, category: 'Decor', tag: 'brass,lamp' },
      { slug: 'macrame', title: 'Macrame wall hanging', description: 'Cotton rope, 60 cm wide.', price: 1199, category: 'Decor', tag: 'macrame' },
      { slug: 'ceramic-mugs', title: 'Stoneware mugs (pair)', description: 'Speckled glaze, dishwasher safe.', price: 799, category: 'Decor', tag: 'ceramic,mug', availability: 'low' },
      { slug: 'charcoal-portrait', title: 'Custom charcoal portrait', description: 'Send a photo, get a portrait in a week.', price: null, category: 'Paintings', tag: 'charcoal,portrait' },
      { slug: 'wooden-tray', title: 'Mango wood serving tray', description: 'Hand carved edges.', price: 1099, category: 'Decor', tag: 'wood,tray' },
      { slug: 'jute-rug', title: 'Round jute rug', description: '120 cm, natural fibre.', price: 1899, category: 'Decor', tag: 'jute,rug' },
      { slug: 'watercolor-set', title: 'Botanical watercolours (set of 4)', description: 'A4 prints, unframed.', price: 1200, category: 'Paintings', tag: 'watercolor,botanical' },
      { slug: 'scented-candles', title: 'Soy candles trio', description: 'Mogra, sandalwood, lemongrass.', price: 699, category: 'Decor', tag: 'candle' },
      { slug: 'mirror', title: 'Rattan round mirror', description: '50 cm, boho style.', price: 2299, category: 'Decor', tag: 'rattan,mirror' },
      { slug: 'warli-canvas', title: 'Warli village scene', description: 'Acrylic on canvas, 20x30 inch.', price: 4500, category: 'Paintings', tag: 'warli,tribal art' },
      { slug: 'table-lamp', title: 'Ceramic table lamp', description: 'Warm LED bulb included.', price: 2499, category: 'Decor', tag: 'lamp,ceramic' },
    ],
  },
  {
    email: 'fresh@window.demo',
    owner: 'Gurpreet Singh',
    name: 'Sangrur Fresh',
    description: 'Farm to hostel. Fresh produce, dairy and pantry staples delivered around campus.',
    products: [
      { slug: 'alphonso', title: 'Alphonso mangoes (dozen)', description: 'Ratnagiri, naturally ripened.', price: 899, category: 'Groceries', tag: 'mango' , availability: 'low' },
      { slug: 'basmati', title: 'Aged basmati rice 5 kg', description: 'Extra long grain, 2 years aged.', price: 749, category: 'Groceries', tag: 'rice' },
      { slug: 'paneer', title: 'Fresh paneer 500 g', description: 'Made every morning. Order by 10 am.', price: 220, category: 'Groceries', tag: 'paneer,cheese' },
      { slug: 'desi-ghee', title: 'Desi cow ghee 1 L', description: 'Bilona method, glass jar.', price: 1100, category: 'Groceries', tag: 'ghee,butter' },
      { slug: 'honey', title: 'Raw forest honey 500 g', description: 'Unprocessed, from Himachal.', price: 450, category: 'Groceries', tag: 'honey' },
      { slug: 'veg-box', title: 'Weekly veg box', description: 'Seasonal mix for two people. Ask what is in this week.', price: null, category: 'Groceries', tag: 'vegetables' },
      { slug: 'masala-kit', title: 'Punjabi masala kit', description: 'Six jars of freshly ground spices.', price: 599, category: 'Groceries', tag: 'spices' },
      { slug: 'jaggery', title: 'Organic jaggery 1 kg', description: 'Chemical free, from our own farm.', price: 180, category: 'Groceries', tag: 'jaggery,sugar' },
      { slug: 'cold-pressed-oil', title: 'Cold-pressed mustard oil 1 L', description: 'Kachi ghani.', price: 320, category: 'Groceries', tag: 'oil,bottle' },
      { slug: 'eggs', title: 'Free-range eggs (30)', description: 'Brown eggs, collected daily.', price: 270, category: 'Groceries', tag: 'eggs' },
      { slug: 'makhana', title: 'Roasted makhana 200 g', description: 'Peri peri and classic salt.', price: 199, category: 'Groceries', tag: 'snack' },
      { slug: 'pickle', title: 'Homemade mango pickle', description: 'Grandmother recipe, 500 g jar.', price: 250, category: 'Groceries', tag: 'pickle,jar' },
      { slug: 'green-tea', title: 'Kangra green tea 100 g', description: 'First flush.', price: 399, category: 'Groceries', tag: 'tea' },
      { slug: 'strawberries', title: 'Strawberries 500 g', description: 'Mahabaleshwar, in season only.', price: 350, category: 'Groceries', tag: 'strawberry', availability: 'out_of_stock' },
      { slug: 'lassi', title: 'Fresh lassi (6 pack)', description: 'Sweet or salted.', price: 240, category: 'Groceries', tag: 'yogurt,drink' },
    ],
  },
]

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
  if (!(await getDoc(doc(db, 'users', uid))).exists()) {
    await setDoc(doc(db, 'users', uid), { role: 'vendor', displayName: v.owner, avatarUrl: null, createdAt: serverTimestamp() })
  }
  await setDoc(
    doc(db, 'vendors', uid),
    { ownerUid: uid, name: v.name, description: v.description, logoUrl: null, verified: true, createdAt: serverTimestamp() },
    { merge: true },
  )
  const batch = writeBatch(db)
  v.products.forEach((p, i) => {
    const id = `${uid.slice(0, 6)}-${p.slug}`
    const n = vendorIndex * 100 + i
    batch.set(doc(db, 'products', id), {
      vendorId: uid,
      vendorName: v.name,
      title: p.title,
      description: p.description,
      price: p.price,
      currency: 'INR',
      category: p.category,
      imageUrls: [img(p.tag, n), img(p.tag, n + 1000)],
      availability: p.availability ?? 'in_stock',
      // Stagger createdAt so the feed interleaves vendors.
      createdAt: new Date(Date.now() - (i * 4 + vendorIndex) * 3_600_000),
      updatedAt: serverTimestamp(),
    })
  })
  await batch.commit()
  console.log(`✔ ${v.name} (${v.email}): ${v.products.length} products`)
  await signOut(auth)
}

async function seedBuyer() {
  const user = await signInOrCreate('buyer@window.demo')
  if (!(await getDoc(doc(db, 'users', user.uid))).exists()) {
    await setDoc(doc(db, 'users', user.uid), { role: 'buyer', displayName: 'Demo Shopper', avatarUrl: null, createdAt: serverTimestamp() })
  }
  console.log('✔ buyer@window.demo')
  await signOut(auth)
}

async function main() {
  console.log(`Seeding project ${env('VITE_FIREBASE_PROJECT_ID')} ${env('VITE_USE_EMULATOR') === 'true' ? '(emulator)' : '(hosted)'}`)
  for (let i = 0; i < vendors.length; i++) await seedVendor(vendors[i]!, i)
  await seedBuyer()
  console.log(`\nDemo accounts (password: ${DEMO_PASSWORD}):`)
  for (const v of vendors) console.log(`  vendor  ${v.email}`)
  console.log('  buyer   buyer@window.demo')
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
