export type Card = {
  id?: number
  front_md: string
  back_md: string
  hint_md?: string | null
  tags: string[]
  created_at: string
  updated_at: string
  suspended?: boolean
  source?: string | null
  source_type?: string | null
  source_id?: string | null
  source_ref?: string | null
  cloud_id?: string | null
  synced_at?: string | null
}

export type MediaSide = 'front' | 'back' | 'both'

export type Media = {
  id?: number
  card_id: number
  side: MediaSide
  mime: string
  blob: Blob
}

export type ReviewState = {
  card_id: number
  box: number
  due_date: string | null
  last_reviewed_at?: string | null
  is_learned?: boolean
  learned_at?: string | null
  updated_at?: string | null
}

export type ReviewLog = {
  id?: number
  card_id: number
  timestamp: string
  result: 'good' | 'bad'
  previous_box: number
  new_box: number
  was_learned_before?: boolean
  was_reversed?: boolean
  client_event_id?: string | null
  device_id?: string | null
}
