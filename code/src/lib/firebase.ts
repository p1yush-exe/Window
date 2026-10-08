import { getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, initializeFirestore } from 'firebase/firestore'
import { env } from './env'

const app = getApps()[0] ?? initializeApp(env.firebase)

export const auth = getAuth(app)
// Long polling autodetect keeps Firestore working inside the Android WebView
// where WebChannel streaming is sometimes blocked.
export const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true })

if (env.useEmulator) {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
}

export default app
