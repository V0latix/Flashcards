import { useState } from 'react'
import db from '../db'
import type { ReviewLog, ReviewState } from '../db/types'
import { createUuid, getDeviceId } from '../sync/ids'
import { markLocalChange } from '../sync/queue'
import { useI18n } from '../i18n/useI18n'
import { blobToBase64, downloadJson, type ExportMedia, type ExportPayload } from '../utils/export'

function ImportExport() {
  const { t } = useI18n()
  const [status, setStatus] = useState<string>('')
  const [summary, setSummary] = useState<{
    parsed_cards: number
    inserted_cards: number
    inserted_reviewstates: number
    inserted_media: number
    skipped: number
    errors: string[]
  } | null>(null)

  type ImportCard = {
    id?: string | number
    front_md?: string
    back_md?: string
    front?: string
    back?: string
    tags?: string[]
  }

  const base64ToBlob = (base64: string, mime: string): Blob => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  }

  const generateId = () => {
    if (crypto && 'randomUUID' in crypto && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
  }

  const handleExport = async () => {
    setStatus(t('importExport.exportInProgress'))
    const [cards, reviewStates, media, reviewLogs] = await Promise.all([
      db.cards.toArray(),
      db.reviewStates.toArray(),
      db.media.toArray(),
      db.reviewLogs.toArray()
    ])

    const deckCardIds = new Set(cards.map((card) => card.id).filter(Boolean) as number[])

    const filteredMedia = media.filter((item) => deckCardIds.has(item.card_id))
    const exportMedia: ExportMedia[] = []
    for (const item of filteredMedia) {
      const base64 = await blobToBase64(item.blob)
      exportMedia.push({
        card_id: item.card_id,
        side: item.side,
        mime: item.mime,
        base64
      })
    }

    const filteredLogs = reviewLogs.filter((log) => deckCardIds.has(log.card_id))

    const payload: ExportPayload = {
      schema_version: 1,
      cards,
      reviewStates,
      media: exportMedia,
      reviewLogs: filteredLogs
    }

    downloadJson(payload)
    setStatus(t('importExport.exportDone'))
  }

  const parsePayload = (payload: unknown) => {
    const errors: string[] = []
    let cards: ImportCard[] = []
    let reviewStates: ReviewState[] = []
    let media: ExportMedia[] = []
    let reviewLogs: ReviewLog[] = []

    if (Array.isArray(payload)) {
      cards = payload as ImportCard[]
    } else if (payload && typeof payload === 'object') {
      const container = payload as Partial<ExportPayload> & { cards?: ImportCard[] }
      if ('schema_version' in container && container.schema_version !== 1) {
        errors.push(t('importExport.schemaUnsupported'))
      }
      if (Array.isArray(container.cards)) {
        cards = container.cards
      }
      if (Array.isArray(container.reviewStates)) {
        reviewStates = container.reviewStates
      }
      if (Array.isArray(container.media)) {
        media = container.media
      }
      if (Array.isArray(container.reviewLogs)) {
        reviewLogs = container.reviewLogs
      }
    } else {
      errors.push(t('importExport.jsonUnsupported'))
    }

    return { cards, reviewStates, media, reviewLogs, errors }
  }

  const runImport = async (payload: unknown) => {
    setSummary(null)
    setStatus(t('importExport.importInProgress'))

    const {
      cards: rawCards,
      reviewStates: rawReviewStates,
      media: rawMedia,
      reviewLogs: rawReviewLogs,
      errors: parseErrors
    } = parsePayload(payload)

    const errors: string[] = [...parseErrors]
    const usedIds = new Set<string>()
    const normalizedCards: Array<{
      sourceId: string
      front_md: string
      back_md: string
      tags: string[]
    }> = []
    let skipped = 0

    rawCards.forEach((card, index) => {
      const front = card.front_md ?? card.front
      const back = card.back_md ?? card.back
      if (!front || !back) {
        skipped += 1
        errors.push(t('importExport.missingFrontBack', { index: index + 1 }))
        return
      }

      const rawId = card.id ?? generateId()
      let sourceId = String(rawId)
      if (usedIds.has(sourceId)) {
        sourceId = generateId()
        errors.push(t('importExport.duplicateId', { index: index + 1 }))
      }
      usedIds.add(sourceId)

      const tags = Array.isArray(card.tags) ? card.tags.map((tag) => String(tag)) : []

      normalizedCards.push({ sourceId, front_md: front, back_md: back, tags })
    })

    const reviewStateBySourceId = new Map<string, ReviewState>()
    rawReviewStates.forEach((state) => {
      reviewStateBySourceId.set(String(state.card_id), state)
    })

    const cardsBefore = await db.cards.count()
    const reviewStatesBefore = await db.reviewStates.count()
    console.log('Import debug (before):', {
      cards_before: cardsBefore,
      reviewstates_before: reviewStatesBefore
    })

    let insertedCards = 0
    let insertedReviewStates = 0
    let insertedMedia = 0

    try {
      await db.transaction(
        'rw',
        db.cards,
        db.reviewStates,
        db.media,
        async () => {
          const idMap = new Map<string, number>()

          for (const card of normalizedCards) {
            const now = new Date().toISOString()
            const newCardId = await db.cards.add({
              front_md: card.front_md,
              back_md: card.back_md,
              tags: card.tags,
              suspended: false,
              created_at: now,
              updated_at: now,
              source_type: 'manual',
              source_id: null,
              source_ref: null,
              cloud_id: null,
              synced_at: null
            })
            idMap.set(card.sourceId, newCardId)
            insertedCards += 1
          }

          const reviewStatesToInsert: ReviewState[] = []
          normalizedCards.forEach((card) => {
            const newCardId = idMap.get(card.sourceId)
            if (!newCardId) {
              return
            }
            const providedState = reviewStateBySourceId.get(card.sourceId)
            reviewStatesToInsert.push({
              card_id: newCardId,
              box: providedState?.box ?? 0,
              due_date: providedState?.due_date ?? null,
              last_reviewed_at: providedState?.last_reviewed_at ?? null,
              is_learned: providedState?.is_learned ?? false,
              learned_at: providedState?.learned_at ?? null,
              updated_at: new Date().toISOString()
            })
          })

          if (reviewStatesToInsert.length > 0) {
            await db.reviewStates.bulkPut(reviewStatesToInsert)
            insertedReviewStates = reviewStatesToInsert.length
          }

          const mediaItems = rawMedia
            .map((item) => {
              const newCardId = idMap.get(String(item.card_id))
              if (!newCardId) {
                skipped += 1
                errors.push('Media ignore: card_id introuvable')
                return null
              }
              return {
                card_id: newCardId,
                side: item.side,
                mime: item.mime,
                blob: base64ToBlob(item.base64, item.mime)
              }
            })
            .filter(Boolean) as Array<{
            card_id: number
            side: MediaSide
            mime: string
            blob: Blob
          }>

          if (mediaItems.length > 0) {
            await db.media.bulkAdd(mediaItems)
            insertedMedia = mediaItems.length
          }

          const reviewLogs = rawReviewLogs
            .map((log) => {
              const newCardId = idMap.get(String(log.card_id))
              if (!newCardId) {
                skipped += 1
                errors.push('ReviewLog ignore: card_id introuvable')
                return null
              }
              return {
                card_id: newCardId,
                timestamp: log.timestamp,
                result: log.result,
                previous_box: log.previous_box,
                new_box: log.new_box,
                was_learned_before: log.was_learned_before,
                was_reversed: log.was_reversed,
                client_event_id: createUuid(),
                device_id: getDeviceId()
              }
            })
            .filter(Boolean) as ReviewLog[]

          if (reviewLogs.length > 0) {
            await db.reviewLogs.bulkAdd(reviewLogs)
          }
        }
      )
    } catch (error) {
      errors.push((error as Error).message)
    }

    const cardsAfter = await db.cards.count()
    const reviewStatesAfter = await db.reviewStates.count()
    console.log('Import debug (after):', {
      cards_after: cardsAfter,
      reviewstates_after: reviewStatesAfter
    })

    const nextSummary = {
      parsed_cards: rawCards.length,
      inserted_cards: insertedCards,
      inserted_reviewstates: insertedReviewStates,
      inserted_media: insertedMedia,
      skipped,
      errors
    }
    setSummary(nextSummary)

    if (insertedCards === 0) {
      const reason = errors.length > 0 ? errors[0] : t('importExport.noValidCards')
      setStatus(t('importExport.importNoInsert', { reason }))
      return
    }

    setStatus(t('importExport.importDone'))
    markLocalChange()
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    try {
      const text = await file.text()
      const payload = JSON.parse(text)
      await runImport(payload)
      event.target.value = ''
    } catch (error) {
      setStatus(t('importExport.importError', { message: (error as Error).message }))
    }
  }

  const handleDebugImport = async () => {
    const payload = {
      cards: [
        { front: 'Capitale France', back: 'Paris', tags: ['geo'] },
        { front: 'Capitale Italie', back: 'Rome', tags: ['geo'] },
        { front: 'Capitale Espagne', back: 'Madrid', tags: ['geo'] }
      ]
    }
    await runImport(payload)
  }

  return (
    <main className="container page">
      <h1>{t('importExport.title')}</h1>
      <section>
        <button type="button" onClick={handleExport}>
          {t('importExport.exportPool')}
        </button>
      </section>
      <section>
        <label htmlFor="import-json">{t('importExport.importPool')}</label>
        <input id="import-json" type="file" accept="application/json" onChange={handleImport} />
        <button type="button" onClick={handleDebugImport}>
          {t('importExport.importSample')}
        </button>
      </section>
      {status ? <p>{status}</p> : null}
      {summary ? (
        <section>
          <h2>{t('importExport.summary')}</h2>
          <ul>
            <li>parsed_cards: {summary.parsed_cards}</li>
            <li>inserted_cards: {summary.inserted_cards}</li>
            <li>inserted_reviewstates: {summary.inserted_reviewstates}</li>
            <li>inserted_media: {summary.inserted_media}</li>
            <li>skipped: {summary.skipped}</li>
            <li>errors: {summary.errors.length}</li>
          </ul>
          {summary.errors.length > 0 ? (
            <pre>{summary.errors.join('\n')}</pre>
          ) : null}
        </section>
      ) : null}
    </main>
  )
}

export default ImportExport
