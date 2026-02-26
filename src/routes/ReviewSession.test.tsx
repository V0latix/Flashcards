import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import db from '../db'
import { I18nProvider } from '../i18n/I18nProvider'
import ReviewSession from './ReviewSession'
import { resetDb, seedCardWithState } from '../test/utils'
import { saveTrainingQueue } from '../utils/training'

const setSettings = (box1Target = 2) => {
  localStorage.setItem(
    'leitnerSettings',
    JSON.stringify({
      box1Target,
      intervalDays: { 1: 1, 2: 3, 3: 7, 4: 15, 5: 30 },
      learnedReviewIntervalDays: 90,
      reverseProbability: 0
    })
  )
}

const renderReviewSession = (entry = '/review') =>
  render(
    <I18nProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[entry]}>
          <ReviewSession />
        </MemoryRouter>
      </AuthProvider>
    </I18nProvider>
  )

const renderReviewSessionWithTagNavigation = (entry = '/review?tag=Tag/A') => {
  const Wrapper = () => {
    const navigate = useNavigate()
    return (
      <>
        <button type="button" onClick={() => navigate('/review?tag=Tag/B')}>
          Changer tag
        </button>
        <ReviewSession />
      </>
    )
  }

  return render(
    <I18nProvider>
      <AuthProvider>
        <MemoryRouter initialEntries={[entry]}>
          <Wrapper />
        </MemoryRouter>
      </AuthProvider>
    </I18nProvider>
  )
}

describe('ReviewSession', () => {
  beforeEach(async () => {
    await resetDb()
    setSettings()
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
  })

  it('shows a card and buttons, bon on the left', async () => {
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })

    renderReviewSession()

    await screen.findByRole('heading', { name: /Recto/i })
    fireEvent.click(screen.getByRole('button', { name: /Révéler/i }))

    const bon = screen.getByRole('button', { name: 'BON' })
    const faux = screen.getByRole('button', { name: 'FAUX' })
    expect(bon.style.order).toBe('1')
    expect(faux.style.order).toBe('2')
  })

  it('supports keyboard shortcuts during review', async () => {
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })

    renderReviewSession()

    await screen.findByRole('heading', { name: /Recto/i })
    fireEvent.keyDown(window, { key: ' ', code: 'Space' })
    await screen.findByText('A1')
    fireEvent.keyDown(window, { key: 'ArrowLeft' })

    await screen.findByText(/Session terminée/i)
  })

  it('good answer advances the box', async () => {
    const cardId = await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })

    renderReviewSession()

    await screen.findByRole('heading', { name: /Recto/i })
    fireEvent.click(screen.getByRole('button', { name: /Révéler/i }))
    fireEvent.click(screen.getByRole('button', { name: 'BON' }))

    await waitFor(async () => {
      const state = await db.reviewStates.get(cardId)
      expect(state?.box).toBe(2)
    })
  })

  it('shows answers in session recap', async () => {
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })

    renderReviewSession()

    await screen.findByRole('heading', { name: /Recto/i })
    fireEvent.click(screen.getByRole('button', { name: /Révéler/i }))
    fireEvent.click(screen.getByRole('button', { name: 'BON' }))

    await screen.findByText(/Session terminée/i)
    expect(screen.getByText('Q1')).toBeInTheDocument()
    expect(screen.getByText('A1')).toBeInTheDocument()
  })

  it('deletes a card during session and continues', async () => {
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.999)
    const firstId = await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })
    await seedCardWithState({
      front: 'Q2',
      back: 'A2',
      createdAt: '2024-01-02',
      box: 1,
      dueDate: '2024-01-01'
    })

    renderReviewSession()

    await screen.findByRole('heading', { name: /Recto/i })
    fireEvent.click(screen.getByRole('button', { name: /Supprimer la carte/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(async () => {
      const card = await db.cards.get(firstId)
      expect(card).toBeUndefined()
    })

    await screen.findByText(/1 carte\(s\) restante\(s\)/i)
    randomSpy.mockRestore()
  })

  it('training mode does not update Leitner state', async () => {
    const cardId = await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })
    saveTrainingQueue([cardId])

    renderReviewSession('/review?mode=training')

    await screen.findByText(/Mode entraînement/i)
    fireEvent.click(screen.getByRole('button', { name: /Révéler/i }))
    fireEvent.click(screen.getByRole('button', { name: 'BON' }))

    await waitFor(async () => {
      const state = await db.reviewStates.get(cardId)
      expect(state?.box).toBe(1)
    })
  })

  it('shows the current card tags during session', async () => {
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01',
      tags: ['Geographie/Europe', 'Capitales']
    })

    renderReviewSession()

    await screen.findByRole('heading', { name: /Recto/i })
    expect(screen.getByText(/Geographie\/Europe/)).toBeInTheDocument()
    expect(screen.getByText(/Capitales/)).toBeInTheDocument()
  })

  it('resets session progress when tag filter changes', async () => {
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01',
      tags: ['Tag/A']
    })
    await seedCardWithState({
      front: 'Q2',
      back: 'A2',
      createdAt: '2024-01-02',
      box: 1,
      dueDate: '2024-01-01',
      tags: ['Tag/B']
    })

    renderReviewSessionWithTagNavigation()

    await screen.findByText('Q1')
    fireEvent.click(screen.getByRole('button', { name: /Révéler/i }))
    fireEvent.click(screen.getByRole('button', { name: 'BON' }))
    await screen.findByText(/Session terminée/i)

    fireEvent.click(screen.getByRole('button', { name: 'Changer tag' }))

    await waitFor(() => {
      expect(screen.queryByText(/Session terminée/i)).not.toBeInTheDocument()
    })
    await screen.findByText('Q2')
  })
})
