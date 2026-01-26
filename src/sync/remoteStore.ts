import { supabase } from '../supabase/client'
import type {
  RemoteCard,
  RemoteProgress,
  RemoteReviewLog,
  RemoteSettings,
  RemoteSnapshot
} from './types'

export const fetchRemoteSnapshot = async (userId: string): Promise<RemoteSnapshot> => {
  const [cardsRes, progressRes, settingsRes, logsRes] = await Promise.all([
    supabase.from('user_cards').select('*').eq('user_id', userId),
    supabase.from('user_progress').select('*').eq('user_id', userId),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('user_review_log').select('*').eq('user_id', userId)
  ])

  if (cardsRes.error) {
    throw new Error(cardsRes.error.message)
  }
  if (progressRes.error) {
    throw new Error(progressRes.error.message)
  }
  if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
    throw new Error(settingsRes.error.message)
  }
  if (logsRes.error) {
    throw new Error(logsRes.error.message)
  }

  return {
    cards: (cardsRes.data ?? []) as RemoteCard[],
    progress: (progressRes.data ?? []) as RemoteProgress[],
    settings: (settingsRes.data ?? null) as RemoteSettings | null,
    reviewLogs: (logsRes.data ?? []) as RemoteReviewLog[]
  }
}

export const upsertRemoteCards = async (cards: RemoteCard[]) => {
  if (cards.length === 0) {
    return
  }
  const { error } = await supabase.from('user_cards').upsert(cards, {
    onConflict: 'id'
  })
  if (error) {
    throw new Error(error.message)
  }
}

export const upsertRemoteProgress = async (progress: RemoteProgress[]) => {
  if (progress.length === 0) {
    return
  }
  const { error } = await supabase.from('user_progress').upsert(progress, {
    onConflict: 'user_id,card_id'
  })
  if (error) {
    throw new Error(error.message)
  }
}

export const upsertRemoteSettings = async (settings: RemoteSettings) => {
  const { error } = await supabase.from('user_settings').upsert(settings, {
    onConflict: 'user_id'
  })
  if (error) {
    throw new Error(error.message)
  }
}

export const insertRemoteReviewLogs = async (logs: RemoteReviewLog[]) => {
  if (logs.length === 0) {
    return
  }
  const { error } = await supabase.from('user_review_log').upsert(logs, {
    onConflict: 'user_id,client_event_id',
    ignoreDuplicates: true
  })
  if (error) {
    throw new Error(error.message)
  }
}

export const deleteRemoteCards = async (userId: string, cloudIds: string[]) => {
  if (cloudIds.length === 0) {
    return
  }
  const { error } = await supabase
    .from('user_cards')
    .delete()
    .eq('user_id', userId)
    .in('id', cloudIds)
  if (error) {
    throw new Error(error.message)
  }
}

export const upsertUserProfile = async (user: { id: string; email?: string | null }) => {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null
    },
    { onConflict: 'id' }
  )
  if (error) {
    throw new Error(error.message)
  }
}
