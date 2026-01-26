import { beforeEach, describe, expect, it, vi } from 'vitest'

const memory = new Map<string, string>()

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn((key: string) => Promise.resolve(memory.get(key) ?? null)),
    setItem: vi.fn((key: string, value: string) => {
      memory.set(key, value)
      return Promise.resolve()
    }),
    removeItem: vi.fn((key: string) => {
      memory.delete(key)
      return Promise.resolve()
    }),
    clear: vi.fn(() => {
      memory.clear()
      return Promise.resolve()
    })
  }
}))

import { getLeitnerSettings, saveLeitnerSettings } from './settings'

describe('settings', () => {
  beforeEach(() => {
    memory.clear()
  })

  it('returns defaults when empty', async () => {
    const settings = await getLeitnerSettings()
    expect(settings.box1Target).toBe(10)
    expect(settings.intervalDays[2]).toBe(3)
    expect(settings.learnedReviewIntervalDays).toBe(90)
    expect(settings.reverseProbability).toBe(0)
  })

  it('saves and loads settings', async () => {
    await saveLeitnerSettings({
      box1Target: 12,
      intervalDays: { 1: 1, 2: 4, 3: 7, 4: 15, 5: 30 },
      learnedReviewIntervalDays: 120,
      reverseProbability: 0.25
    })

    const settings = await getLeitnerSettings()
    expect(settings.box1Target).toBe(12)
    expect(settings.intervalDays[2]).toBe(4)
    expect(settings.learnedReviewIntervalDays).toBe(120)
    expect(settings.reverseProbability).toBe(0.25)
  })
})
