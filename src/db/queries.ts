import db from './index'
import type { Card, ReviewLog, ReviewState } from './types'
import { markLocalChange, queueCardDelete } from '../sync/queue'

export type CardFilter = {
  text?: string
  box?: number | null
  tags?: string[]
}

export async function listCards(): Promise<Card[]> {
  return db.cards.toArray()
}

export async function listCardsByDeck(_deckId: number): Promise<Card[]> {
  void _deckId
  return listCards()
}

export async function listCardsWithReviewState(
  _deckId: number
): Promise<Array<{ card: Card; reviewState: ReviewState | undefined }>> {
  void _deckId
  const [cards, reviewStates] = await Promise.all([
    db.cards.toArray(),
    db.reviewStates.toArray()
  ])

  const reviewStateByCardId = new Map(
    reviewStates.map((state) => [state.card_id, state])
  )

  return cards.map((card) => ({
    card,
    reviewState: reviewStateByCardId.get(card.id ?? -1)
  }))
}

export async function listCardsFiltered(
  filter: CardFilter
): Promise<Array<{ card: Card; reviewState: ReviewState | undefined }>> {
  const { text, box, tags } = filter
  const normalizedText = text?.trim().toLowerCase() ?? ''
  const normalizedTags = (tags ?? []).map((tag) => tag.trim().toLowerCase()).filter(Boolean)

  const entries = await listCardsWithReviewState(0)

  return entries.filter(({ card, reviewState }) => {
    if (typeof box === 'number') {
      if (!reviewState || reviewState.box !== box) {
        return false
      }
    }

    if (normalizedText) {
      const haystack = `${card.front_md} ${card.back_md}`.toLowerCase()
      if (!haystack.includes(normalizedText)) {
        return false
      }
    }

    if (normalizedTags.length > 0) {
      const cardTags = card.tags.map((tag) => tag.toLowerCase())
      const hasAnyTag = normalizedTags.some((tag) =>
        cardTags.some((cardTag) => cardTag.includes(tag))
      )
      if (!hasAnyTag) {
        return false
      }
    }

    return true
  })
}

export async function getCardById(id: number): Promise<Card | undefined> {
  return db.cards.get(id)
}

export async function createCard(input: {
  front_md: string
  back_md: string
  tags?: string[]
  hint_md?: string | null
  source_type?: string | null
  source_id?: string | null
  source_ref?: string | null
}): Promise<number> {
  const now = new Date().toISOString()
  const tags = input.tags ?? []

  const cardId = await db.transaction('rw', db.cards, db.reviewStates, async () => {
    const cardId = await db.cards.add({
      front_md: input.front_md,
      back_md: input.back_md,
      hint_md: input.hint_md ?? null,
      tags,
      created_at: now,
      updated_at: now,
      source_type: input.source_type ?? null,
      source_id: input.source_id ?? null,
      source_ref: input.source_ref ?? null,
      cloud_id: null,
      synced_at: null
    })

    await db.reviewStates.add({
      card_id: cardId,
      box: 0,
      due_date: null,
      updated_at: now,
      is_learned: false,
      learned_at: null
    })

    return cardId
  })

  markLocalChange()
  return cardId
}

export async function updateCard(
  id: number,
  updates: {
    front_md?: string
    back_md?: string
    tags?: string[]
    hint_md?: string | null
    source_type?: string | null
    source_id?: string | null
    source_ref?: string | null
    cloud_id?: string | null
  }
): Promise<number> {
  const now = new Date().toISOString()
  const payload: Partial<Card> = { updated_at: now }
  if (updates.front_md !== undefined) {
    payload.front_md = updates.front_md
  }
  if (updates.back_md !== undefined) {
    payload.back_md = updates.back_md
  }
  if (updates.tags !== undefined) {
    payload.tags = updates.tags
  }
  if (updates.hint_md !== undefined) {
    payload.hint_md = updates.hint_md
  }
  if (updates.source_type !== undefined) {
    payload.source_type = updates.source_type
  }
  if (updates.source_id !== undefined) {
    payload.source_id = updates.source_id
  }
  if (updates.source_ref !== undefined) {
    payload.source_ref = updates.source_ref
  }
  if (updates.cloud_id !== undefined) {
    payload.cloud_id = updates.cloud_id
  }
  const updated = await db.cards.update(id, payload)
  if (updated) {
    markLocalChange()
  }
  return updated
}

export async function deleteCard(id: number): Promise<void> {
  const card = await db.cards.get(id)
  await db.transaction('rw', db.cards, db.reviewStates, db.reviewLogs, db.media, async () => {
    await db.cards.delete(id)
    await db.reviewStates.delete(id)
    await db.reviewLogs.where('card_id').equals(id).delete()
    await db.media.where('card_id').equals(id).delete()
  })
  if (import.meta.env.DEV) {
    console.log('[DELETE] card', id)
  }

  queueCardDelete(card?.cloud_id ?? null)
}

const matchesTag = (tags: string[], tag: string, includeDescendants: boolean) => {
  if (includeDescendants) {
    return tags.some((entry) => entry === tag || entry.startsWith(`${tag}/`))
  }
  return tags.some((entry) => entry === tag)
}

export async function deleteCardsByTag(
  tag: string,
  includeDescendants: boolean
): Promise<number> {
  const cards = await db.cards.toArray()
  const targetIds = cards
    .filter((card) => card.id && matchesTag(card.tags, tag, includeDescendants))
    .map((card) => card.id as number)

  if (targetIds.length === 0) {
    return 0
  }

  await db.transaction('rw', db.cards, db.reviewStates, db.reviewLogs, db.media, async () => {
    await db.cards.bulkDelete(targetIds)
    await db.reviewStates.bulkDelete(targetIds)
    await db.reviewLogs.where('card_id').anyOf(targetIds).delete()
    await db.media.where('card_id').anyOf(targetIds).delete()
  })

  if (import.meta.env.DEV) {
    console.log('[DELETE] tag', tag, { includeDescendants, count: targetIds.length })
  }

  const cloudIds = cards
    .filter((card) => card.id && targetIds.includes(card.id))
    .map((card) => card.cloud_id)
    .filter((value): value is string => typeof value === 'string')
  cloudIds.forEach((cloudId) => queueCardDelete(cloudId))

  return targetIds.length
}

export async function deleteAllCards(): Promise<void> {
  const cards = await db.cards.toArray()
  await db.transaction('rw', db.cards, db.reviewStates, db.reviewLogs, db.media, async () => {
    await db.cards.clear()
    await db.reviewStates.clear()
    await db.reviewLogs.clear()
    await db.media.clear()
  })
  if (import.meta.env.DEV) {
    console.log('[DELETE] all cards')
  }

  cards
    .map((card) => card.cloud_id)
    .filter((value): value is string => typeof value === 'string')
    .forEach((cloudId) => queueCardDelete(cloudId))
}

export async function getReviewState(cardId: number): Promise<ReviewState | undefined> {
  return db.reviewStates.get(cardId)
}

export async function upsertReviewState(state: ReviewState): Promise<number> {
  const payload: ReviewState = {
    ...state,
    updated_at: state.updated_at ?? new Date().toISOString()
  }
  const result = await db.reviewStates.put(payload)
  markLocalChange()
  return result
}

export async function addReviewLog(entry: ReviewLog): Promise<number> {
  const result = await db.reviewLogs.add(entry)
  markLocalChange()
  return result
}

export async function listReviewLogsSince(
  sinceIso: string
): Promise<ReviewLog[]> {
  return db.reviewLogs.where('timestamp').aboveOrEqual(sinceIso).toArray()
}
