import db from './index'
import type { Deck, DeckSettings } from './types'

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
