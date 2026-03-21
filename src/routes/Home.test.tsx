import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/AuthProvider'
import { I18nProvider } from '../i18n/I18nProvider'
import { resetDb, seedCardWithState } from '../test/utils'
import Home from './Home'

describe('Home', () => {
  beforeEach(async () => {
    await resetDb()
  })

  it('shows play action', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    render(
      <I18nProvider>
        <AuthProvider>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    )
    expect(screen.getByLabelText('Commencer une session')).toBeInTheDocument()
    expect(screen.getByLabelText('Démarrer la boîte 1')).toBeInTheDocument()
  })

  it('does not count suspended cards in daily due totals', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')

    await seedCardWithState({
      front: 'Active',
      back: 'A',
      createdAt: '2026-03-01',
      box: 1,
      dueDate: '2026-03-01',
      suspended: false
    })
    await seedCardWithState({
      front: 'Suspended',
      back: 'A',
      createdAt: '2026-03-01',
      box: 1,
      dueDate: '2026-03-01',
      suspended: true
    })

    render(
      <I18nProvider>
        <AuthProvider>
          <MemoryRouter>
            <Home />
          </MemoryRouter>
        </AuthProvider>
      </I18nProvider>
    )

    await waitFor(() => {
      const box1 = screen.getByText('Boîte 1').closest('.home-summary-item')
      expect(box1).not.toBeNull()
      expect(within(box1 as HTMLElement).getByText(/1\s+À faire/i)).toBeInTheDocument()
    })
  })
})
