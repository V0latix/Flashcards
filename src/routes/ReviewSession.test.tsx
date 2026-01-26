import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import db from '../db'
import ReviewSession from './ReviewSession'
import { resetDb, seedCardWithState } from '../test/utils'

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

describe('ReviewSession', () => {
  beforeEach(async () => {
    await resetDb()
    setSettings()
  })

  it('shows a card and buttons, bon on the right', async () => {
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })

    render(
      <MemoryRouter initialEntries={['/review']}>
        <ReviewSession />
      </MemoryRouter>
    )

    await screen.findByText(/Carte 1/)
    fireEvent.click(screen.getByRole('button', { name: /Revealer/i }))

    const bon = screen.getByRole('button', { name: 'Bon' })
    const faux = screen.getByRole('button', { name: 'Faux' })
    expect(bon.style.order).toBe('2')
    expect(faux.style.order).toBe('1')
  })

  it('good answer advances the box', async () => {
    const cardId = await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })

    render(
      <MemoryRouter initialEntries={['/review']}>
        <ReviewSession />
      </MemoryRouter>
    )

    await screen.findByText(/Carte 1/)
    fireEvent.click(screen.getByRole('button', { name: /Revealer/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Bon' }))

    await waitFor(async () => {
      const state = await db.reviewStates.get(cardId)
      expect(state?.box).toBe(2)
    })
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

    render(
      <MemoryRouter initialEntries={['/review']}>
        <ReviewSession />
      </MemoryRouter>
    )

    await screen.findByText(/Carte 1/)
    fireEvent.click(screen.getByRole('button', { name: /Supprimer la carte/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(async () => {
      const card = await db.cards.get(firstId)
      expect(card).toBeUndefined()
    })

    await screen.findByText(/Carte 1 \/ 1/)
    randomSpy.mockRestore()
  })
})
