import db from '../db'
import type { Card, ReviewLog, ReviewState } from '../db/types'
import { getLeitnerSettingsMeta, setLeitnerSettingsMeta } from '../leitner/settings'
import { createUuid, getDeviceId } from './ids'
import { loadLocalSnapshot, saveSettingsFromRemote } from './localStore'
import {
  deleteRemoteCards,
  fetchRemoteSnapshot,
  insertRemoteReviewLogs,
  upsertRemoteCards,
  upsertRemoteProgress,
  upsertRemoteSettings
} from './remoteStore'
import type { LocalSnapshot, RemoteCard, RemoteProgress, RemoteReviewLog, RemoteSnapshot } from './types'

let activeUserId: string | null = null
let isSyncing = false
let pendingSync = false
let pendingDeletes: string[] = []
let debounceTimer: number | null = null
const LAST_SYNC_KEY = 'flashcards_last_sync_at'

const parseTime = (value: string | null | undefined): number => {
  if (!value) {
    return 0
  }
  return new Date(value).getTime()
}

const getLastSyncAt = (): string | null => {
  if (typeof localStorage === 'undefined') {
    return null
  }
  return localStorage.getItem(LAST_SYNC_KEY)
}

const setLastSyncAt = (value: string) => {
  if (typeof localStorage === 'undefined') {
    return
  }
  localStorage.setItem(LAST_SYNC_KEY, value)
}

const isRemoteNewer = (remote: string | null | undefined, local: string | null | undefined) =>
  parseTime(remote) > parseTime(local)

const ensureCloudIds = async (cards: Card[]): Promise<Map<string, Card>> => {
  const cloudMap = new Map<string, Card>()
  const updates: Array<{ id: number; cloud_id: string }> = []

  cards.forEach((card) => {
    if (!card.id) {
      return
    }
    if (!card.cloud_id) {
      updates.push({ id: card.id, cloud_id: createUuid() })
      return
    }
    cloudMap.set(card.cloud_id, card)
  })

  if (updates.length > 0) {
    await db.transaction('rw', db.cards, async () => {
      for (const update of updates) {
        await db.cards.update(update.id, { cloud_id: update.cloud_id })
      }
    })
    updates.forEach((update) => {
      const card = cards.find((entry) => entry.id === update.id)
      if (card) {
        card.cloud_id = update.cloud_id
        cloudMap.set(update.cloud_id, card)
      }
    })
  }

  cards.forEach((card) => {
    if (card.cloud_id) {
      cloudMap.set(card.cloud_id, card)
    }
  })

  return cloudMap
}

const normalizeSourceType = (value: string | null | undefined): 'public_pack' | 'manual' => {
  if (value === 'supabase_public') {
    return 'public_pack'
  }
  if (value === 'public_pack') {
    return 'public_pack'
  }
  return 'manual'
}

const mapLocalCardToRemote = (userId: string, card: Card): RemoteCard => ({
  id: card.cloud_id ?? createUuid(),
  user_id: userId,
  source_type: normalizeSourceType(card.source_type),
  source_ref: card.source_ref ?? null,
  source_public_id: card.source_id ?? null,
  front_md: card.front_md,
  back_md: card.back_md,
  hint_md: card.hint_md ?? null,
  tags: card.tags ?? [],
  created_at: card.created_at,
  updated_at: card.updated_at
})

const mapRemoteCardToLocal = (card: RemoteCard): Card => ({
  cloud_id: card.id,
  front_md: card.front_md,
  back_md: card.back_md,
  hint_md: card.hint_md,
  tags: card.tags ?? [],
  created_at: card.created_at,
  updated_at: card.updated_at,
  source_type: card.source_type === 'public_pack' ? 'supabase_public' : 'manual',
  source_id: card.source_public_id,
  source_ref: card.source_ref,
  source: card.source_type === 'public_pack' ? 'supabase' : null,
  synced_at: card.updated_at
})

const mapLocalProgressToRemote = (
  userId: string,
  cloudId: string,
  state: ReviewState
): RemoteProgress => ({
  user_id: userId,
  card_id: cloudId,
  box: state.box,
  learned: Boolean(state.is_learned),
  due_at: state.due_date,
  last_reviewed_at: state.last_reviewed_at ?? null,
  correct_count: 0,
  wrong_count: 0,
  updated_at: state.updated_at ?? new Date().toISOString()
})

const mapRemoteProgressToLocal = (
  localCardId: number,
  progress: RemoteProgress
): ReviewState => ({
  card_id: localCardId,
  box: progress.box,
  due_date: progress.due_at,
  last_reviewed_at: progress.last_reviewed_at ?? null,
  is_learned: progress.learned,
  learned_at: progress.learned ? progress.last_reviewed_at ?? null : null,
  updated_at: progress.updated_at
})

const mapLocalLogToRemote = (
  userId: string,
  cloudId: string,
  log: ReviewLog
): RemoteReviewLog => ({
  id: createUuid(),
  user_id: userId,
  card_id: cloudId,
  result: log.result === 'good',
  reviewed_at: log.timestamp,
  device_id: log.device_id ?? getDeviceId(),
  client_event_id: log.client_event_id ?? createUuid(),
  created_at: log.timestamp
})

const mapRemoteLogToLocal = (
  localCardId: number,
  log: RemoteReviewLog
): ReviewLog => ({
  card_id: localCardId,
  timestamp: log.reviewed_at,
  result: log.result ? 'good' : 'bad',
  previous_box: 0,
  new_box: 0,
  was_learned_before: false,
  was_reversed: false,
  client_event_id: log.client_event_id,
  device_id: log.device_id ?? null
})

const ensureLogIds = async (logs: ReviewLog[]) => {
  const updates: Array<{ id: number; client_event_id: string; device_id: string }> = []
  logs.forEach((log) => {
    if (!log.id) {
      return
    }
    if (!log.client_event_id) {
      updates.push({
        id: log.id,
        client_event_id: createUuid(),
        device_id: log.device_id ?? getDeviceId()
      })
    }
  })
  if (updates.length === 0) {
    return
  }
  await db.transaction('rw', db.reviewLogs, async () => {
    for (const update of updates) {
      await db.reviewLogs.update(update.id, {
        client_event_id: update.client_event_id,
        device_id: update.device_id
      })
    }
  })
}

const deleteLocalCardsByIds = async (cardIds: number[]) => {
  if (cardIds.length === 0) {
    return
  }
  await db.transaction('rw', db.cards, db.reviewStates, db.reviewLogs, db.media, async () => {
    await db.cards.bulkDelete(cardIds)
    await db.reviewStates.bulkDelete(cardIds)
    await db.reviewLogs.where('card_id').anyOf(cardIds).delete()
    await db.media.where('card_id').anyOf(cardIds).delete()
  })
}

const mergeSnapshots = async (
  userId: string,
  local: LocalSnapshot,
  remote: RemoteSnapshot
) => {
  const localCardMap = await ensureCloudIds(local.cards)
  await ensureLogIds(local.reviewLogs)

  const remoteProgressByCard = new Map(remote.progress.map((progress) => [progress.card_id, progress]))
  const remoteLogIds = new Set(remote.reviewLogs.map((log) => log.client_event_id))

  const cardsToUpsert: RemoteCard[] = []
  const progressToUpsert: RemoteProgress[] = []
  const logsToInsert: RemoteReviewLog[] = []
  const localProgressUpserts: ReviewState[] = []
  const localLogAdds: ReviewLog[] = []

  const localCardIdByCloudId = new Map<string, number>()
  local.cards.forEach((card) => {
    if (card.id && card.cloud_id) {
      localCardIdByCloudId.set(card.cloud_id, card.id)
    }
  })

  const remoteCardIds = new Set(remote.cards.map((card) => card.id))
  const lastSyncAt = getLastSyncAt()
  const lastSyncMs = parseTime(lastSyncAt)
  const localDeleteIds: number[] = []
  const cardsToMarkSynced: string[] = []

  for (const remoteCard of remote.cards) {
    const localCard = localCardMap.get(remoteCard.id)
    if (!localCard) {
      const localPayload = mapRemoteCardToLocal(remoteCard)
      const localCardId = await db.cards.add(localPayload)
      localCardIdByCloudId.set(remoteCard.id, localCardId)
      localCardMap.set(remoteCard.id, {
        ...localPayload,
        id: localCardId
      })
      continue
    }
    if (isRemoteNewer(remoteCard.updated_at, localCard.updated_at)) {
      await db.cards.update(localCard.id ?? 0, mapRemoteCardToLocal(remoteCard))
      cardsToMarkSynced.push(remoteCard.id)
    } else if (isRemoteNewer(localCard.updated_at, remoteCard.updated_at)) {
      cardsToUpsert.push(mapLocalCardToRemote(userId, localCard))
    }
  }

  local.cards.forEach((card) => {
    if (!card.cloud_id || remoteCardIds.has(card.cloud_id)) {
      return
    }
    const updatedAtMs = parseTime(card.updated_at)
    if (card.synced_at && lastSyncAt && updatedAtMs <= lastSyncMs) {
      // Defensive behavior:
      // do not hard-delete local cards based only on "missing from remote" because
      // a truncated remote snapshot (API row cap/network issues) can look like deletions.
      // We re-upsert instead to avoid data loss on refresh.
      cardsToUpsert.push(mapLocalCardToRemote(userId, card))
      return
    }
    cardsToUpsert.push(mapLocalCardToRemote(userId, card))
  })

  local.reviewStates.forEach((state) => {
    const card = local.cards.find((entry) => entry.id === state.card_id)
    if (!card?.cloud_id) {
      return
    }
    const remoteProgress = remoteProgressByCard.get(card.cloud_id)
    if (!remoteProgress) {
      progressToUpsert.push(mapLocalProgressToRemote(userId, card.cloud_id, state))
      return
    }
    if (isRemoteNewer(remoteProgress.updated_at, state.updated_at)) {
      const localCardId = localCardIdByCloudId.get(card.cloud_id)
      if (localCardId) {
        localProgressUpserts.push(mapRemoteProgressToLocal(localCardId, remoteProgress))
      }
    } else if (isRemoteNewer(state.updated_at, remoteProgress.updated_at)) {
      progressToUpsert.push(mapLocalProgressToRemote(userId, card.cloud_id, state))
    }
  })

  remote.progress.forEach((remoteProgress) => {
    if (!localCardIdByCloudId.has(remoteProgress.card_id)) {
      return
    }
    const localCardId = localCardIdByCloudId.get(remoteProgress.card_id)
    if (!localCardId) {
      return
    }
    const localState = local.reviewStates.find((state) => state.card_id === localCardId)
    if (!localState) {
      localProgressUpserts.push(mapRemoteProgressToLocal(localCardId, remoteProgress))
    }
  })

  local.reviewLogs.forEach((log) => {
    const card = local.cards.find((entry) => entry.id === log.card_id)
    if (!card?.cloud_id) {
      return
    }
    const clientId = log.client_event_id ?? null
    if (clientId && remoteLogIds.has(clientId)) {
      return
    }
    logsToInsert.push(mapLocalLogToRemote(userId, card.cloud_id, log))
  })

  remote.reviewLogs.forEach((log) => {
    const localCardId = localCardIdByCloudId.get(log.card_id)
    if (!localCardId) {
      return
    }
    const exists = local.reviewLogs.some((entry) => entry.client_event_id === log.client_event_id)
    if (!exists) {
      localLogAdds.push(mapRemoteLogToLocal(localCardId, log))
    }
  })

  const localSettingsUpdatedAt = getLeitnerSettingsMeta().updated_at
  if (remote.settings) {
    if (isRemoteNewer(remote.settings.updated_at, localSettingsUpdatedAt)) {
      saveSettingsFromRemote(
        {
          box1Target: remote.settings.box1_target,
          intervalDays: Object.fromEntries(
            Object.entries(remote.settings.intervals).map(([key, value]) => [Number(key), value])
          ),
          learnedReviewIntervalDays: remote.settings.learned_review_interval_days,
          reverseProbability: remote.settings.reverse_probability
        },
        remote.settings.updated_at
      )
    }
  }

  if (!remote.settings && local.settingsUpdatedAt) {
    await upsertRemoteSettings({
      user_id: userId,
      box1_target: local.settings.box1Target,
      intervals: local.settings.intervalDays,
      learned_review_interval_days: local.settings.learnedReviewIntervalDays,
      reverse_probability: local.settings.reverseProbability,
      updated_at: local.settingsUpdatedAt ?? new Date().toISOString()
    })
  } else if (remote.settings && local.settingsUpdatedAt) {
    if (isRemoteNewer(local.settingsUpdatedAt, remote.settings.updated_at)) {
      await upsertRemoteSettings({
        user_id: userId,
        box1_target: local.settings.box1Target,
        intervals: local.settings.intervalDays,
        learned_review_interval_days: local.settings.learnedReviewIntervalDays,
        reverse_probability: local.settings.reverseProbability,
        updated_at: local.settingsUpdatedAt
      })
    }
  }

  if (localProgressUpserts.length > 0) {
    await db.reviewStates.bulkPut(localProgressUpserts)
  }
  if (localLogAdds.length > 0) {
    await db.reviewLogs.bulkAdd(localLogAdds)
  }
  if (localDeleteIds.length > 0) {
    await deleteLocalCardsByIds(localDeleteIds)
  }

  await upsertRemoteCards(cardsToUpsert)
  if (cardsToUpsert.length > 0) {
    const syncedAt = new Date().toISOString()
    const cloudIds = cardsToUpsert.map((card) => card.id)
    await db.cards
      .where('cloud_id')
      .anyOf(cloudIds)
      .modify({ synced_at: syncedAt })
  }
  if (cardsToMarkSynced.length > 0) {
    await db.cards
      .where('cloud_id')
      .anyOf(cardsToMarkSynced)
      .modify({ synced_at: new Date().toISOString() })
  }
  await upsertRemoteProgress(progressToUpsert)
  await insertRemoteReviewLogs(logsToInsert)
}

const handleInitialSync = async (userId: string) => {
  const local = await loadLocalSnapshot()
  const remote = await fetchRemoteSnapshot(userId)

  const localEmpty = local.cards.length === 0
  const remoteEmpty = remote.cards.length === 0

  if (!remote.settings) {
    const updatedAt = local.settingsUpdatedAt ?? new Date().toISOString()
    setLeitnerSettingsMeta(updatedAt)
    await upsertRemoteSettings({
      user_id: userId,
      box1_target: local.settings.box1Target,
      intervals: local.settings.intervalDays,
      learned_review_interval_days: local.settings.learnedReviewIntervalDays,
      reverse_probability: local.settings.reverseProbability,
      updated_at: updatedAt
    })
  }

  if (remoteEmpty && localEmpty) {
    setLastSyncAt(new Date().toISOString())
    return
  }
  if (remoteEmpty && !localEmpty) {
    await ensureCloudIds(local.cards)
    const cards = local.cards
      .filter((card): card is Card & { cloud_id: string } => Boolean(card.cloud_id))
      .map((card) => mapLocalCardToRemote(userId, card))
    const progress = local.reviewStates
      .map((state) => {
        const card = local.cards.find((entry) => entry.id === state.card_id)
        if (!card?.cloud_id) {
          return null
        }
        return mapLocalProgressToRemote(userId, card.cloud_id, state)
      })
      .filter((entry): entry is RemoteProgress => Boolean(entry))
    await upsertRemoteCards(cards)
    await upsertRemoteProgress(progress)
    await insertRemoteReviewLogs(
      local.reviewLogs
        .map((log) => {
          const card = local.cards.find((entry) => entry.id === log.card_id)
          if (!card?.cloud_id) {
            return null
          }
          return mapLocalLogToRemote(userId, card.cloud_id, log)
        })
        .filter((entry): entry is RemoteReviewLog => Boolean(entry))
    )
    setLastSyncAt(new Date().toISOString())
    return
  }
  if (!remoteEmpty && localEmpty) {
    const localCards: Array<{ localId: number; cloudId: string }> = []
    await db.transaction('rw', db.cards, db.reviewStates, db.reviewLogs, async () => {
      for (const remoteCard of remote.cards) {
        const localId = await db.cards.add(mapRemoteCardToLocal(remoteCard))
        localCards.push({ localId, cloudId: remoteCard.id })
      }
      for (const progress of remote.progress) {
        const local = localCards.find((entry) => entry.cloudId === progress.card_id)
        if (!local) {
          continue
        }
        await db.reviewStates.add(mapRemoteProgressToLocal(local.localId, progress))
      }
      for (const log of remote.reviewLogs) {
        const local = localCards.find((entry) => entry.cloudId === log.card_id)
        if (!local) {
          continue
        }
        await db.reviewLogs.add(mapRemoteLogToLocal(local.localId, log))
      }
    })
    if (remote.settings) {
      saveSettingsFromRemote(
        {
          box1Target: remote.settings.box1_target,
          intervalDays: Object.fromEntries(
            Object.entries(remote.settings.intervals).map(([key, value]) => [Number(key), value])
          ),
          learnedReviewIntervalDays: remote.settings.learned_review_interval_days,
          reverseProbability: remote.settings.reverse_probability
        },
        remote.settings.updated_at
      )
    }
    setLastSyncAt(new Date().toISOString())
    return
  }

  await mergeSnapshots(userId, local, remote)
  setLastSyncAt(new Date().toISOString())
}

export const setActiveUser = (userId: string | null) => {
  activeUserId = userId
  pendingSync = false
  pendingDeletes = []
  if (debounceTimer) {
    window.clearTimeout(debounceTimer)
    debounceTimer = null
  }
}

export const requestSync = () => {
  if (!activeUserId) {
    return
  }
  pendingSync = true
  if (debounceTimer) {
    return
  }
  debounceTimer = window.setTimeout(() => {
    debounceTimer = null
    if (activeUserId) {
      void syncOnce(activeUserId)
    }
  }, 2000)
}

export const enqueueRemoteDelete = (cloudId: string) => {
  if (!activeUserId) {
    return
  }
  pendingDeletes.push(cloudId)
  requestSync()
}

export const runInitialSync = async (userId: string) => {
  if (isSyncing) {
    return
  }
  isSyncing = true
  try {
    await handleInitialSync(userId)
  } catch (error) {
    console.error('[sync] initial failed', error)
  } finally {
    isSyncing = false
    if (pendingSync && activeUserId) {
      void syncOnce(activeUserId)
    }
  }
}

export const syncOnce = async (userId: string, forcePull = false) => {
  if (isSyncing) {
    pendingSync = true
    return
  }
  if (!pendingSync && !forcePull && pendingDeletes.length === 0) {
    return
  }
  isSyncing = true
  try {
    const local = await loadLocalSnapshot()
    if (pendingDeletes.length > 0) {
      const deletes = [...new Set(pendingDeletes)]
      pendingDeletes = []
      await deleteRemoteCards(userId, deletes)
    }
    const remote = await fetchRemoteSnapshot(userId)
    await mergeSnapshots(userId, local, remote)
    setLastSyncAt(new Date().toISOString())
  } catch (error) {
    console.error('[sync] failed', error)
  } finally {
    const shouldResync = pendingSync
    pendingSync = false
    isSyncing = false
    if (shouldResync && activeUserId) {
      window.setTimeout(() => {
        if (activeUserId) {
          void syncOnce(activeUserId)
        }
      }, 0)
    }
  }
}
