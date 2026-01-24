import { describe, expect, it, vi } from 'vitest'
import { resolveImageSrc } from './media'

describe('resolveImageSrc', () => {
  it('resolves storage: urls to supabase public bucket', () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    const resolved = resolveImageSrc('storage:assets/flags/fr.svg')
    expect(resolved).toBe(
      'https://example.supabase.co/storage/v1/object/public/assets/flags/fr.svg'
    )
    vi.unstubAllEnvs()
  })

  it('keeps http(s) urls unchanged', () => {
    const resolved = resolveImageSrc('https://cdn.example.com/flag.svg')
    expect(resolved).toBe('https://cdn.example.com/flag.svg')
  })

  it('resolves absolute paths with BASE_URL', () => {
    vi.stubEnv('BASE_URL', '/subdir/')
    const resolved = resolveImageSrc('/assets/flags/fr.svg')
    expect(resolved).toBe('/subdir/assets/flags/fr.svg')
    vi.unstubAllEnvs()
  })
})
