import { supabase } from '../supabase/client'
import type {
  RemoteCard,
  RemoteProgress,
  RemoteReviewLog,
  RemoteSettings,
  RemoteSnapshot
} from './types'

const PAGE_SIZE = 1000

async function fetchAllByUser<T>(
  table: 'user_cards' | 'user_progress' | 'user_review_log',
  userId: string,
  orderColumn: string
): Promise<T[]> {
  const rows: T[] = []
  let from = 0

  // Supabase/PostgREST often enforces a max rows cap per request (commonly 1000).
  // We page through results to avoid truncated snapshots.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .eq('user_id', userId)
      .order(orderColumn, { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) {
      throw new Error(error.message)
    }

    const chunk = (data ?? []) as T[]
    rows.push(...chunk)

    if (chunk.length < PAGE_SIZE) {
      break
    }

    from += PAGE_SIZE
  }

  return rows
}

export const fetchRemoteSnapshot = async (userId: string): Promise<RemoteSnapshot> => {
  const [cards, progress, settingsRes, reviewLogs] = await Promise.all([
    fetchAllByUser<RemoteCard>('user_cards', userId, 'id'),
    fetchAllByUser<RemoteProgress>('user_progress', userId, 'card_id'),
    supabase.from('user_settings').select('*').eq('user_id', userId).maybeSingle(),
    fetchAllByUser<RemoteReviewLog>('user_review_log', userId, 'id')
  ])

  if (settingsRes.error && settingsRes.error.code !== 'PGRST116') {
    throw new Error(settingsRes.error.message)
  }

  return {
    cards,
    progress,
    settings: (settingsRes.data ?? null) as RemoteSettings | null,
    reviewLogs
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
