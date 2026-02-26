import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { I18nProvider } from '../i18n/I18nProvider'
import AppShell from './AppShell'

vi.mock('../auth/AuthButton', () => ({
  default: () => <button type="button">Auth</button>
}))

vi.mock('./LeitnerInfo', () => ({
  default: () => <div>Info</div>
}))

vi.mock('./StreakBadge', () => ({
  default: () => <div>Streak</div>
}))

const renderShell = (path = '/library') =>
  render(
    <I18nProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="*"
            element={
              <AppShell>
                <div>Content</div>
              </AppShell>
            }
          />
        </Routes>
      </MemoryRouter>
    </I18nProvider>
  )

describe('AppShell', () => {
  it('marks add nav as active on card dynamic routes', () => {
    renderShell('/card/42/edit')

    expect(screen.getByRole('button', { name: 'Ajouter' })).toHaveClass('nav-add-button-active')
    expect(screen.getByRole('link', { name: 'Ajouter' })).toHaveClass('nav-link-active')
  })

  it('marks add nav as active on pack detail routes', () => {
    renderShell('/packs/capitales-europe')

    expect(screen.getByRole('button', { name: 'Ajouter' })).toHaveClass('nav-add-button-active')
    expect(screen.getByRole('link', { name: 'Ajouter' })).toHaveClass('nav-link-active')
  })

  it('focuses first add action and closes menu on Escape', async () => {
    renderShell('/library')
    const addButton = screen.getByRole('button', { name: 'Ajouter' })

    fireEvent.click(addButton)
    const firstItem = screen.getByRole('menuitem', { name: /Ajouter une carte/i })
    expect(firstItem).toHaveFocus()

    fireEvent.keyDown(window, { key: 'Escape' })

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
    expect(addButton).toHaveFocus()
  })

  it('closes add menu on outside click', async () => {
    renderShell('/library')

    fireEvent.click(screen.getByRole('button', { name: 'Ajouter' }))
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    await waitFor(() => {
      expect(screen.queryByRole('menu')).not.toBeInTheDocument()
    })
  })
})
