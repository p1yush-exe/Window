import { useEffect, useState } from 'react'
import { listenMatches, listenNotifications } from '@/lib/db'
import { useSession } from '@/features/auth/AuthProvider'

export function useUnreadCounts() {
  const { profile } = useSession()
  const [unreadChats, setUnreadChats] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)

  useEffect(() => {
    const u1 = listenMatches(profile.uid, profile.role, (matches) => {
      setUnreadChats(matches.filter((m) => (m.unread?.[profile.uid] ?? 0) > 0).length)
    })
    const u2 = listenNotifications(profile.uid, (n) => setUnreadNotifications(n.filter((x) => !x.read).length))
    return () => {
      u1()
      u2()
    }
  }, [profile.uid, profile.role])

  return { unreadChats, unreadNotifications }
}
