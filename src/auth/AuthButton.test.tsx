import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n/I18nProvider'
import AuthButton from './AuthButton'
import { useAuth } from './useAuth'

vi.mock('./useAuth', () => ({
  useAuth: vi.fn()
}))

const mockedUseAuth = vi.mocked(useAuth)

const renderAuthButton = () =>
  render(
    <I18nProvider>
      <AuthButton />
    </I18nProvider>
  )

describe('AuthButton', () => {
  beforeEach(() => {
    mockedUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signInWithProvider: vi.fn().mockResolvedValue({ error: null }),
      signInWithEmail: vi.fn().mockResolvedValue({ error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null })
    })
  })

  it('closes modal on Escape and restores trigger focus', async () => {
    renderAuthButton()
    const trigger = screen.getByRole('button', { name: 'Connexion' })

    fireEvent.click(trigger)
    expect(screen.getByRole('dialog')).toBeInTheDocument()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
    expect(trigger).toHaveFocus()
  })

  it('closes modal when clicking backdrop', async () => {
    renderAuthButton()

    fireEvent.click(screen.getByRole('button', { name: 'Connexion' }))
    const dialog = screen.getByRole('dialog')
    const backdrop = dialog.parentElement
    expect(backdrop).not.toBeNull()

    fireEvent.mouseDown(backdrop as HTMLElement)

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })

  it('traps focus within modal on Tab navigation', async () => {
    renderAuthButton()

    fireEvent.click(screen.getByRole('button', { name: 'Connexion' }))

    const githubButton = screen.getByRole('button', { name: /Continuer avec GitHub/i })
    const cancelButton = screen.getByRole('button', { name: /Annuler/i })

    cancelButton.focus()
    fireEvent.keyDown(window, { key: 'Tab' })
    expect(githubButton).toHaveFocus()

    githubButton.focus()
    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true })
    expect(cancelButton).toHaveFocus()
  })
})
