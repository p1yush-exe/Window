import { useEffect, useState } from 'react'
import { listenMatches, listenNotifications } from '@/lib/db'
import { useAuth } from '@/features/auth/AuthProvider'

export function useUnreadCounts() {
  const { profile } = useAuth()
  const [unreadChats, setUnreadChats] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const uid = profile?.uid
  const role = profile?.role

  useEffect(() => {
    if (!uid || !role) {
      setUnreadChats(0)
      setUnreadNotifications(0)
      return
    }
    const u1 = listenMatches(uid, role, (matches) => {
      setUnreadChats(matches.filter((m) => (m.unread?.[uid] ?? 0) > 0).length)
    })
    const u2 = listenNotifications(uid, (n) => setUnreadNotifications(n.filter((x) => !x.read).length))
    return () => {
      u1()
      u2()
    }
  }, [uid, role])

  return { unreadChats, unreadNotifications }
}
