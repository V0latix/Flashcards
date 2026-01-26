import type { Card, ReviewLog, ReviewState } from '../db/types'
import type { LeitnerSettings } from '../leitner/settings'

export type LocalSnapshot = {
  cards: Card[]
  reviewStates: ReviewState[]
  reviewLogs: ReviewLog[]
  settings: LeitnerSettings
  settingsUpdatedAt: string | null
}

export type RemoteCard = {
  id: string
  user_id: string
  source_type: 'public_pack' | 'manual'
  source_ref: string | null
  source_public_id: string | null
  front_md: string
  back_md: string
  hint_md: string | null
  tags: string[]
  created_at: string
  updated_at: string
}

export type RemoteProgress = {
  user_id: string
  card_id: string
  box: number
  learned: boolean
  due_at: string | null
  last_reviewed_at: string | null
  correct_count: number
  wrong_count: number
  updated_at: string
}

export type RemoteSettings = {
  user_id: string
  box1_target: number
  intervals: Record<string, number>
  learned_review_interval_days: number
  reverse_probability: number
  updated_at: string
}

export type RemoteReviewLog = {
  id: string
  user_id: string
  card_id: string
  result: boolean
  reviewed_at: string
  device_id: string | null
  client_event_id: string
  created_at: string
}

export type RemoteSnapshot = {
  cards: RemoteCard[]
  progress: RemoteProgress[]
  settings: RemoteSettings | null
  reviewLogs: RemoteReviewLog[]
}
