import db from './index'
import type { Card, ReviewState } from './types'

export async function listCardsByDeck(_deckId: number): Promise<Card[]> {
  return db.cards.toArray()
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

export async function getCardById(id: number): Promise<Card | undefined> {
  return db.cards.get(id)
}

export async function createCard(input: {
  front_md: string
  back_md: string
  tags?: string[]
}): Promise<number> {
  const now = new Date().toISOString()
  const tags = input.tags ?? []

  return db.transaction('rw', db.cards, db.reviewStates, async () => {
    const cardId = await db.cards.add({
      front_md: input.front_md,
      back_md: input.back_md,
      tags,
      created_at: now,
      updated_at: now
    })

    await db.reviewStates.add({
      card_id: cardId,
      box: 0,
      due_date: null
    })

    return cardId
  })
}

export async function updateCard(
  id: number,
  updates: { front_md: string; back_md: string; tags: string[] }
): Promise<number> {
  const now = new Date().toISOString()
  return db.cards.update(id, {
    front_md: updates.front_md,
    back_md: updates.back_md,
    tags: updates.tags,
    updated_at: now
  })
}

export async function deleteCard(id: number): Promise<void> {
  await db.transaction('rw', db.cards, db.reviewStates, async () => {
    await db.cards.delete(id)
    await db.reviewStates.delete(id)
  })
}
