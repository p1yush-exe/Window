/** One-off: removes the retired grocery seller's products from the hosted project (owner-only delete under the rules). */
import { initializeApp } from 'firebase/app'
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { collection, deleteDoc, getDocs, getFirestore, query, where } from 'firebase/firestore'
const env = (k: string, fallback = '') => process.env[k] ?? fallback
const app = initializeApp({ apiKey: env('VITE_FIREBASE_API_KEY'), authDomain: env('VITE_FIREBASE_AUTH_DOMAIN'), projectId: env('VITE_FIREBASE_PROJECT_ID'), appId: env('VITE_FIREBASE_APP_ID') })
const auth = getAuth(app)
const db = getFirestore(app)
const user = (await signInWithEmailAndPassword(auth, 'fresh@window.demo', 'window123')).user
const snap = await getDocs(query(collection(db, 'products'), where('vendorId', '==', user.uid)))
for (const d of snap.docs) await deleteDoc(d.ref)
console.log(`deleted ${snap.size} legacy products for ${user.uid}`)
process.exit(0)
