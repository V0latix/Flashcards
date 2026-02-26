import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import db from '../db'
import { I18nProvider } from '../i18n/I18nProvider'
import Library from './Library'
import { resetDb, seedCardWithState } from '../test/utils'
import { consumeTrainingQueue } from '../utils/training'

const blobToText = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Unable to read blob'))
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.readAsText(blob)
  })

describe('Library delete by tag', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  beforeEach(() => {
    if (!URL.createObjectURL) {
      Object.defineProperty(URL, 'createObjectURL', {
        value: () => 'blob:test',
        configurable: true
      })
    }
    if (!URL.revokeObjectURL) {
      Object.defineProperty(URL, 'revokeObjectURL', {
        value: () => undefined,
        configurable: true
      })
    }
  })

  beforeEach(async () => {
    sessionStorage.clear()
    await resetDb()
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      tags: ['Geographie/Drapeaux/Monde'],
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })
    await seedCardWithState({
      front: 'Q2',
      back: 'A2',
      tags: ['Geographie/Drapeaux/Europe'],
      createdAt: '2024-01-02',
      box: 1,
      dueDate: '2024-01-01'
    })
    await seedCardWithState({
      front: 'Q3',
      back: 'A3',
      tags: ['Histoire/France'],
      createdAt: '2024-01-03',
      box: 1,
      dueDate: '2024-01-01'
    })
  })

  it('removes cards for selected tag including sub-tags', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Library />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText(/Bibliothèque/i)
    const tagButton = await screen.findByRole('button', { name: /Geographie/i })
    fireEvent.click(tagButton)
    fireEvent.click(
      screen.getByRole('button', { name: /Supprimer toutes les cartes de ce tag/i })
    )

    fireEvent.click(screen.getByLabelText(/Inclure les sous-tags/i))
    fireEvent.click(screen.getByLabelText(/Inclure les sous-tags/i))

    const dialog = screen.getByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Supprimer' }))

    await waitFor(async () => {
      const count = await db.cards.count()
      expect(count).toBe(1)
    })
  })

  it('exports only cards from current selected tag', async () => {
    const createObjectUrlSpy = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:library-test')
    const revokeObjectUrlSpy = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => undefined)
    const anchorClickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined)

    render(
      <I18nProvider>
        <MemoryRouter>
          <Library />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText(/Bibliothèque/i)
    const geographieTag = await screen.findByRole('button', { name: /Geographie/i })
    fireEvent.click(geographieTag)
    fireEvent.click(screen.getByRole('button', { name: /Exporter la sélection/i }))

    await waitFor(() => {
      expect(createObjectUrlSpy).toHaveBeenCalledTimes(1)
    })

    const blob = createObjectUrlSpy.mock.calls[0]?.[0]
    expect(blob).toBeInstanceOf(Blob)
    const blobText = await blobToText(blob as Blob)
    const payload = JSON.parse(blobText) as {
      cards: Array<{ front_md: string }>
      reviewStates: Array<{ box: number }>
      schema_version: number
    }

    expect(payload.schema_version).toBe(1)
    expect(payload.cards).toHaveLength(2)
    expect(payload.cards.map((card) => card.front_md)).toEqual(expect.arrayContaining(['Q1', 'Q2']))
    expect(payload.cards.map((card) => card.front_md)).not.toContain('Q3')
    expect(payload.reviewStates).toHaveLength(2)
    expect(anchorClickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectUrlSpy).toHaveBeenCalledTimes(1)
  })

  it('training mode respects active search filters', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Library />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText(/Bibliothèque/i)
    fireEvent.change(await screen.findByLabelText(/Recherche/i), {
      target: { value: 'Q2' }
    })

    fireEvent.click(screen.getByRole('button', { name: /entraînement/i }))

    const ids = consumeTrainingQueue()
    expect(ids).toHaveLength(1)
    const queuedCards = await Promise.all(ids.map((id) => db.cards.get(id)))
    const queuedFronts = queuedCards.map((card) => card?.front_md)
    expect(queuedFronts).toEqual(['Q2'])
  })

  it('search also matches tags', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Library />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText(/Bibliothèque/i)
    fireEvent.change(await screen.findByLabelText(/Recherche/i), {
      target: { value: 'Histoire' }
    })

    await waitFor(() => {
      expect(screen.getByText('Q3')).toBeInTheDocument()
      expect(screen.queryByText('Q1')).not.toBeInTheDocument()
      expect(screen.queryByText('Q2')).not.toBeInTheDocument()
    })
  })

  it('suspends a card and excludes it from training queue', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Library />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText(/Bibliothèque/i)
    const q1Card = (await screen.findByText('Q1')).closest('li')
    expect(q1Card).not.toBeNull()

    fireEvent.click(within(q1Card as HTMLElement).getByRole('button', { name: /Suspendre la carte/i }))

    await waitFor(() => {
      expect(
        within(q1Card as HTMLElement).getByRole('button', { name: /Réactiver la carte/i })
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /Session d'entraînement/i }))

    const ids = consumeTrainingQueue()
    const queuedCards = await Promise.all(ids.map((id) => db.cards.get(id)))
    const queuedFronts = queuedCards.map((card) => card?.front_md)
    expect(queuedFronts).toEqual(expect.arrayContaining(['Q2', 'Q3']))
    expect(queuedFronts).not.toContain('Q1')
  })

  it('filters cards by suspended status', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Library />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText(/Bibliothèque/i)
    const q1Card = (await screen.findByText('Q1')).closest('li')
    expect(q1Card).not.toBeNull()

    fireEvent.click(within(q1Card as HTMLElement).getByRole('button', { name: /Suspendre la carte/i }))

    await waitFor(() => {
      expect(
        within(q1Card as HTMLElement).getByRole('button', { name: /Réactiver la carte/i })
      ).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Suspendue \(\d+\)$/i }))

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument()
      expect(screen.queryByText('Q2')).not.toBeInTheDocument()
      expect(screen.queryByText('Q3')).not.toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /^Toutes$/i }))

    await waitFor(() => {
      expect(screen.getByText('Q1')).toBeInTheDocument()
      expect(screen.getByText('Q2')).toBeInTheDocument()
      expect(screen.getByText('Q3')).toBeInTheDocument()
    })
  })

  it('suspends and resumes all cards from current filter', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Library />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText(/Bibliothèque/i)
    fireEvent.click(await screen.findByRole('button', { name: /Geographie/i }))

    fireEvent.click(screen.getByRole('button', { name: /Suspendre la sélection/i }))

    await waitFor(async () => {
      const cards = await db.cards.toArray()
      const geographieCards = cards.filter((card) =>
        card.tags.some((tag) => tag.startsWith('Geographie'))
      )
      const histoireCards = cards.filter((card) =>
        card.tags.some((tag) => tag.startsWith('Histoire'))
      )
      expect(geographieCards.every((card) => card.suspended)).toBe(true)
      expect(histoireCards.some((card) => card.suspended)).toBe(false)
    })

    fireEvent.click(screen.getByRole('button', { name: /Réactiver la sélection/i }))

    await waitFor(async () => {
      const cards = await db.cards.toArray()
      const geographieCards = cards.filter((card) =>
        card.tags.some((tag) => tag.startsWith('Geographie'))
      )
      expect(geographieCards.some((card) => card.suspended)).toBe(false)
    })
  })
})
