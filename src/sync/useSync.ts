import { useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { runInitialSync, setActiveUser, syncOnce } from './engine'
import { upsertUserProfile } from './remoteStore'

export const useSync = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setActiveUser(null)
      return
    }
    setActiveUser(user.id)
    void upsertUserProfile({ id: user.id, email: user.email ?? null }).catch((error) => {
      console.warn('[sync] profile upsert failed', error)
    })
    void runInitialSync(user.id)

    const interval = window.setInterval(() => {
      void syncOnce(user.id)
    }, 15000)

    const onFocus = () => {
      void syncOnce(user.id, true)
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      setActiveUser(null)
    }
  }, [user?.id])
}
