import Dexie, { type Table } from 'dexie'
import type { Card, Deck, Media, ReviewLog, ReviewState } from './types'

class FlashcardsDB extends Dexie {
  decks!: Table<Deck, number>
  cards!: Table<Card, number>
  media!: Table<Media, number>
  reviewStates!: Table<ReviewState, number>
  reviewLogs!: Table<ReviewLog, number>

  constructor() {
    super('flashcards')

    this.version(1).stores({
      decks: '++id, name, created_at, updated_at',
      cards: '++id, deck_id, created_at, updated_at',
      media: '++id, card_id, side',
      reviewStates: 'card_id, deck_id, box, due_date',
      reviewLogs: '++id, card_id, timestamp'
    })
  }
}

const db = new FlashcardsDB()

export default db
