import Dexie, { type Table } from 'dexie'
import type { Card, Media, ReviewLog, ReviewState } from './types'

class FlashcardsDB extends Dexie {
  cards!: Table<Card, number>
  media!: Table<Media, number>
  reviewStates!: Table<ReviewState, number>
  reviewLogs!: Table<ReviewLog, number>

  constructor() {
    super('flashcards')

    this.version(1).stores({
      cards: '++id, deck_id, created_at, updated_at',
      media: '++id, card_id, side',
      reviewStates: 'card_id, deck_id, box, due_date',
      reviewLogs: '++id, card_id, timestamp'
    })

    this.version(2)
      .stores({
        cards: '++id, created_at, updated_at',
        media: '++id, card_id, side',
        reviewStates: 'card_id, box, due_date',
        reviewLogs: '++id, card_id, timestamp'
      })
      .upgrade(async (tx) => {
        await tx.table('cards').toCollection().modify((card) => {
          if ('deck_id' in card) {
            delete card.deck_id
          }
        })
        await tx.table('reviewStates').toCollection().modify((state) => {
          if ('deck_id' in state) {
            delete state.deck_id
          }
        })
      })

    this.version(3)
      .stores({
        cards: '++id, created_at, updated_at, source, [source+source_id]',
        media: '++id, card_id, side',
        reviewStates: 'card_id, box, due_date',
        reviewLogs: '++id, card_id, timestamp'
      })
      .upgrade(async (tx) => {
        await tx.table('cards').toCollection().modify((card) => {
          if (!('source' in card)) {
            card.source = null
          }
          if (!('source_id' in card)) {
            card.source_id = null
          }
        })
      })

    this.version(4)
      .stores({
        cards: '++id, created_at, updated_at, source, [source+source_id]',
        media: '++id, card_id, side',
        reviewStates: 'card_id, box, due_date',
        reviewLogs: '++id, card_id, timestamp'
      })
      .upgrade(async (tx) => {
        await tx.table('cards').toCollection().modify((card) => {
          if (!('hint_md' in card)) {
            card.hint_md = null
          }
          if (!('source_type' in card)) {
            card.source_type = null
          }
          if (!('source_id' in card)) {
            card.source_id = null
          }
        })
      })

    this.version(5)
      .stores({
        cards: '++id, created_at, updated_at, source, [source+source_id]',
        media: '++id, card_id, side',
        reviewStates: 'card_id, box, due_date',
        reviewLogs: '++id, card_id, timestamp'
      })
      .upgrade(async (tx) => {
        await tx.table('reviewStates').toCollection().modify((state) => {
          if (!('is_learned' in state)) {
            state.is_learned = false
          }
          if (!('learned_at' in state)) {
            state.learned_at = null
          }
        })
      })

    this.version(6)
      .stores({
        cards:
          '++id, created_at, updated_at, source, source_type, source_id, [source+source_id], [source_type+source_id]',
        media: '++id, card_id, side',
        reviewStates: 'card_id, box, due_date',
        reviewLogs: '++id, card_id, timestamp'
      })
      .upgrade(async (tx) => {
        await tx.table('cards').toCollection().modify((card) => {
          if (!('source_type' in card)) {
            card.source_type = null
          }
        })
      })
  }
}

const db = new FlashcardsDB()

export default db
