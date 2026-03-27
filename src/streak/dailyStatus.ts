import db from '../db'
import { hasPendingDailyCards } from '../leitner/engine'
import { supabase } from '../supabase/client'

export const DAILY_STATUS_UPDATED_EVENT = 'daily-status-updated'
export const DAILY_PROGRESS_UPDATED_EVENT = 'daily-progress-updated'

export const getTodayKey = () => new Date().toISOString().slice(0, 10)

const hasReviewActivityOnDay = async (day: string) => {
  const reviewLogs = await db.reviewLogs.toArray()
  return reviewLogs.some(
    (log) => typeof log.timestamp === 'string' && log.timestamp.slice(0, 10) === day
  )
}

const dispatchBrowserEvent = (name: string) => {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new Event(name))
}

export const reconcileDailyStatus = async (userId: string, day: string): Promise<boolean> => {
  const hasPendingCards = await hasPendingDailyCards(day)
  if (hasPendingCards) {
    return false
  }

  const hasReviewActivity = await hasReviewActivityOnDay(day)
  if (!hasReviewActivity) {
    return false
  }

  const now = new Date().toISOString()
  const { error } = await supabase.from('daily_cards_status').upsert(
    [
      {
        user_id: userId,
        day,
        done: true,
        done_at: now
      }
    ],
    { onConflict: 'user_id,day' }
  )

  if (error) {
    throw new Error(error.message)
  }

  dispatchBrowserEvent(DAILY_STATUS_UPDATED_EVENT)
  return true
}

export const notifyDailyProgressUpdated = () => {
  dispatchBrowserEvent(DAILY_PROGRESS_UPDATED_EVENT)
}
