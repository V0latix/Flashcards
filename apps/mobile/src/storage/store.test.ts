import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map<string, string>()

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(memory.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      memory.set(key, value)
      return Promise.resolve()
    }),
    removeItem: vi.fn((key: string) => {
      memory.delete(key)
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      memory.clear()
      return Promise.resolve()
    })
  }
}))

import {
  addReviewLog,
  deleteCard,
  deleteCardsByTag,
  listCards,
  listPacks,
  listReviewLogs,
  listReviewStates,
  resetStore,
  savePackSnapshot
} from './store'

describe('store', () => {
  beforeEach(async () => {
    memory.clear()
    await resetStore()
  })

  it('saves pack snapshots and deduplicates by source', async () => {
    const first = await savePackSnapshot(
      { id: 1, slug: 'geo', title: 'Geo', tags: ['Geo'] },
      [
        {
          front_md: 'Q1',
          back_md: 'A1',
          tags: ['Geo/Capitals'],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: '1'
        },
        {
          front_md: 'Q2',
          back_md: 'A2',
          tags: ['Geo/Flags'],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: '2'
        }
      ]
    )

    expect(first.imported).toBe(2)
    expect(first.alreadyPresent).toBe(0)
    expect(first.cardIds).toHaveLength(2)

    const cards = await listCards()
    const states = await listReviewStates()
    const packs = await listPacks()

    expect(cards).toHaveLength(2)
    expect(states).toHaveLength(2)
    expect(packs).toHaveLength(1)
    expect(packs[0].slug).toBe('geo')
    expect(packs[0].card_ids).toHaveLength(2)

    const second = await savePackSnapshot(
      { id: 1, slug: 'geo', title: 'Geo', tags: ['Geo'] },
      [
        {
          front_md: 'Q1',
          back_md: 'A1',
          tags: ['Geo/Capitals'],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: '1'
        },
        {
          front_md: 'Q2',
          back_md: 'A2',
          tags: ['Geo/Flags'],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: '2'
        }
      ]
    )

    expect(second.imported).toBe(0)
    expect(second.alreadyPresent).toBe(2)
    expect((await listCards()).length).toBe(2)
  })

  it('deletes cards by tag with descendants', async () => {
    await savePackSnapshot(
      { id: 1, slug: 'geo', title: 'Geo', tags: ['Geo'] },
      [
        {
          front_md: 'Q1',
          back_md: 'A1',
          tags: ['Geo/Capitals'],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: '1'
        },
        {
          front_md: 'Q2',
          back_md: 'A2',
          tags: ['Geo/Flags'],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: '2'
        }
      ]
    )

    const removed = await deleteCardsByTag('Geo', true)
    expect(removed).toBe(2)
    expect((await listCards()).length).toBe(0)
    expect((await listReviewStates()).length).toBe(0)
    expect((await listPacks())[0].card_ids).toHaveLength(0)
  })

  it('deletes review logs when a card is removed', async () => {
    const snapshot = await savePackSnapshot(
      { id: 1, slug: 'geo', title: 'Geo', tags: ['Geo'] },
      [
        {
          front_md: 'Q1',
          back_md: 'A1',
          tags: ['Geo/Capitals'],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: '1'
        }
      ]
    )
    const cardId = snapshot.cardIds[0]

    await addReviewLog({
      card_id: cardId,
      timestamp: new Date().toISOString(),
      result: 'good',
      previous_box: 1,
      new_box: 2,
      was_learned_before: false,
      was_reversed: false
    })

    expect((await listReviewLogs()).length).toBe(1)
    await deleteCard(cardId)
    expect((await listReviewLogs()).length).toBe(0)
  })
})
