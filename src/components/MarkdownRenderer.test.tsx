import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MarkdownRenderer from './MarkdownRenderer'
import { I18nProvider } from '../i18n/I18nProvider'

const renderMarkdown = (value: string) =>
  render(
    <I18nProvider>
      <MarkdownRenderer value={value} />
    </I18nProvider>
  )

describe('MarkdownRenderer', () => {
  it('renders storage: images with resolved src', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    renderMarkdown('![flag](storage:assets/flags/fr.svg)')
    const img = screen.getByRole('img')
    expect(img).toHaveAttribute(
      'src',
      'https://example.supabase.co/storage/v1/object/public/assets/flags/fr.svg'
    )
    vi.unstubAllEnvs()
  })

  it('shows fallback on image error', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    renderMarkdown('![flag](storage:assets/flags/fr.svg)')
    const img = screen.getByRole('img')
    fireEvent.error(img)
    expect(screen.getByText('Image introuvable')).toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
    vi.unstubAllEnvs()
  })

  it('normalizes \\[ \\] math delimiters for KaTeX', () => {
    renderMarkdown("\\[a^2 + b^2 = c^2\\]")
    expect(document.querySelector('.katex')).toBeTruthy()
    expect(screen.queryByText(/\\\[/)).toBeNull()
  })

  it('unescapes common TeX escapes from JSON imports', () => {
    renderMarkdown("\\$\\\\forall x \\\\in \\\\mathbb{N}\\$")
    expect(document.querySelector('.katex')).toBeTruthy()
    expect(screen.queryByText(/\\\\forall/)).toBeNull()
  })

  it('repairs JSON control escapes like \\b, \\f, \\t inside TeX commands', () => {
    const broken = "$\big(\frac{1}{2} \text{ok}\big)$"
    renderMarkdown(broken)
    expect(document.querySelector('.katex')).toBeTruthy()
    expect(document.querySelector('.katex-error')).toBeNull()
  })

  it('sanitizes unsafe javascript links', () => {
    renderMarkdown("[bad](javascript:alert('xss'))")
    const link = screen.getByText('bad').closest('a')
    expect(link).toBeTruthy()
    expect(link).not.toHaveAttribute('href', expect.stringContaining('javascript:'))
    expect(link).toHaveAttribute('href', '')
  })
})
