import { describe, expect, it } from 'vitest'
import { consumeTrainingQueue, saveTrainingQueue } from './training'

describe('training queue', () => {
  it('saves and consumes ids once', () => {
    saveTrainingQueue([1, 2, 3])
    expect(consumeTrainingQueue()).toEqual([1, 2, 3])
    expect(consumeTrainingQueue()).toEqual([])
  })
})
