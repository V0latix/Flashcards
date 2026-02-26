import type { Card, MediaSide, ReviewLog, ReviewState } from '../db/types'

export type ExportMedia = {
  card_id: number
  side: MediaSide
  mime: string
  base64: string
}

export type ExportPayload = {
  schema_version: number
  cards: Card[]
  reviewStates: ReviewState[]
  media: ExportMedia[]
  reviewLogs?: ReviewLog[]
}

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Failed to read blob'))
    reader.onload = () => {
      const result = reader.result
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? ''
        resolve(base64)
        return
      }
      reject(new Error('Unexpected reader result'))
    }
    reader.readAsDataURL(blob)
  })

export const downloadJson = (
  payload: ExportPayload,
  fileName = 'cards-export.json'
) => {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json'
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  URL.revokeObjectURL(url)
}
