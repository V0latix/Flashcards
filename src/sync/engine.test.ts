import { beforeEach, describe, expect, it, vi } from 'vitest'
import db from '../db'
import { resetDb } from '../test/utils'
import { runInitialSync, syncOnce } from './engine'
import {
  fetchRemoteSnapshot,
  upsertRemoteCards,
  upsertRemoteProgress
} from './remoteStore'

vi.mock('./remoteStore', () => ({
  fetchRemoteSnapshot: vi.fn(),
  upsertRemoteCards: vi.fn(),
  upsertRemoteProgress: vi.fn(),
  upsertRemoteSettings: vi.fn(),
  insertRemoteReviewLogs: vi.fn(),
  deleteRemoteCards: vi.fn()
}))

const emptyRemote = {
  cards: [],
  progress: [],
  settings: null,
  reviewLogs: []
}

describe('sync engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    localStorage.clear()
    await resetDb()
  })

  it('pushes local cards to remote when remote is empty', async () => {
    const now = new Date('2026-01-01T00:00:00.000Z').toISOString()
    const cardId = await db.cards.add({
      front_md: 'Q',
      back_md: 'A',
      tags: [],
      created_at: now,
      updated_at: now,
      source_type: null,
      source_id: null,
      source_ref: null,
      cloud_id: null
    })
    await db.reviewStates.add({
      card_id: cardId,
      box: 0,
      due_date: null,
      is_learned: false,
      learned_at: null,
      updated_at: now
    })

    vi.mocked(fetchRemoteSnapshot).mockResolvedValue(emptyRemote)

    await runInitialSync('user-1')

    expect(upsertRemoteCards).toHaveBeenCalledTimes(1)
    const cardsPayload = vi.mocked(upsertRemoteCards).mock.calls[0][0]
    expect(cardsPayload).toHaveLength(1)
    expect(cardsPayload[0].user_id).toBe('user-1')
    expect(cardsPayload[0].source_type).toBe('manual')

    expect(upsertRemoteProgress).toHaveBeenCalledTimes(1)
    const progressPayload = vi.mocked(upsertRemoteProgress).mock.calls[0][0]
    expect(progressPayload).toHaveLength(1)
    expect(progressPayload[0].card_id).toBe(cardsPayload[0].id)

    const stored = await db.cards.get(cardId)
    expect(stored?.cloud_id).toBeTruthy()
  })

  it('removes local cards missing remotely if unchanged since last sync', async () => {
    const updatedAt = '2025-12-31T00:00:00.000Z'
    const cardId = await db.cards.add({
      front_md: 'Q',
      back_md: 'A',
      tags: [],
      created_at: updatedAt,
      updated_at: updatedAt,
      source_type: 'manual',
      source_id: null,
      source_ref: null,
      cloud_id: 'cloud-1'
    })
    await db.reviewStates.add({
      card_id: cardId,
      box: 1,
      due_date: null,
      is_learned: false,
      learned_at: null,
      updated_at: updatedAt
    })

    localStorage.setItem('flashcards_last_sync_at', '2026-01-01T00:00:00.000Z')
    vi.mocked(fetchRemoteSnapshot).mockResolvedValue(emptyRemote)

    await syncOnce('user-1', true)

    const count = await db.cards.count()
    expect(count).toBe(0)

    const cardsPayload = vi.mocked(upsertRemoteCards).mock.calls[0]?.[0] ?? []
    expect(cardsPayload).toHaveLength(0)
  })
})
