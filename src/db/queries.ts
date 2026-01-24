import db from './index'
import type { Card, ReviewLog, ReviewState } from './types'

export type CardFilter = {
  text?: string
  box?: number | null
  tags?: string[]
}

export async function listCards(): Promise<Card[]> {
  return db.cards.toArray()
}

export async function listCardsByDeck(_deckId: number): Promise<Card[]> {
  return listCards()
}

export async function listCardsWithReviewState(
  _deckId: number
): Promise<Array<{ card: Card; reviewState: ReviewState | undefined }>> {
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
}): Promise<number> {
  const now = new Date().toISOString()
  const tags = input.tags ?? []

  return db.transaction('rw', db.cards, db.reviewStates, async () => {
    const cardId = await db.cards.add({
      front_md: input.front_md,
      back_md: input.back_md,
      hint_md: input.hint_md ?? null,
      tags,
      created_at: now,
      updated_at: now,
      source_type: input.source_type ?? null,
      source_id: input.source_id ?? null
    })

    await db.reviewStates.add({
      card_id: cardId,
      box: 0,
      due_date: null,
      is_learned: false,
      learned_at: null
    })

    return cardId
  })
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
  return db.cards.update(id, payload)
}

export async function deleteCard(id: number): Promise<void> {
  await db.transaction('rw', db.cards, db.reviewStates, db.reviewLogs, db.media, async () => {
    await db.cards.delete(id)
    await db.reviewStates.delete(id)
    await db.reviewLogs.where('card_id').equals(id).delete()
    await db.media.where('card_id').equals(id).delete()
  })
  if (import.meta.env.DEV) {
    console.log('[DELETE] card', id)
  }
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

  return targetIds.length
}

export async function deleteAllCards(): Promise<void> {
  await db.transaction('rw', db.cards, db.reviewStates, db.reviewLogs, db.media, async () => {
    await db.cards.clear()
    await db.reviewStates.clear()
    await db.reviewLogs.clear()
    await db.media.clear()
  })
  if (import.meta.env.DEV) {
    console.log('[DELETE] all cards')
  }
}

export async function getReviewState(cardId: number): Promise<ReviewState | undefined> {
  return db.reviewStates.get(cardId)
}

export async function upsertReviewState(state: ReviewState): Promise<number> {
  return db.reviewStates.put(state)
}

export async function addReviewLog(entry: ReviewLog): Promise<number> {
  return db.reviewLogs.add(entry)
}

export async function listReviewLogsSince(
  sinceIso: string
): Promise<ReviewLog[]> {
  return db.reviewLogs.where('timestamp').aboveOrEqual(sinceIso).toArray()
}
