import { Capacitor } from '@capacitor/core'
import { GoogleAuthProvider, signInWithCredential, signInWithPopup, signInWithRedirect, type UserCredential } from 'firebase/auth'
import { auth } from './firebase'

/**
 * Google sign-in that works in the browser (popup, redirect fallback) and
 * inside the Android app (native Google Sign-In through @capacitor-firebase/authentication,
 * then the ID token is handed to the web SDK so the rest of the app is unchanged).
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  if (Capacitor.isNativePlatform()) {
    const { FirebaseAuthentication } = await import('@capacitor-firebase/authentication')
    const result = await FirebaseAuthentication.signInWithGoogle({ skipNativeAuth: true })
    const idToken = result.credential?.idToken
    if (!idToken) throw new Error('Google sign-in was cancelled')
    return signInWithCredential(auth, GoogleAuthProvider.credential(idToken, result.credential?.accessToken))
  }
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  try {
    return await signInWithPopup(auth, provider)
  } catch (e) {
    const code = (e as { code?: string }).code ?? ''
    if (code === 'auth/popup-blocked' || code === 'auth/operation-not-supported-in-this-environment') {
      await signInWithRedirect(auth, provider)
      // The page navigates away; the promise never settles here.
      return new Promise<UserCredential>(() => undefined)
    }
    throw e
  }
}
