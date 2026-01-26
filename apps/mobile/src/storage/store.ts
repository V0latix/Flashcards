import AsyncStorage from '@react-native-async-storage/async-storage'

type StoredPack = {
  id: number | string
  slug: string
  title: string | null
  description: string | null
  tags: string[]
  downloaded_at: string
  card_ids: number[]
}

type StoredCard = {
  id: number
  front_md: string
  back_md: string
  hint_md: string | null
  tags: string[]
  created_at: string
  updated_at: string
  source: string | null
  source_type: string | null
  source_id: string | null
}

type ReviewState = {
  card_id: number
  box: number
  due_date: string | null
  last_reviewed_at: string | null
  is_learned: boolean
  learned_at: string | null
}

type ReviewLog = {
  id: number
  card_id: number
  timestamp: string
  result: 'good' | 'bad'
  previous_box: number
  new_box: number
  was_learned_before: boolean
  was_reversed: boolean
}

type Store = {
  version: 1
  nextCardId: number
  nextReviewLogId: number
  cards: StoredCard[]
  reviewStates: ReviewState[]
  reviewLogs: ReviewLog[]
  packs: StoredPack[]
}

export type PackSnapshotInput = {
  id: number | string
  slug: string
  title?: string | null
  description?: string | null
  tags?: string[]
}

export type CardSnapshotInput = {
  front_md: string
  back_md: string
  hint_md?: string | null
  tags?: string[]
  source?: string | null
  source_type?: string | null
  source_id?: string | null
}

const STORAGE_KEY = 'flashcards_mobile_store_v1'

// AsyncStorage is good enough for v0; versioning keeps a migration path to SQLite.
const createEmptyStore = (): Store => ({
  version: 1,
  nextCardId: 1,
  nextReviewLogId: 1,
  cards: [],
  reviewStates: [],
  reviewLogs: [],
  packs: []
})

let cached: Store | null = null

const normalizeStore = (input: unknown): Store => {
  if (!input || typeof input !== 'object') {
    return createEmptyStore()
  }
  const raw = input as Partial<Store>
  if (raw.version !== 1) {
    return createEmptyStore()
  }
  return {
    version: 1,
    nextCardId: typeof raw.nextCardId === 'number' ? raw.nextCardId : 1,
    nextReviewLogId:
      typeof raw.nextReviewLogId === 'number' ? raw.nextReviewLogId : 1,
    cards: Array.isArray(raw.cards) ? raw.cards : [],
    reviewStates: Array.isArray(raw.reviewStates) ? raw.reviewStates : [],
    reviewLogs: Array.isArray(raw.reviewLogs) ? raw.reviewLogs : [],
    packs: Array.isArray(raw.packs) ? raw.packs : []
  }
}

const loadStore = async (): Promise<Store> => {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return createEmptyStore()
    }
    return normalizeStore(JSON.parse(raw))
  } catch {
    return createEmptyStore()
  }
}

const persistStore = async (store: Store): Promise<void> => {
  cached = store
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}

const withStore = async <T>(update: (store: Store) => T | Promise<T>): Promise<T> => {
  const store = await getStore()
  const result = await update(store)
  await persistStore(store)
  return result
}

export const getStore = async (): Promise<Store> => {
  if (cached) {
    return cached
  }
  const store = await loadStore()
  cached = store
  return store
}

export const resetStore = async (): Promise<void> => {
  cached = createEmptyStore()
  await AsyncStorage.removeItem(STORAGE_KEY)
}

export const listCards = async (): Promise<StoredCard[]> => {
  const store = await getStore()
  return [...store.cards]
}

export const listPacks = async (): Promise<StoredPack[]> => {
  const store = await getStore()
  return [...store.packs]
}

export const listReviewStates = async (): Promise<ReviewState[]> => {
  const store = await getStore()
  return [...store.reviewStates]
}

export const listReviewLogs = async (): Promise<ReviewLog[]> => {
  const store = await getStore()
  return [...store.reviewLogs]
}

export const getCardById = async (id: number): Promise<StoredCard | undefined> => {
  const store = await getStore()
  return store.cards.find((card) => card.id === id)
}

export const upsertReviewState = async (state: ReviewState): Promise<void> => {
  await withStore((store) => {
    const index = store.reviewStates.findIndex((entry) => entry.card_id === state.card_id)
    if (index >= 0) {
      store.reviewStates[index] = state
    } else {
      store.reviewStates.push(state)
    }
  })
}

export const addReviewLog = async (entry: Omit<ReviewLog, 'id'>): Promise<number> =>
  withStore((store) => {
    const id = store.nextReviewLogId
    store.nextReviewLogId += 1
    store.reviewLogs.push({ id, ...entry })
    return id
  })

export const savePackSnapshot = async (
  pack: PackSnapshotInput,
  cards: CardSnapshotInput[]
): Promise<{ imported: number; alreadyPresent: number; cardIds: number[] }> =>
  withStore((store) => {
    const now = new Date().toISOString()
    const existingBySource = new Map<string, number>()
    store.cards.forEach((card) => {
      if (card.source_type && card.source_id) {
        existingBySource.set(`${card.source_type}:${card.source_id}`, card.id)
      }
    })

    const reviewStateByCard = new Set(store.reviewStates.map((state) => state.card_id))
    const cardIds: number[] = []
    let imported = 0
    let alreadyPresent = 0

    cards.forEach((card) => {
      const sourceType = card.source_type ?? null
      const sourceId = card.source_id ?? null
      const sourceKey =
        sourceType && sourceId ? `${sourceType}:${sourceId}` : null

      if (sourceKey && existingBySource.has(sourceKey)) {
        const existingId = existingBySource.get(sourceKey) as number
        cardIds.push(existingId)
        alreadyPresent += 1
        if (!reviewStateByCard.has(existingId)) {
          store.reviewStates.push({
            card_id: existingId,
            box: 0,
            due_date: null,
            last_reviewed_at: null,
            is_learned: false,
            learned_at: null
          })
        }
        return
      }

      const id = store.nextCardId
      store.nextCardId += 1
      store.cards.push({
        id,
        front_md: card.front_md,
        back_md: card.back_md,
        hint_md: card.hint_md ?? null,
        tags: card.tags ?? [],
        created_at: now,
        updated_at: now,
        source: card.source ?? null,
        source_type: sourceType,
        source_id: sourceId
      })
      store.reviewStates.push({
        card_id: id,
        box: 0,
        due_date: null,
        last_reviewed_at: null,
        is_learned: false,
        learned_at: null
      })
      if (sourceKey) {
        existingBySource.set(sourceKey, id)
      }
      cardIds.push(id)
      imported += 1
    })

    const packEntry: StoredPack = {
      id: pack.id,
      slug: pack.slug,
      title: pack.title ?? null,
      description: pack.description ?? null,
      tags: pack.tags ?? [],
      downloaded_at: now,
      card_ids: cardIds
    }

    const packIndex = store.packs.findIndex((entry) => entry.slug === pack.slug)
    if (packIndex >= 0) {
      store.packs[packIndex] = packEntry
    } else {
      store.packs.push(packEntry)
    }

    return { imported, alreadyPresent, cardIds }
  })

const matchesTag = (tags: string[], tag: string, includeDescendants: boolean) => {
  if (includeDescendants) {
    return tags.some((entry) => entry === tag || entry.startsWith(`${tag}/`))
  }
  return tags.some((entry) => entry === tag)
}

export const deleteCard = async (cardId: number): Promise<void> => {
  await withStore((store) => {
    store.cards = store.cards.filter((card) => card.id !== cardId)
    store.reviewStates = store.reviewStates.filter((state) => state.card_id !== cardId)
    store.reviewLogs = store.reviewLogs.filter((log) => log.card_id !== cardId)
    store.packs = store.packs.map((pack) => ({
      ...pack,
      card_ids: pack.card_ids.filter((id) => id !== cardId)
    }))
  })
}

export const deleteCardsByTag = async (
  tag: string,
  includeDescendants: boolean
): Promise<number> =>
  withStore((store) => {
    const targetIds = new Set(
      store.cards
        .filter((card) => matchesTag(card.tags, tag, includeDescendants))
        .map((card) => card.id)
    )

    if (targetIds.size === 0) {
      return 0
    }

    store.cards = store.cards.filter((card) => !targetIds.has(card.id))
    store.reviewStates = store.reviewStates.filter((state) => !targetIds.has(state.card_id))
    store.reviewLogs = store.reviewLogs.filter((log) => !targetIds.has(log.card_id))
    store.packs = store.packs.map((pack) => ({
      ...pack,
      card_ids: pack.card_ids.filter((id) => !targetIds.has(id))
    }))

    return targetIds.size
  })

export const deleteAll = async (): Promise<void> => {
  await withStore((store) => {
    store.cards = []
    store.reviewStates = []
    store.reviewLogs = []
    store.packs = []
    store.nextCardId = 1
    store.nextReviewLogId = 1
  })
}

export type { StoredPack, StoredCard, ReviewState, ReviewLog, Store }
