import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TagStat } from '../stats/calculations'
import { useStats } from '../stats/hooks'

type TagNode = {
  path: string
  name: string
  count: number
  children: TagNode[]
}

const buildTagTree = (statsByPath: Record<string, TagStat>): TagNode => {
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
      parent.count = stat.cardCount
    }
  })

  const sortTree = (node: TagNode) => {
    node.children.sort((a, b) => a.name.localeCompare(b.name))
    node.children.forEach(sortTree)
  }
  sortTree(root)

  return root
}

const Chart = ({ data }: { data: Array<{ date: string; good: number; bad: number; total: number }> }) => {
  const max = Math.max(1, ...data.map((item) => item.total))
  return (
    <div className="card section">
      <h2>Revisions par jour</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 160 }}>
        {data.map((item) => (
          <div key={item.date} style={{ flex: 1, textAlign: 'center' }}>
            <div
              style={{
                height: `${(item.good / max) * 100}%`,
                background: '#0f766e',
                borderRadius: 6
              }}
              title={`Bon: ${item.good}`}
            />
            <div
              style={{
                height: `${(item.bad / max) * 100}%`,
                background: '#fb7185',
                borderRadius: 6,
                marginTop: 4
              }}
              title={`Faux: ${item.bad}`}
            />
            <div style={{ fontSize: 12, color: '#64748b' }}>{item.date.slice(5)}</div>
          </div>
        ))}
      </div>
      <p>Vert: bon, rose: faux.</p>
    </div>
  )
}

function StatsPage() {
  const [periodDays, setPeriodDays] = useState(7)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const stats = useStats(periodDays)

  const tagTree = useMemo(() => buildTagTree(stats.tagStats.statsByPath), [stats.tagStats])

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

  const selectedStat = selectedTag ? stats.tagStats.statsByPath[selectedTag] : null

  const tagRanking = useMemo(() => {
    const statsList = Object.values(stats.tagStats.statsByPath)
      .filter((item) => item.reviewsTotal > 0)
      .sort((a, b) => (a.successRate ?? 0) - (b.successRate ?? 0))
    return {
      weakest: statsList.slice(0, 5),
      strongest: statsList.slice(-5).reverse()
    }
  }, [stats.tagStats])

  return (
    <main className="container">
      <div className="page-header">
        <h1>Stats</h1>
        <p>Suivi global, progression, tags et performance Leitner.</p>
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
              <h3>Revisions totales</h3>
              <p>{stats.global.reviewsTotal}</p>
            </div>
            <div className="card list-item">
              <h3>Revisions aujourd'hui</h3>
              <p>{stats.global.reviewsToday}</p>
            </div>
          </div>
          <div className="section">
            <h3>Repartition par box</h3>
            <ul>
              {[0, 1, 2, 3, 4, 5].map((box) => (
                <li key={box}>
                  Box {box}: {stats.global.boxCounts[box] ?? 0}
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section className="card section">
        <h2>Progression (revisions)</h2>
        <div className="panel-header">
          {[7, 30, 90].map((days) => (
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
        <Chart data={stats.reviewSeries} />
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
              <p>Cartes: {selectedStat.cardCount}</p>
              <p>Box moyenne: {selectedStat.avgBox}</p>
              <p>
                Taux de reussite:{' '}
                {selectedStat.successRate === null
                  ? '—'
                  : `${Math.round(selectedStat.successRate * 100)}%`}
              </p>
            </div>
          ) : (
            <div className="card list-item">
              <p>Selectionne un tag pour voir les details.</p>
            </div>
          )}
          <div className="section">
            <h3>Tags faibles</h3>
            {tagRanking.weakest.length === 0 ? (
              <p>Aucune donnee.</p>
            ) : (
              <ul>
                {tagRanking.weakest.map((item) => (
                  <li key={item.path}>
                    {item.path} ({Math.round((item.successRate ?? 0) * 100)}%)
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="section">
            <h3>Tags maitrises</h3>
            {tagRanking.strongest.length === 0 ? (
              <p>Aucune donnee.</p>
            ) : (
              <ul>
                {tagRanking.strongest.map((item) => (
                  <li key={item.path}>
                    {item.path} ({Math.round((item.successRate ?? 0) * 100)}%)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="card section">
        <h2>Leitner</h2>
        <div className="card-list">
          <div className="card list-item">
            <h3>Temps moyen avant promotion</h3>
            <p>
              {stats.leitner.avgDaysToPromote === null
                ? '—'
                : `${stats.leitner.avgDaysToPromote} jours`}
            </p>
          </div>
          <div className="card list-item">
            <h3>Taux de rechute (retour Box 1)</h3>
            <p>
              {stats.leitner.relapseRate === null
                ? '—'
                : `${Math.round(stats.leitner.relapseRate * 100)}%`}
            </p>
          </div>
        </div>
        <div className="section">
          <h3>Flux entre boxes</h3>
          {stats.leitner.transitions.length === 0 ? (
            <p>Aucune donnee.</p>
          ) : (
            <ul>
              {stats.leitner.transitions.map((transition) => (
                <li key={`${transition.from}-${transition.to}`}>
                  {transition.from} → {transition.to}: {transition.count}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="card section">
        <h2>Cartes individuelles</h2>
        <div className="card-list">
          <div className="card list-item">
            <h3>Jamais revisees</h3>
            {stats.insights.neverReviewed.length === 0 ? (
              <p>—</p>
            ) : (
              <ul>
                {stats.insights.neverReviewed.map((card) => (
                  <li key={card.id}>{card.front}</li>
                ))}
              </ul>
            )}
          </div>
          <div className="card list-item">
            <h3>Plus echouees</h3>
            {stats.insights.mostFailed.length === 0 ? (
              <p>—</p>
            ) : (
              <ul>
                {stats.insights.mostFailed.map((card) => (
                  <li key={card.id}>
                    {card.front} ({card.fails})
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="card list-item">
            <h3>Bloquees en box basse</h3>
            {stats.insights.stuckLowBox.length === 0 ? (
              <p>—</p>
            ) : (
              <ul>
                {stats.insights.stuckLowBox.map((card) => (
                  <li key={card.id}>
                    {card.front} ({card.daysOverdue}j)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default StatsPage
