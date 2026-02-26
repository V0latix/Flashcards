import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n/I18nProvider'
import { listPacks, listPublicCardCountsByPackSlug } from '../supabase/api'
import { importPackToLocal } from '../supabase/import'
import Packs from './Packs'

vi.mock('../supabase/api', () => ({
  listPacks: vi.fn(),
  listPublicCardCountsByPackSlug: vi.fn()
}))

vi.mock('../supabase/import', () => ({
  importPackToLocal: vi.fn()
}))

const mockedListPacks = vi.mocked(listPacks)
const mockedListPublicCardCountsByPackSlug = vi.mocked(listPublicCardCountsByPackSlug)
const mockedImportPackToLocal = vi.mocked(importPackToLocal)

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
    mockedListPublicCardCountsByPackSlug.mockResolvedValue({
      'geo-europe': 12,
      'histoire-france': 8
    })
    mockedImportPackToLocal.mockResolvedValue({ imported: 2, alreadyPresent: 1 })
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

  it('shows description, tags, card count and direct import action', async () => {
    render(
      <I18nProvider>
        <MemoryRouter>
          <Packs />
        </MemoryRouter>
      </I18nProvider>
    )

    await screen.findByText('Géographie Europe')
    expect(screen.getByText('Capitales et drapeaux européens')).toBeInTheDocument()
    expect(screen.getByText('12 carte(s)')).toBeInTheDocument()
    expect(screen.getByText('Tags: Geographie/Europe')).toBeInTheDocument()

    const importButtons = screen.getAllByRole('button', { name: 'Importer' })
    fireEvent.click(importButtons[0])

    expect(mockedImportPackToLocal).toHaveBeenCalledWith('geo-europe')
    await screen.findByText('2 importées, 1 déjà présentes')
  })
})
