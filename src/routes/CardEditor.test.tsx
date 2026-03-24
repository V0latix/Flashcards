import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'
import { I18nProvider } from '../i18n/I18nProvider'
import { getCardById } from '../db/queries'
import { resetDb, seedCardWithState } from '../test/utils'
import CardEditor from './CardEditor'

const renderCardEditor = (entry: string) =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/card/:cardId/edit" element={<CardEditor />} />
          <Route path="/library" element={<div>Library</div>} />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  )

describe('CardEditor', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('preserves tags containing commas when saving an edited card', async () => {
    const cardId = await seedCardWithState({
      front: 'Q1',
      back: 'A1',
      createdAt: '2024-01-01',
      box: 0,
      dueDate: null,
      tags: ['Maths/Algèbre/Ensembles, Applications, Relations']
    })

    renderCardEditor(`/card/${cardId}/edit`)

    await screen.findByDisplayValue('Maths/Algèbre/Ensembles, Applications, Relations')
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer/i }))

    await waitFor(async () => {
      const card = await getCardById(cardId)
      expect(card?.tags).toEqual(['Maths/Algèbre/Ensembles, Applications, Relations'])
    })
  })
})
