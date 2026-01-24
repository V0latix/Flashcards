import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MarkdownRenderer from './MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders storage: images with resolved src', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    render(<MarkdownRenderer value="![flag](storage:assets/flags/fr.svg)" />)
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
    render(<MarkdownRenderer value="![flag](storage:assets/flags/fr.svg)" />)
    const img = screen.getByRole('img')
    fireEvent.error(img)
    expect(screen.getByText('Image introuvable')).toBeInTheDocument()
    expect(consoleSpy).toHaveBeenCalled()
    consoleSpy.mockRestore()
    vi.unstubAllEnvs()
  })
})
