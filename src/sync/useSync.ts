import { useEffect } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { runInitialSync, setActiveUser, syncOnce } from './engine'

export const useSync = () => {
  const { user } = useAuth()

  useEffect(() => {
    if (!user) {
      setActiveUser(null)
      return
    }
    setActiveUser(user.id)
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
