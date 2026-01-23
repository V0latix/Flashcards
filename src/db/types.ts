export type Card = {
  id?: number
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
  box: number
  due_date: string | null
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
