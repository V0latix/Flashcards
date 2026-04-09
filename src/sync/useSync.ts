import { useEffect } from 'react'
import { useAuth } from '../auth/useAuth'
import {
  getTodayKey,
  notifyDailyStatusUpdated,
  reconcileDailyStatus,
} from '../streak/dailyStatus'
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

    const reconcileToday = async () => {
      try {
        const didReconcile = await reconcileDailyStatus(userId, getTodayKey())
        if (didReconcile) {
          notifyDailyStatusUpdated()
        }
      } catch (error) {
        console.warn('[sync] daily status reconcile failed', error)
      }
    }

    setActiveUser(userId)
    void upsertUserProfile({ id: userId, email: userEmail }).catch((error) => {
      console.warn('[sync] profile upsert failed', error)
    })
    void runInitialSync(userId)
    void reconcileToday()

    const interval = window.setInterval(() => {
      void syncOnce(userId)
      void reconcileToday()
    }, 15000)

    const onFocus = () => {
      void syncOnce(userId, true)
      void reconcileToday()
    }

    window.addEventListener('focus', onFocus)

    return () => {
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
      setActiveUser(null)
    }
  }, [userEmail, userId])
}
