import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { packsFixture } from '../test/fixtures/supabase'
import DebugSupabase from './DebugSupabase'

vi.mock('../supabase/api', () => ({
  listPacks: vi.fn().mockResolvedValue(packsFixture)
}))

describe('DebugSupabase', () => {
  it('shows ok status with mocked packs', async () => {
    render(
      <MemoryRouter>
        <DebugSupabase />
      </MemoryRouter>
    )

    expect(await screen.findByText(/OK/)).toHaveTextContent('OK (1 packs)')
  })
})
