import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TagAgg } from '../stats/types'
import { useStats } from '../stats/hooks'

type TagNode = {
  path: string
  name: string
  count: number
  children: TagNode[]
}

const buildTagTree = (statsByPath: Record<string, TagAgg>): TagNode => {
  const root: TagNode = { path: '', name: '', count: 0, children: [] }
  const nodeByPath = new Map<string, TagNode>()
  nodeByPath.set('', root)

  const ensureNode = (path: string, name: string): TagNode => {
    const existing = nodeByPath.get(path)
    if (existing) {
      return existing
    }
    const node: TagNode = { path, name, count: 0, children: [] }
    nodeByPath.set(path, node)
    return node
  }

  Object.keys(statsByPath).forEach((path) => {
    const segments = path.split('/')
    let currentPath = ''
    let parent = root
    for (const segment of segments) {
      currentPath = currentPath ? `${currentPath}/${segment}` : segment
      const node = ensureNode(currentPath, segment)
      if (!parent.children.some((child) => child.path === node.path)) {
        parent.children.push(node)
      }
      parent = node
    }
    const stat = statsByPath[path]
    if (stat) {
      parent.count = stat.cardsCount
    }
  })

  const sortTree = (node: TagNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name))
    node.children.forEach(sortTree)
  }
  sortTree(root)

  return root
}

const Chart = ({
  data
}: {
  data: Array<{ date: string; good: number; bad: number; total: number }>
}) => {
  const max = Math.max(1, ...data.map((item) => item.total))
  const hasReviews = data.some((item) => item.total > 0)
  return (
    <div className="card section">
      <h2>Revisions par jour</h2>
      {!hasReviews ? (
        <p>Aucune révision sur cette période.</p>
      ) : (
        <>
          <div className="chart">
            {data.map((item) => (
              <div key={item.date} className="chart-col">
                <div
                  className="chart-bar"
                  style={{ height: `${(item.total / max) * 100}%` }}
                  title={`Bon: ${item.good} | Faux: ${item.bad}`}
                >
                  <div
                    className="chart-bar-good"
                    style={{ height: `${(item.good / Math.max(1, item.total)) * 100}%` }}
                  />
                  <div
                    className="chart-bar-bad"
                    style={{ height: `${(item.bad / Math.max(1, item.total)) * 100}%` }}
                  />
                </div>
                <div className="chart-label">{item.date.slice(5)}</div>
              </div>
            ))}
          </div>
          <p>Vert: bon, rose: faux (empilé).</p>
        </>
      )}
    </div>
  )
}

function StatsPage() {
  const [periodDays, setPeriodDays] = useState<7 | 30 | 90>(7)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [tagRowsLimitByKey, setTagRowsLimitByKey] = useState<Record<string, number>>({})
  const stats = useStats(periodDays)
  const minReviewsForWeakTag = 10

  const tagTree = useMemo(() => buildTagTree(stats.tagAgg), [stats.tagAgg])

  const renderTagNodes = (nodes: TagNode[], depth = 0) => {
    if (nodes.length === 0) {
      return null
    }
    return (
      <ul className="tree">
        {nodes.map((node) => {
          const isCollapsed = collapsed[node.path] ?? false
          const hasChildren = node.children.length > 0
          return (
            <li key={node.path}>
              <div className="tree-row">
                {hasChildren ? (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() =>
                      setCollapsed((prev) => ({
                        ...prev,
                        [node.path]: !isCollapsed
                      }))
                    }
                  >
                    {isCollapsed ? '▸' : '▾'}
                  </button>
                ) : (
                  <span className="tree-spacer" />
                )}
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedTag(node.path)}
                >
                  {node.name} ({node.count})
                </button>
              </div>
              {!isCollapsed ? renderTagNodes(node.children, depth + 1) : null}
            </li>
          )}
        )}
      </ul>
    )
  }

  const selectedStat = selectedTag ? stats.tagAgg[selectedTag] : null

  const tagRows = useMemo(() => {
    const targetNode = selectedTag
      ? (() => {
          const findNode = (node: TagNode): TagNode | null => {
            if (node.path === selectedTag) {
              return node
            }
            for (const child of node.children) {
              const found = findNode(child)
              if (found) {
                return found
              }
            }
            return null
          }
          return findNode(tagTree)
        })()
      : null

    const rows = selectedTag && targetNode ? targetNode.children : tagTree.children
    return rows
      .map((node) => stats.tagAgg[node.path])
      .filter((item): item is TagAgg => Boolean(item))
  }, [selectedTag, stats.tagAgg, tagTree])

  const tagKey = selectedTag ?? '__root__'
  const tagRowsLimit = tagRowsLimitByKey[tagKey] ?? 50
  const visibleTagRows = useMemo(
    () => tagRows.slice(0, tagRowsLimit),
    [tagRows, tagRowsLimit]
  )

  const tagReviewCounts = useMemo(() => {
    const prefixesByCard = new Map<number, string[]>()
    const buildPrefixes = (tags: string[]) => {
      const prefixes = new Set<string>()
      tags.forEach((tag) => {
        const parts = tag
          .split('/')
          .map((part) => part.trim())
          .filter(Boolean)
        if (parts.length === 0) {
          return
        }
        for (let i = 0; i < parts.length; i += 1) {
          prefixes.add(parts.slice(0, i + 1).join('/'))
        }
      })
      return Array.from(prefixes)
    }

    stats.cards.forEach((card) => {
      if (!card.id) {
        return
      }
      prefixesByCard.set(card.id, buildPrefixes(card.tags))
    })

    const counts = new Map<string, number>()
    stats.reviewLogs.forEach((log) => {
      const prefixes = prefixesByCard.get(log.card_id) ?? []
      prefixes.forEach((prefix) => {
        counts.set(prefix, (counts.get(prefix) ?? 0) + 1)
      })
    })
    return counts
  }, [stats.cards, stats.reviewLogs])

  const weakTags = useMemo(() => {
    const list = Object.values(stats.tagAgg)
      .filter((tag) => {
        const reviews = tagReviewCounts.get(tag.tagPath) ?? 0
        return reviews >= minReviewsForWeakTag && tag.successRate !== null
      })
      .sort((a, b) => (a.successRate ?? 0) - (b.successRate ?? 0))
      .slice(0, 10)
    return list.map((tag) => ({
      ...tag,
      reviews: tagReviewCounts.get(tag.tagPath) ?? 0
    }))
  }, [minReviewsForWeakTag, stats.tagAgg, tagReviewCounts])

  return (
    <main className="container page">
      <div className="page-header">
        <h1>Stats</h1>
        <p>Suivi global, progression et tags.</p>
      </div>

      {stats.isLoading ? <p>Chargement...</p> : null}
      {stats.error ? <p>{stats.error}</p> : null}

      {!stats.isLoading ? (
        <section className="card section">
          <h2>Vue globale</h2>
          <div className="card-list">
            <div className="card list-item">
              <h3>Total cartes</h3>
              <p>{stats.global.totalCards}</p>
            </div>
            <div className="card list-item">
              <h3>Cartes dues aujourd'hui</h3>
              <p>{stats.global.dueToday}</p>
            </div>
            <div className="card list-item">
              <h3>Cartes learned</h3>
              <p>{stats.global.learnedCount}</p>
            </div>
            <div className="card list-item">
              <h3>Revisions aujourd'hui</h3>
              <p>{stats.global.reviewsToday}</p>
            </div>
            <div className="card list-item">
              <h3>Taux reussite 7j</h3>
              <p>
                {stats.global.successRate7d === null
                  ? '—'
                  : `${Math.round(stats.global.successRate7d * 100)}%`}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="card section">
        <h2>Progression (revisions)</h2>
        <div className="panel-header">
          {([7, 30, 90] as const).map((days) => (
            <button
              key={days}
              type="button"
              className={days === periodDays ? 'btn btn-primary' : 'btn btn-secondary'}
              onClick={() => setPeriodDays(days)}
            >
              {days} jours
            </button>
          ))}
        </div>
        <Chart data={stats.dailyReviews} />
      </section>

      <section className="card section">
        <h2>Repartition par box</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Box</th>
              <th>Cartes</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3, 4, 5].map((box) => (
              <tr key={box}>
                <td>Box {box}</td>
                <td>{stats.boxDistribution.counts[box] ?? 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card section split">
        <div className="sidebar">
          <h2>Tags</h2>
          <button type="button" className="btn btn-primary" onClick={() => setSelectedTag(null)}>
            Tous les tags
          </button>
          {tagTree.children.length === 0 ? <p>Aucun tag.</p> : null}
          {renderTagNodes(tagTree.children)}
        </div>
        <div className="panel">
          <h2>{selectedTag ? `Tag: ${selectedTag}` : 'Tous les tags'}</h2>
          {selectedStat ? (
            <div className="card list-item">
              <p>Cartes: {selectedStat.cardsCount}</p>
              <p>Box moyenne: {selectedStat.avgBox}</p>
              <p>
                Taux de reussite:{' '}
                {selectedStat.successRate === null
                  ? '—'
                  : `${Math.round(selectedStat.successRate * 100)}%`}
              </p>
              <p>Cartes dues: {selectedStat.dueCount}</p>
            </div>
          ) : (
            <div className="card list-item">
              <p>Selectionne un tag pour voir les details.</p>
            </div>
          )}
          <div className="section">
            <h3>Agregats</h3>
            {tagRows.length === 0 ? (
              <p>Aucune donnee.</p>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>Tag</th>
                    <th>Cartes</th>
                    <th>Dues</th>
                    <th>Box moy.</th>
                    <th>Taux</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTagRows.map((row) => (
                    <tr key={row.tagPath}>
                      <td>{row.tagPath}</td>
                      <td>{row.cardsCount}</td>
                      <td>{row.dueCount}</td>
                      <td>{row.avgBox}</td>
                      <td>
                        {row.successRate === null
                          ? '—'
                          : `${Math.round(row.successRate * 100)}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {tagRows.length > tagRowsLimit ? (
              <button
                type="button"
                className="btn btn-secondary section"
                onClick={() =>
                  setTagRowsLimitByKey((prev) => ({
                    ...prev,
                    [tagKey]: tagRowsLimit + 50
                  }))
                }
              >
                Charger plus
              </button>
            ) : null}
          </div>
        </div>
      </section>

      <section className="card section">
        <h2>A travailler</h2>
        <p>Tags avec faible taux de reussite (min {minReviewsForWeakTag} reviews).</p>
        {weakTags.length === 0 ? (
          <p>Aucune donnee suffisante.</p>
        ) : (
          <ul className="card-list">
            {weakTags.map((tag) => (
              <li key={tag.tagPath} className="card list-item">
                <h3>{tag.tagPath}</h3>
                <p>Reviews: {tag.reviews}</p>
                <p>
                  Taux: {tag.successRate === null ? '—' : `${Math.round(tag.successRate * 100)}%`}
                </p>
                <Link to={`/review?tag=${encodeURIComponent(tag.tagPath)}`} className="btn btn-primary">
                  Reviser ce tag
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}

export default StatsPage
