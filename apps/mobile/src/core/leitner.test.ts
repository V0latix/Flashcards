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
  it('marks new box0 cards due today without changing their box', () => {
    const states: ReviewState[] = [
      baseState(1, 1, '2024-01-01'),
      baseState(2, 0, null),
      baseState(3, 0, null),
      baseState(4, 0, null)
    ]

    const updated = autoFillBox1(states, '2024-01-02', 2, makeRng([0.9, 0.1, 0.8]))
    const dueBox0States = updated.filter(
      (state) => state.box === 0 && state.due_date === '2024-01-02'
    )
    expect(dueBox0States).toHaveLength(1)
    const ids = dueBox0States.map((state) => state.card_id)
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

  it('fills up to the box1 target based on cards due today', () => {
    const cards = [
      buildCard(1, 'Due', 'due'),
      buildCard(2, 'Future', 'future'),
      buildCard(3, 'New', 'new')
    ]

    const states: ReviewState[] = [
      baseState(1, 1, '2024-04-01'),
      baseState(2, 1, '2024-04-02'),
      baseState(3, 0, null)
    ]

    const settings = {
      ...getDefaultLeitnerSettings(),
      box1Target: 2
    }

    const result = buildDailySession(cards, states, '2024-04-01', settings, makeRng([0.1, 0.2]))

    expect(result.box1.map((entry) => entry.cardId)).toEqual([1])
    expect(result.box1).toHaveLength(1)
    expect(result.sessionCards).toHaveLength(2)
    expect(result.due.map((entry) => entry.cardId)).toContain(3)
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

  it('moves introduced box0 cards directly to box 2 on good answer', () => {
    const settings = getDefaultLeitnerSettings()
    const state = baseState(10, 0, '2024-01-02')

    const result = applyReviewResult(state, 'good', '2024-01-02', settings)

    expect(result.nextState.box).toBe(2)
    expect(result.nextState.due_date).toBe('2024-01-05')
  })

  it('moves introduced box0 cards to box 1 on bad answer', () => {
    const settings = getDefaultLeitnerSettings()
    const state = baseState(10, 0, '2024-01-02')

    const result = applyReviewResult(state, 'bad', '2024-01-02', settings)

    expect(result.nextState.box).toBe(1)
    expect(result.nextState.due_date).toBe('2024-01-03')
  })
})
