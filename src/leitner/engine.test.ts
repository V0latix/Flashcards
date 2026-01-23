import { beforeEach, describe, expect, it } from 'vitest'
import db from '../db'
import { applyReviewResult, autoFillBox1, buildDailySession } from './engine'

const addCardWithState = async (input: {
  front: string
  back: string
  createdAt: string
  box: number
  dueDate: string | null
}) => {
  const cardId = await db.cards.add({
    front_md: input.front,
    back_md: input.back,
    tags: [],
    created_at: input.createdAt,
    updated_at: input.createdAt
  })

  await db.reviewStates.add({
    card_id: cardId,
    box: input.box,
    due_date: input.dueDate
  })

  return cardId
}

beforeEach(async () => {
  await db.delete()
  await db.open()
})

describe('autoFillBox1', () => {
  it('only fills what is available when box0 is insufficient', async () => {
    const today = '2024-01-10'

    for (let i = 0; i < 7; i += 1) {
      await addCardWithState({
        front: `Front ${i}`,
        back: `Back ${i}`,
        createdAt: `2024-01-0${i + 1}`,
        box: 1,
        dueDate: today
      })
    }

    for (let i = 0; i < 2; i += 1) {
      await addCardWithState({
        front: `Box0 ${i}`,
        back: `Box0 ${i}`,
        createdAt: `2024-01-1${i}`,
        box: 0,
        dueDate: null
      })
    }

    await autoFillBox1(1, today)

    const box1States = await db.reviewStates.where({ box: 1 }).toArray()
    const box0States = await db.reviewStates.where({ box: 0 }).toArray()

    expect(box1States).toHaveLength(9)
    expect(box0States).toHaveLength(0)
  })

  it('selects a random sample from box0 without replacement', async () => {
    const today = '2024-02-01'

    for (let i = 0; i < 8; i += 1) {
      await addCardWithState({
        front: `Front ${i}`,
        back: `Back ${i}`,
        createdAt: `2024-01-0${i + 1}`,
        box: 1,
        dueDate: today
      })
    }

    const firstId = await addCardWithState({
      front: 'Oldest',
      back: 'Oldest',
      createdAt: '2024-01-01',
      box: 0,
      dueDate: null
    })
    const secondId = await addCardWithState({
      front: 'Middle',
      back: 'Middle',
      createdAt: '2024-01-02',
      box: 0,
      dueDate: null
    })
    const thirdId = await addCardWithState({
      front: 'Newest',
      back: 'Newest',
      createdAt: '2024-01-03',
      box: 0,
      dueDate: null
    })

    const originalRandom = Math.random
    Math.random = () => 0

    await autoFillBox1(1, today)

    Math.random = originalRandom

    const firstState = await db.reviewStates.get(firstId)
    const secondState = await db.reviewStates.get(secondId)
    const thirdState = await db.reviewStates.get(thirdId)

    const promoted = [firstState, secondState, thirdState]
      .filter((state) => state?.box === 1)
      .map((state) => state?.card_id)

    expect(promoted).toHaveLength(2)
    expect(promoted).toEqual(expect.arrayContaining([secondId, thirdId]))
    expect(firstState?.box).toBe(0)
  })
})

describe('applyReviewResult', () => {
  it('moves good cards up with correct interval', async () => {
    const cardId = await addCardWithState({
      front: 'Front',
      back: 'Back',
      createdAt: '2024-01-01',
      box: 2,
      dueDate: '2024-01-05'
    })

    await applyReviewResult(cardId, 'good', '2024-01-10')

    const state = await db.reviewStates.get(cardId)
    expect(state?.box).toBe(3)
    expect(state?.due_date).toBe('2024-01-17')

    const logs = await db.reviewLogs.where('card_id').equals(cardId).toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0].result).toBe('good')
    expect(logs[0].previous_box).toBe(2)
    expect(logs[0].new_box).toBe(3)
  })

  it('moves bad cards to box 1 with tomorrow due date', async () => {
    const cardId = await addCardWithState({
      front: 'Front',
      back: 'Back',
      createdAt: '2024-01-01',
      box: 4,
      dueDate: '2024-01-05'
    })

    await applyReviewResult(cardId, 'bad', '2024-01-10')

    const state = await db.reviewStates.get(cardId)
    expect(state?.box).toBe(1)
    expect(state?.due_date).toBe('2024-01-11')

    const logs = await db.reviewLogs.where('card_id').equals(cardId).toArray()
    expect(logs).toHaveLength(1)
    expect(logs[0].result).toBe('bad')
    expect(logs[0].previous_box).toBe(4)
    expect(logs[0].new_box).toBe(1)
  })
})

describe('buildDailySession', () => {
  it('returns box1 plus due cards from boxes 2-5', async () => {
    const today = '2024-03-01'

    for (let i = 0; i < 2; i += 1) {
      await addCardWithState({
        front: `Box1 ${i}`,
        back: `Box1 ${i}`,
        createdAt: `2024-02-0${i + 1}`,
        box: 1,
        dueDate: today
      })
    }

    for (let i = 0; i < 8; i += 1) {
      await addCardWithState({
        front: `Box0 ${i}`,
        back: `Box0 ${i}`,
        createdAt: `2024-02-1${i}`,
        box: 0,
        dueDate: null
      })
    }

    const dueCardId = await addCardWithState({
      front: 'Due',
      back: 'Due',
      createdAt: '2024-02-20',
      box: 2,
      dueDate: '2024-03-01'
    })

    await addCardWithState({
      front: 'Not due',
      back: 'Not due',
      createdAt: '2024-02-21',
      box: 3,
      dueDate: '2024-03-10'
    })

    const pastDueId = await addCardWithState({
      front: 'Past due',
      back: 'Past due',
      createdAt: '2024-02-22',
      box: 4,
      dueDate: '2024-02-28'
    })

    const session = await buildDailySession(1, today)

    expect(session.box1).toHaveLength(10)
    expect(session.due).toHaveLength(2)

    const dueIds = session.due.map((entry) => entry.card.id)
    expect(dueIds).toEqual(expect.arrayContaining([dueCardId, pastDueId]))
  })
})
