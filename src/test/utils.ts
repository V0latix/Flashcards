import db from '../db'
import type { ReviewState } from '../db/types'

export const resetDb = async () => {
  await db.delete()
  await db.open()
}

export const seedCardWithState = async (input: {
  front: string
  back: string
  tags?: string[]
  createdAt: string
  box: number
  dueDate: string | null
  isLearned?: boolean
  learnedAt?: string | null
}) => {
  const cardId = await db.cards.add({
    front_md: input.front,
    back_md: input.back,
    tags: input.tags ?? [],
    created_at: input.createdAt,
    updated_at: input.createdAt
  })

  const state: ReviewState = {
    card_id: cardId,
    box: input.box,
    due_date: input.dueDate,
    is_learned: input.isLearned ?? false,
    learned_at: input.learnedAt ?? null
  }
  await db.reviewStates.add(state)

  return cardId
}
