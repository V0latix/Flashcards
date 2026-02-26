import { describe, expect, it } from 'vitest'
import {
  addDays,
  normalizeToDateKey,
  normalizeTodayKey,
  parseDateKey,
  toDateKey
} from './date'

describe('date utils', () => {
  it('parses date keys in UTC', () => {
    const date = parseDateKey('2026-02-26')
    expect(date.toISOString()).toBe('2026-02-26T00:00:00.000Z')
  })

  it('adds days to date keys', () => {
    expect(addDays('2026-02-26', 3)).toBe('2026-03-01')
  })

  it('normalizes nullable date values', () => {
    expect(normalizeToDateKey(null)).toBeNull()
    expect(normalizeToDateKey('2026-02-26T12:34:56.000Z')).toBe('2026-02-26')
    expect(normalizeToDateKey('invalid')).toBeNull()
  })

  it('normalizes today input consistently', () => {
    expect(normalizeTodayKey('2026-02-26')).toBe('2026-02-26')
    expect(toDateKey('2026-02-26T05:00:00.000Z')).toBe('2026-02-26')
  })
})
