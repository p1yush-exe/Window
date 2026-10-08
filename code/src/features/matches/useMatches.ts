import { useEffect, useState } from 'react'
import { listenMatches } from '@/lib/db'
import type { Match, Role } from '@/lib/types'

export function useMatches(uid: string, role: Role) {
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    setMatches(null)
    return listenMatches(uid, role, setMatches, (e) => setError(e.message))
  }, [uid, role])
  return { matches, error }
}
