import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import db from '../db'

function Stats() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [isLoading, setIsLoading] = useState(true)
  const [boxCounts, setBoxCounts] = useState<Record<number, number>>({})
  const [dueCount, setDueCount] = useState(0)
  const [successRate, setSuccessRate] = useState<number | null>(null)

  useEffect(() => {
    const loadStats = async () => {
      const reviewStates = await db.reviewStates.toArray()

      const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
      let due = 0

      for (const state of reviewStates) {
        const current = counts[state.box] ?? 0
        counts[state.box] = current + 1
        if (state.box >= 2 && state.due_date && state.due_date <= today) {
          due += 1
        }
      }

      const cards = await db.cards.toArray()
      const cardIds = new Set(cards.map((card) => card.id).filter(Boolean) as number[])

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7)
      const sinceIso = sevenDaysAgo.toISOString()

      const recentLogs = await db.reviewLogs
        .where('timestamp')
        .aboveOrEqual(sinceIso)
        .toArray()

      const deckLogs = recentLogs.filter((log) => cardIds.has(log.card_id))
      const goodLogs = deckLogs.filter((log) => log.result === 'good')
      const rate =
        deckLogs.length === 0 ? null : Math.round((goodLogs.length / deckLogs.length) * 100)

      setBoxCounts(counts)
      setDueCount(due)
      setSuccessRate(rate)
      setIsLoading(false)
    }

    void loadStats()
  }, [today])

  return (
    <main>
      <h1>Stats</h1>
      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <section>
          <h2>Cartes par box</h2>
          <ul>
            {[0, 1, 2, 3, 4, 5].map((box) => (
              <li key={box}>
                Box {box}: {boxCounts[box] ?? 0}
              </li>
            ))}
          </ul>
          <h2>Cartes dues aujourd'hui (box 2-5)</h2>
          <p>{dueCount}</p>
          <h2>Taux de reussite (7 jours)</h2>
          <p>{successRate === null ? '—' : `${successRate}%`}</p>
        </section>
      )}
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/review">Review session</Link>
          </li>
          <li>
            <Link to="/library">Library</Link>
          </li>
          <li>
            <Link to="/card/new">New card</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
          <li>
            <Link to="/import-export">Import/Export</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default Stats
