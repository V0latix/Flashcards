import { useEffect } from 'react'
import { useAuth } from '../auth/useAuth'
import { runInitialSync, setActiveUser, syncOnce } from './engine'
import { upsertUserProfile } from './remoteStore'

export const useSync = () => {
  const { user } = useAuth()
  const userId = user?.id ?? null
  const userEmail = user?.email ?? null

  useEffect(() => {
    if (!userId) {
      setActiveUser(null)
      return
    }
    setActiveUser(userId)
    void upsertUserProfile({ id: userId, email: userEmail }).catch((error) => {
      console.warn('[sync] profile upsert failed', error)
    })
    void runInitialSync(userId)

    const interval = window.setInterval(() => {
      void syncOnce(userId)
    }, 15000)

    const onFocus = () => {
      void syncOnce(userId, true)
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      setActiveUser(null)
    }
  }, [userEmail, userId])
}
