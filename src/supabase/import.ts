import db from '../db'
import { listPublicCardsByPackSlug } from './api'
import { markLocalChange } from '../sync/queue'

export async function importPackToLocal(
  packSlug: string
): Promise<{ imported: number; alreadyPresent: number }> {
  const cards = await listPublicCardsByPackSlug(packSlug)
  const sourceType = 'supabase_public'
  const source = 'supabase'

  const existing = await db.cards.where('source_type').equals(sourceType).toArray()
  const existingIds = new Set(
    existing
      .map((card) => card.source_id)
      .filter((value): value is string => typeof value === 'string')
  )

  let imported = 0
  let alreadyPresent = 0

  await db.transaction('rw', db.cards, db.reviewStates, async () => {
    for (const card of cards) {
      const sourceId = card.id
      if (existingIds.has(sourceId)) {
        alreadyPresent += 1
        continue
      }

      const now = new Date().toISOString()
      const newCardId = await db.cards.add({
        front_md: card.front_md,
        back_md: card.back_md,
        tags: card.tags ?? [],
        suspended: false,
        created_at: now,
        updated_at: now,
        source,
        source_type: sourceType,
        source_id: sourceId,
        source_ref: packSlug,
        cloud_id: null,
        synced_at: null
      })

      await db.reviewStates.add({
        card_id: newCardId,
        box: 0,
        due_date: null,
        updated_at: now,
        last_reviewed_at: null,
        is_learned: false,
        learned_at: null
      })

      imported += 1
    }
  })

  if (imported > 0) {
    markLocalChange()
  }

  return { imported, alreadyPresent }
}
