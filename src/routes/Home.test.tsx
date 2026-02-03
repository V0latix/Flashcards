import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthProvider } from '../auth/AuthProvider'
import { I18nProvider } from '../i18n/I18nProvider'
import Home from './Home'

describe('Home', () => {
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
  })
})
