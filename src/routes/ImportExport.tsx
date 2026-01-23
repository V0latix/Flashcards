import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import db from '../db'
import type { Card, Deck, MediaSide, ReviewLog, ReviewState } from '../db/types'

function ImportExport() {
  const { deckId = 'demo' } = useParams()
  const basePath = `/deck/${deckId}`
  const numericDeckId = Number(deckId)
  const [status, setStatus] = useState<string>('')

  type ExportMedia = {
    card_id: number
    side: MediaSide
    mime: string
    base64: string
  }

  type ExportPayload = {
    schema_version: number
    deck: Deck
    cards: Card[]
    reviewStates: ReviewState[]
    media: ExportMedia[]
    reviewLogs?: ReviewLog[]
  }

  const blobToBase64 = (blob: Blob): Promise<string> =>
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

  const base64ToBlob = (base64: string, mime: string): Blob => {
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  }

  const downloadJson = (payload: ExportPayload) => {
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json'
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `deck-${payload.deck.id ?? 'export'}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    if (!Number.isFinite(numericDeckId)) {
      setStatus('Deck invalide.')
      return
    }
    setStatus('Export en cours...')
    const deck = await db.decks.get(numericDeckId)
    if (!deck) {
      setStatus('Deck introuvable.')
      return
    }
    const [cards, reviewStates, media, reviewLogs] = await Promise.all([
      db.cards.where('deck_id').equals(numericDeckId).toArray(),
      db.reviewStates.where('deck_id').equals(numericDeckId).toArray(),
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
      deck,
      cards,
      reviewStates,
      media: exportMedia,
      reviewLogs: filteredLogs
    }

    downloadJson(payload)
    setStatus('Export termine.')
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }
    setStatus('Import en cours...')
    try {
      const text = await file.text()
      const payload = JSON.parse(text) as ExportPayload
      const now = new Date().toISOString()

      if (payload.schema_version !== 1) {
        throw new Error('Schema version non supportee')
      }

      await db.transaction(
        'rw',
        db.decks,
        db.cards,
        db.reviewStates,
        db.media,
        db.reviewLogs,
        async () => {
          const deckData = payload.deck
          const newDeckId = await db.decks.add({
            name: deckData?.name ?? 'Imported deck',
            created_at: deckData?.created_at ?? now,
            updated_at: deckData?.updated_at ?? now,
            settings: deckData?.settings ?? {
              box1_target: 10,
              interval_days: { 1: 1, 2: 3, 3: 7, 4: 15, 5: 30 }
            }
          })

          const idMap = new Map<number, number>()
          for (const card of payload.cards ?? []) {
            if (!card.id) {
              continue
            }
            const newCardId = await db.cards.add({
              deck_id: newDeckId,
              front_md: card.front_md,
              back_md: card.back_md,
              tags: card.tags ?? [],
              created_at: card.created_at ?? now,
              updated_at: card.updated_at ?? now,
              suspended: card.suspended
            })
            idMap.set(card.id, newCardId)
          }

          const reviewStates = (payload.reviewStates ?? [])
            .map((state) => {
              const newCardId = idMap.get(state.card_id)
              if (!newCardId) {
                return null
              }
              return {
                card_id: newCardId,
                deck_id: newDeckId,
                box: state.box,
                due_date: state.due_date ?? null,
                last_reviewed_at: state.last_reviewed_at
              }
            })
            .filter(Boolean) as ReviewState[]

          if (reviewStates.length > 0) {
            await db.reviewStates.bulkPut(reviewStates)
          }

          const mediaItems = (payload.media ?? [])
            .map((item) => {
              const newCardId = idMap.get(item.card_id)
              if (!newCardId) {
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
          }

          const reviewLogs = (payload.reviewLogs ?? [])
            .map((log) => {
              const newCardId = idMap.get(log.card_id)
              if (!newCardId) {
                return null
              }
              return {
                card_id: newCardId,
                timestamp: log.timestamp,
                result: log.result,
                previous_box: log.previous_box,
                new_box: log.new_box
              }
            })
            .filter(Boolean) as ReviewLog[]

          if (reviewLogs.length > 0) {
            await db.reviewLogs.bulkAdd(reviewLogs)
          }
        }
      )

      setStatus('Import termine.')
      event.target.value = ''
    } catch (error) {
      setStatus(`Erreur import: ${(error as Error).message}`)
    }
  }

  return (
    <main>
      <h1>Import/Export</h1>
      <p>Deck: {deckId}</p>
      <section>
        <button type="button" onClick={handleExport}>
          Exporter le deck
        </button>
      </section>
      <section>
        <label htmlFor="import-json">Importer un deck</label>
        <input id="import-json" type="file" accept="application/json" onChange={handleImport} />
      </section>
      {status ? <p>{status}</p> : null}
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to={basePath}>Deck dashboard</Link>
          </li>
          <li>
            <Link to={`${basePath}/review`}>Review session</Link>
          </li>
          <li>
            <Link to={`${basePath}/library`}>Library</Link>
          </li>
          <li>
            <Link to={`${basePath}/card/new`}>New card</Link>
          </li>
          <li>
            <Link to={`${basePath}/stats`}>Stats</Link>
          </li>
          <li>
            <Link to={`${basePath}/settings`}>Settings</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default ImportExport
