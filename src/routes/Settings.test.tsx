import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import db from '../db'
import Settings from './Settings'
import { resetDb, seedCardWithState } from '../test/utils'

describe('Settings danger zone', () => {
  beforeEach(async () => {
    await resetDb()
    await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 1,
      dueDate: '2024-01-01'
    })
  })

  it('deletes all cards after strong confirmation', async () => {
    render(
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    )

    fireEvent.click(screen.getByRole('button', { name: /Supprimer toutes les cartes/i }))
    fireEvent.change(screen.getByLabelText(/SUPPRIMER/i), { target: { value: 'SUPPRIMER' } })
    fireEvent.click(screen.getByRole('button', { name: 'Supprimer' }))

    await waitFor(async () => {
      const count = await db.cards.count()
      expect(count).toBe(0)
    })

  })
})
