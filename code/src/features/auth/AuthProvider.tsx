import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { createProfile, ensureProfileDefaults, getProfile, listenProfile } from '@/lib/db'
import { signInWithGoogle as googlePopup } from '@/lib/googleSignIn'
import { getShopperPrefs } from '@/lib/prefs'
import type { Role, UserProfile } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  /** Creates the auth account and the profile document in one go. */
  signUp: (email: string, password: string, role: Role, displayName: string) => Promise<string>
  signIn: (email: string, password: string) => Promise<void>
  /**
   * Google one-tap. Creates the profile with the given role when the account is new.
   * Resolves with the signed-in user's info so wizards can prefill name and email.
   */
  signInWithGoogle: (role: Role) => Promise<{ uid: string; email: string | null; displayName: string | null; isNew: boolean; existingRole: Role | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function friendlyAuthError(e: unknown): string {
  const code = (e as { code?: string })?.code ?? ''
  const map: Record<string, string> = {
    'auth/invalid-email': 'That email address does not look right.',
    'auth/user-not-found': 'No account with that email.',
    'auth/wrong-password': 'Wrong password.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/email-already-in-use': 'An account with that email already exists.',
    'auth/weak-password': 'Password must be at least 6 characters.',
    'auth/network-request-failed': 'Network error. Check your connection.',
    'auth/too-many-requests': 'Too many attempts. Try again in a minute.',
    'auth/popup-closed-by-user': 'The Google window was closed before finishing.',
    'auth/cancelled-popup-request': 'The Google window was closed before finishing.',
    'auth/unauthorized-domain': 'This site is not authorised for Google sign-in yet.',
    'auth/account-exists-with-different-credential': 'That email already has a password login. Use email and password.',
  }
  return map[code] ?? (e instanceof Error ? e.message : 'Something went wrong.')
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [authReady, setAuthReady] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      setAuthReady(true)
      if (!u) {
        setProfile(null)
        setProfileReady(true)
      } else {
        setProfileReady(false)
      }
    })
  }, [])

  useEffect(() => {
    if (!user) return
    setProfileReady(false)
    void ensureProfileDefaults(user.uid).catch(() => undefined)
    const unsub = listenProfile(
      user.uid,
      (p) => {
        setProfile(p)
        setProfileReady(true)
      },
      (e) => {
        setError(e.message)
        setProfileReady(true)
      },
    )
    return unsub
  }, [user])

  const value = useMemo<AuthState>(
    () => ({
      user,
      profile,
      loading: !authReady || !profileReady,
      error,
      async signUp(email, password, role, displayName) {
        const cred = await createUserWithEmailAndPassword(auth, email, password)
        const prefs = role === 'buyer' ? getShopperPrefs() : null
        await createProfile(cred.user.uid, role, displayName, prefs ? { location: prefs.location, interests: prefs.interests } : {})
        return cred.user.uid
      },
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password)
      },
      async signInWithGoogle(role) {
        const cred = await googlePopup()
        const u = cred.user
        const existing = await getProfile(u.uid)
        if (existing) return { uid: u.uid, email: u.email, displayName: u.displayName, isNew: false, existingRole: existing.role }
        const prefs = role === 'buyer' ? getShopperPrefs() : null
        await createProfile(u.uid, role, u.displayName ?? u.email?.split('@')[0] ?? 'Shopper', {
          avatarUrl: u.photoURL ?? null,
          ...(prefs ? { location: prefs.location, interests: prefs.interests } : {}),
        })
        return { uid: u.uid, email: u.email, displayName: u.displayName, isNew: true, existingRole: null }
      },
      async signOut() {
        await fbSignOut(auth)
      },
    }),
    [user, profile, authReady, profileReady, error],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

/** Like useAuth but guarantees a signed-in user with a profile (use inside guarded routes). */
export function useSession() {
  const { user, profile } = useAuth()
  if (!user || !profile) throw new Error('useSession used outside an authenticated route')
  return { user, profile }
}
