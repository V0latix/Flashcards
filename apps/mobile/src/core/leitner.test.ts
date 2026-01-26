import { describe, expect, it } from 'vitest'
import { applyReviewResult, autoFillBox1, buildDailySession, getDefaultLeitnerSettings } from './leitner'
import type { ReviewState, StoredCard } from '../storage/store'

const makeRng = (values: number[]) => {
  let index = 0
  return () => {
    const value = values[index % values.length]
    index += 1
    return value
  }
}

const buildCard = (id: number, front: string, back: string): StoredCard => ({
  id,
  front_md: front,
  back_md: back,
  hint_md: null,
  tags: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  source: null,
  source_type: null,
  source_id: null
})

const baseState = (cardId: number, box: number, dueDate: string | null): ReviewState => ({
  card_id: cardId,
  box,
  due_date: dueDate,
  last_reviewed_at: null,
  is_learned: false,
  learned_at: null
})

describe('leitner', () => {
  it('fills box1 from box0 without replacement', () => {
    const states: ReviewState[] = [
      baseState(1, 1, '2024-01-01'),
      baseState(2, 0, null),
      baseState(3, 0, null),
      baseState(4, 0, null)
    ]

    const updated = autoFillBox1(states, '2024-01-02', 2, makeRng([0.9, 0.1, 0.8]))
    const box1States = updated.filter((state) => state.box === 1)
    expect(box1States).toHaveLength(2)
    const newBox1 = box1States.find((state) => state.card_id !== 1)
    expect(newBox1?.due_date).toBe('2024-01-02')
    const ids = box1States.map((state) => state.card_id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('builds daily session with due and learned cards', () => {
    const cards = [
      buildCard(1, 'A', 'a'),
      buildCard(2, 'B', 'b'),
      buildCard(3, 'C', 'c'),
      buildCard(4, 'D', 'd')
    ]

    const states: ReviewState[] = [
      baseState(1, 1, '2024-04-01'),
      baseState(2, 2, '2024-04-01'),
      baseState(3, 3, '2024-05-01'),
      {
        ...baseState(4, 5, null),
        is_learned: true,
        learned_at: '2024-01-01T00:00:00.000Z'
      }
    ]

    const settings = {
      ...getDefaultLeitnerSettings(),
      box1Target: 1,
      learnedReviewIntervalDays: 30,
      reverseProbability: 1
    }

    const result = buildDailySession(cards, states, '2024-04-01', settings, makeRng([0.2]))
    const ids = result.sessionCards.map((card) => card.cardId)

    expect(new Set(ids)).toEqual(new Set([1, 2, 4]))
    result.sessionCards.forEach((card) => {
      expect(card.wasReversed).toBe(true)
      expect(card.front).toBe(card.card.back_md)
      expect(card.back).toBe(card.card.front_md)
    })
  })

  it('applies learned transitions and logs reverse flag', () => {
    const settings = getDefaultLeitnerSettings()
    const state = baseState(10, 5, '2024-01-01')
    const nowIso = '2024-01-02T00:00:00.000Z'

    const good = applyReviewResult(state, 'good', '2024-01-02', settings, {
      nowIso,
      wasReversed: true
    })

    expect(good.nextState.box).toBe(5)
    expect(good.nextState.is_learned).toBe(true)
    expect(good.nextState.due_date).toBeNull()
    expect(good.log.was_reversed).toBe(true)
    expect(good.log.was_learned_before).toBe(false)

    const learnedState: ReviewState = {
      ...good.nextState,
      is_learned: true,
      learned_at: nowIso
    }

    const bad = applyReviewResult(learnedState, 'bad', '2024-01-10', settings, {
      nowIso: '2024-01-10T00:00:00.000Z',
      wasReversed: false
    })

    expect(bad.nextState.box).toBe(1)
    expect(bad.nextState.is_learned).toBe(false)
    expect(bad.nextState.learned_at).toBeNull()
    expect(bad.nextState.due_date).toBe('2024-01-11')
  })
})
