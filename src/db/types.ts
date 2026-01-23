export type DeckSettings = {
  box1_target: number
  interval_days: Record<number, number>
}

export type Deck = {
  id?: number
  name: string
  created_at: string
  updated_at: string
  settings: DeckSettings
}

export type Card = {
  id?: number
  deck_id: number
  front_md: string
  back_md: string
  tags: string[]
  created_at: string
  updated_at: string
  suspended?: boolean
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
  deck_id: number
  box: number
  due_date: string
  last_reviewed_at?: string
}

export type ReviewLog = {
  id?: number
  card_id: number
  timestamp: string
  result: 'good' | 'bad'
  previous_box: number
  new_box: number
}
