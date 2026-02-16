import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n/I18nProvider'
import { listPacks } from '../supabase/api'
import Packs from './Packs'

vi.mock('../supabase/api', () => ({
  listPacks: vi.fn()
}))

const mockedListPacks = vi.mocked(listPacks)

describe('Packs search', () => {
  beforeEach(() => {
    mockedListPacks.mockResolvedValue([
      {
        id: '1',
        slug: 'geo-europe',
        title: 'Géographie Europe',
        description: 'Capitales et drapeaux européens',
        tags: ['Geographie/Europe']
      },
      {
        id: '2',
        slug: 'histoire-france',
        title: 'Histoire de France',
        description: 'Dates et événements clés',
        tags: ['Histoire/France']
      }
    ])
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('filters packs by text query', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Packs />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText('Géographie Europe')
    expect(screen.getByText('Histoire de France')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Recherche'), {
      target: { value: 'histoire' }
    })
    expect(screen.getByText('Histoire de France')).toBeInTheDocument()
    expect(screen.queryByText('Géographie Europe')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Recherche'), {
      target: { value: 'drapeaux' }
    })
    expect(screen.getByText('Géographie Europe')).toBeInTheDocument()
    expect(screen.queryByText('Histoire de France')).not.toBeInTheDocument()
  })
})
