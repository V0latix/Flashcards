import db from './index'
import type { Card, Deck, DeckSettings } from './types'

const defaultSettings: DeckSettings = {
  box1_target: 10,
  interval_days: {
    1: 1,
    2: 3,
    3: 7,
    4: 15,
    5: 30
  }
}

export async function listDecks(): Promise<Deck[]> {
  return db.decks.orderBy('updated_at').reverse().toArray()
}

export async function getDeckById(id: number): Promise<Deck | undefined> {
  return db.decks.get(id)
}

export async function createDeck(name: string): Promise<number> {
  const now = new Date().toISOString()
  return db.decks.add({
    name,
    created_at: now,
    updated_at: now,
    settings: defaultSettings
  })
}

export async function renameDeck(id: number, name: string): Promise<number> {
  const now = new Date().toISOString()
  return db.decks.update(id, { name, updated_at: now })
}

export async function deleteDeck(id: number): Promise<void> {
  await db.decks.delete(id)
}

export async function listCardsByDeck(deckId: number): Promise<Card[]> {
  return db.cards.where('deck_id').equals(deckId).toArray()
}

export async function getCardById(id: number): Promise<Card | undefined> {
  return db.cards.get(id)
}

export async function createCard(input: {
  deck_id: number
  front_md: string
  back_md: string
  tags?: string[]
}): Promise<number> {
  const now = new Date().toISOString()
  const tags = input.tags ?? []

  return db.transaction('rw', db.cards, db.reviewStates, async () => {
    const cardId = await db.cards.add({
      deck_id: input.deck_id,
      front_md: input.front_md,
      back_md: input.back_md,
      tags,
      created_at: now,
      updated_at: now
    })

    await db.reviewStates.add({
      card_id: cardId,
      deck_id: input.deck_id,
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
