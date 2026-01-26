import db from '../db'
import type { Card, ReviewLog, ReviewState } from '../db/types'
import {
  getLeitnerSettings,
  getLeitnerSettingsMeta,
  saveLeitnerSettings,
  setLeitnerSettingsMeta
} from '../leitner/settings'
import type { LocalSnapshot } from './types'

export const loadLocalSnapshot = async (): Promise<LocalSnapshot> => {
  const [cards, reviewStates, reviewLogs] = await Promise.all([
    db.cards.toArray(),
    db.reviewStates.toArray(),
    db.reviewLogs.toArray()
  ])
  const settings = getLeitnerSettings()
  const { updated_at } = getLeitnerSettingsMeta()
  return {
    cards,
    reviewStates,
    reviewLogs,
    settings,
    settingsUpdatedAt: updated_at
  }
}

export const saveSettingsFromRemote = (settings: LocalSnapshot['settings'], updatedAt: string) => {
  saveLeitnerSettings(settings)
  setLeitnerSettingsMeta(updatedAt)
}

export const upsertLocalCard = async (
  cardId: number | undefined,
  payload: Partial<Card>
): Promise<number> => {
  if (cardId) {
    await db.cards.update(cardId, payload)
    return cardId
  }
  return db.cards.add(payload as Card)
}

export const upsertLocalReviewState = async (state: ReviewState) => {
  await db.reviewStates.put(state)
}

export const addLocalReviewLog = async (log: ReviewLog) => {
  await db.reviewLogs.add(log)
}
