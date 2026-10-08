import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { listenProfile } from '@/lib/db'
import type { UserProfile } from '@/lib/types'

interface AuthState {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  error: string | null
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
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
      async signUp(email, password) {
        await createUserWithEmailAndPassword(auth, email, password)
      },
      async signIn(email, password) {
        await signInWithEmailAndPassword(auth, email, password)
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
