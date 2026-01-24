import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { deleteCard, listCardsWithReviewState } from '../db/queries'
import type { Card, ReviewState } from '../db/types'
import { buildTagTree, type TagNode } from '../utils/tagTree'

function Library() {
  const [cards, setCards] = useState<Array<{ card: Card; reviewState?: ReviewState }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({})
  const [visibleCount, setVisibleCount] = useState(100)

  const loadCards = async () => {
    const data = await listCardsWithReviewState(0)
    setCards(data)
    setIsLoading(false)
  }

  useEffect(() => {
    void loadCards()
  }, [])

  useEffect(() => {
    setVisibleCount(100)
  }, [query, selectedTag])

  const handleDelete = async (card: Card) => {
    if (!card.id) {
      return
    }
    const confirmed = window.confirm('Supprimer cette carte ?')
    if (!confirmed) {
      return
    }
    await deleteCard(card.id)
    await loadCards()
  }

  const tagTree = useMemo(
    () => buildTagTree(cards.map(({ card }) => card.tags)),
    [cards]
  )

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return cards.filter(({ card }) => {
      if (selectedTag) {
        const hasTag = card.tags.some((tag) => {
          const normalized = tag.trim()
          return (
            normalized === selectedTag ||
            normalized.startsWith(`${selectedTag}/`)
          )
        })
        if (!hasTag) {
          return false
        }
      }

      if (normalizedQuery) {
        const haystack = `${card.front_md} ${card.back_md}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) {
          return false
        }
      }

      return true
    })
  }, [cards, query, selectedTag])

  const visibleCards = useMemo(
    () => filteredCards.slice(0, visibleCount),
    [filteredCards, visibleCount]
  )

  const renderTagNodes = (nodes: TagNode[], depth = 0) => {
    if (nodes.length === 0) {
      return null
    }
    return (
      <ul className="tree" style={{ paddingLeft: depth * 16 }}>
        {nodes.map((node) => {
          const isCollapsed = collapsed[node.path] ?? true
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
          )
        })}
      </ul>
    )
  }

  const breadcrumbParts = selectedTag ? selectedTag.split('/') : []
  const breadcrumbPaths = breadcrumbParts.map((_, index) =>
    breadcrumbParts.slice(0, index + 1).join('/')
  )

  const handleGoUp = () => {
    if (!selectedTag) {
      return
    }
    const parts = selectedTag.split('/')
    if (parts.length <= 1) {
      setSelectedTag(null)
      return
    }
    setSelectedTag(parts.slice(0, -1).join('/'))
  }

  const renderMarkdown = (value: string) => <MarkdownRenderer value={value} />

  return (
    <main className="container page">
      <div className="page-header">
        <h1>Library</h1>
        <p>Explore tes cartes par dossiers de tags.</p>
      </div>
      <p>
        <Link to="/card/new" className="btn btn-primary">
          Ajouter une carte
        </Link>
      </p>
      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <section className="card section split">
          <div className="sidebar">
            <h2>Tags</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelectedTag(null)}
            >
              Toutes les cartes
            </button>
            {tagTree.children.length === 0 ? <p>Aucun tag pour le moment.</p> : null}
            {renderTagNodes(tagTree.children)}
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2>{selectedTag ? `Tag: ${selectedTag}` : 'Toutes les cartes'}</h2>
              {selectedTag ? (
                <button type="button" className="btn btn-secondary" onClick={handleGoUp}>
                  Remonter
                </button>
              ) : null}
            </div>
            {breadcrumbParts.length > 0 ? (
              <div className="breadcrumb">
                {breadcrumbParts.map((part, index) => (
                  <span key={breadcrumbPaths[index]} className="chip">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setSelectedTag(breadcrumbPaths[index])}
                    >
                      {part}
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <label htmlFor="search">Recherche</label>
            <input
              id="search"
              type="text"
              value={query}
              className="input"
              onChange={(event) => setQuery(event.target.value)}
            />
            {filteredCards.length === 0 ? <p>Aucune carte pour le moment.</p> : null}
            {filteredCards.length > 0 ? (
              <ul className="card-list">
                {visibleCards.map(({ card, reviewState }) => (
                  <li key={card.id} className="card list-item">
                    <Link to={`/card/${card.id}/edit`} className="markdown">
                      <MarkdownRenderer value={card.front_md || '*Sans front*'} />
                    </Link>
                    <p>
                      Box {reviewState?.box ?? 0} · Due {reviewState?.due_date ?? '—'}
                    </p>
                    {card.hint_md ? (
                      <div className="section">
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() =>
                            setOpenHints((prev) => ({
                              ...prev,
                              [card.id ?? 0]: !prev[card.id ?? 0]
                            }))
                          }
                        >
                          {openHints[card.id ?? 0] ? "Masquer l'indice" : "Afficher l'indice"}
                        </button>
                        {openHints[card.id ?? 0] ? (
                          <div className="markdown">{renderMarkdown(card.hint_md)}</div>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDelete(card)}
                    >
                      Supprimer
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            {filteredCards.length > visibleCount ? (
              <button
                type="button"
                className="btn btn-secondary section"
                onClick={() => setVisibleCount((prev) => prev + 100)}
              >
                Charger plus
              </button>
            ) : null}
          </div>
        </section>
      )}
    </main>
  )
}

export default Library
