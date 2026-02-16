import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TagAgg } from '../stats/types'
import { useStats } from '../stats/hooks'
import { useI18n } from '../i18n/useI18n'

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
  const { t } = useI18n()
  const max = Math.max(1, ...data.map((item) => item.total))
  const hasReviews = data.some((item) => item.total > 0)
  return (
    <div className="card section">
      <h2>{t('stats.reviews')}</h2>
      {!hasReviews ? (
        <p>{t('status.none')}</p>
      ) : (
        <>
          <div className="chart">
            {data.map((item) => (
              <div key={item.date} className="chart-col">
                <div
                  className="chart-bar"
                  style={{ height: `${(item.total / max) * 100}%` }}
                  title={`${t('review.good')}: ${item.good} | ${t('review.bad')}: ${item.bad}`}
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
          <p>Vert: {t('review.good').toLowerCase()}, rose: {t('review.bad').toLowerCase()}.</p>
        </>
      )}
    </div>
  )
}

function StatsPage() {
  const { t } = useI18n()
  const [periodDays, setPeriodDays] = useState<7 | 30>(7)
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
    <main className="container page stats-page">
      <div className="page-header">
        <h1>{t('stats.title')}</h1>
        <p>{t('stats.subtitle')}</p>
      </div>

      {stats.isLoading ? <p>{t('status.loading')}</p> : null}
      {stats.error ? <p>{stats.error}</p> : null}

      <div className="stats-layout">
        <div className="stats-grid-top">
          {!stats.isLoading ? (
            <section className="card section stats-overview">
              <h2>{t('stats.overview')}</h2>
              <div className="card-list">
                <div className="card list-item">
                  <h3>{t('labels.total')}</h3>
                  <p>{stats.global.totalCards}</p>
                </div>
                <div className="card list-item">
                  <h3>{t('stats.dueToday')}</h3>
                  <p>{stats.global.dueToday}</p>
                </div>
                <div className="card list-item">
                  <h3>{t('stats.learned')}</h3>
                  <p>{stats.global.learnedCount}</p>
                </div>
                <div className="card list-item">
                  <h3>{t('stats.reviewsToday')}</h3>
                  <p>{stats.global.reviewsToday}</p>
                </div>
                <div className="card list-item">
                  <h3>{t('stats.successRate7d')}</h3>
                  <p>
                    {stats.global.successRate7d === null
                      ? t('status.none')
                      : `${Math.round(stats.global.successRate7d * 100)}%`}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          <section className="card section stats-box-split">
            <h2>{t('stats.boxSplit')}</h2>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('labels.box')}</th>
                  <th>{t('labels.total')}</th>
                </tr>
              </thead>
              <tbody>
                {[0, 1, 2, 3, 4, 5].map((box) => (
                  <tr key={box}>
                    <td>
                      {t('labels.box')} {box}
                    </td>
                    <td>{stats.boxDistribution.counts[box] ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </div>

        <section className="card section stats-progress">
          <h2>{t('stats.progress')}</h2>
          <div className="panel-header">
            {([7, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                className={days === periodDays ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setPeriodDays(days)}
              >
                {days === 7 ? t('stats.period7') : t('stats.period30')}
              </button>
            ))}
          </div>
          <Chart data={stats.dailyReviews} />
        </section>

        <section className="card section split stats-tags">
          <div className="sidebar">
            <h2>Tags</h2>
            <button type="button" className="btn btn-primary" onClick={() => setSelectedTag(null)}>
              {t('stats.tagsAll')}
            </button>
            {tagTree.children.length === 0 ? <p>{t('library.noTags')}</p> : null}
            {renderTagNodes(tagTree.children)}
          </div>
          <div className="panel">
            <h2>{selectedTag ? `${t('library.tag')}: ${selectedTag}` : t('stats.tagsAll')}</h2>
            {selectedStat ? (
              <div className="card list-item">
                <p>{t('labels.total')}: {selectedStat.cardsCount}</p>
                <p>{t('labels.box')}: {selectedStat.avgBox}</p>
                <p>
                  {t('stats.rate')}:{' '}
                  {selectedStat.successRate === null
                    ? t('status.none')
                    : `${Math.round(selectedStat.successRate * 100)}%`}
                </p>
                <p>{t('stats.dueToday')}: {selectedStat.dueCount}</p>
              </div>
            ) : (
              <div className="card list-item">
                <p>{t('stats.selectTag')}</p>
              </div>
            )}
            <div className="section">
              <h3>{t('stats.aggregates')}</h3>
              {tagRows.length === 0 ? (
                <p>{t('stats.noData')}</p>
              ) : (
                <table className="table">
                  <thead>
                    <tr>
                      <th>Tag</th>
                      <th>{t('labels.total')}</th>
                      <th>{t('stats.dueToday')}</th>
                      <th>{t('labels.box')}</th>
                      <th>{t('stats.rate')}</th>
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
                            ? t('status.none')
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
                  {t('actions.loadMore')}
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card section stats-weak-tags">
          <h2>{t('stats.workOn')}</h2>
          <p>{t('stats.lowRateHint', { min: minReviewsForWeakTag })}</p>
          {weakTags.length === 0 ? (
            <p>{t('stats.noData')}</p>
          ) : (
            <ul className="card-list">
              {weakTags.map((tag) => (
                <li key={tag.tagPath} className="card list-item">
                  <h3>{tag.tagPath}</h3>
                  <p>{t('stats.reviews')}: {tag.reviews}</p>
                  <p>
                    {t('stats.rate')}:{' '}
                    {tag.successRate === null
                      ? t('status.none')
                      : `${Math.round(tag.successRate * 100)}%`}
                  </p>
                  <Link
                    to={`/review?tag=${encodeURIComponent(tag.tagPath)}`}
                    className="btn btn-primary"
                  >
                    {t('stats.reviewTag')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  )
}

export default StatsPage
