import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import db from '../db'
import { I18nProvider } from '../i18n/I18nProvider'
import Library from './Library'
import { resetDb, seedCardWithState } from '../test/utils'

describe('Library delete by tag', () => {
  beforeEach(async () => {
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
      expect(count).toBe(0)
    })
  })
})
