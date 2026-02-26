import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import MarkdownRenderer from '../components/MarkdownRenderer'
import {
  deleteCard,
  deleteCardsByTag,
  listCardsWithReviewState,
  setCardsSuspended,
  updateCard
} from '../db/queries'
import type { Card, ReviewState } from '../db/types'
import { buildTagTree, type TagNode } from '../utils/tagTree'
import ConfirmDialog from '../components/ConfirmDialog'
import { saveTrainingQueue } from '../utils/training'
import { useI18n } from '../i18n/useI18n'
import { blobToBase64, downloadJson, type ExportMedia, type ExportPayload } from '../utils/export'
import db from '../db'

const SUSPENDED_BOX = -1

function Library() {
  const { t, language } = useI18n()
  const [cards, setCards] = useState<Array<{ card: Card; reviewState?: ReviewState }>>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedBoxes, setSelectedBoxes] = useState<number[]>([])
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [openHints, setOpenHints] = useState<Record<number, boolean>>({})
  const [visibleCount, setVisibleCount] = useState(100)
  const [tagDeleteOpen, setTagDeleteOpen] = useState(false)
  const [includeSubTags, setIncludeSubTags] = useState(true)
  const [isTagDeleting, setIsTagDeleting] = useState(false)
  const [cardToDelete, setCardToDelete] = useState<Card | null>(null)
  const [isCardDeleting, setIsCardDeleting] = useState(false)
  const [exportStatus, setExportStatus] = useState('')
  const navigate = useNavigate()

  const formatDueDate = (value: string | null | undefined) => {
    if (!value) {
      return t('status.none')
    }
    const [year, month, day] = value.split('-').map(Number)
    if (!year || !month || !day) {
      return value
    }
    const date = new Date(Date.UTC(year, month - 1, day))
    const locale = language === 'fr' ? 'fr-FR' : 'en-US'
    return date.toLocaleDateString(locale, {
      timeZone: 'UTC',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const loadCards = async () => {
    const data = await listCardsWithReviewState(0)
    setCards(data)
    setIsLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadCards()
  }, [])

  const handleDelete = (card: Card) => {
    if (!card.id) {
      return
    }
    setCardToDelete(card)
  }

  const handleSelectTag = (tag: string | null) => {
    setSelectedTag(tag)
    setVisibleCount(100)
    setExportStatus('')
  }

  const toggleBoxFilter = (box: number) => {
    setSelectedBoxes((prev) => {
      const next = prev.includes(box) ? prev.filter((item) => item !== box) : [...prev, box]
      return next.sort((a, b) => a - b)
    })
    setVisibleCount(100)
    setExportStatus('')
  }

  const clearBoxFilter = () => {
    setSelectedBoxes([])
    setVisibleCount(100)
    setExportStatus('')
  }

  const tagDeleteCount = useMemo(() => {
    if (!selectedTag) {
      return 0
    }
    return cards.filter(({ card }) =>
      includeSubTags
        ? card.tags.some((tag) => tag === selectedTag || tag.startsWith(`${selectedTag}/`))
        : card.tags.some((tag) => tag === selectedTag)
    ).length
  }, [cards, includeSubTags, selectedTag])

  const openTagDelete = () => {
    if (!selectedTag) {
      return
    }
    setTagDeleteOpen(true)
  }

  const handleDeleteByTag = async () => {
    if (!selectedTag || isTagDeleting) {
      return
    }
    setIsTagDeleting(true)
    await deleteCardsByTag(selectedTag, includeSubTags)
    await loadCards()
    setIsTagDeleting(false)
    setTagDeleteOpen(false)
  }

  const confirmDeleteCard = async () => {
    if (!cardToDelete?.id || isCardDeleting) {
      return
    }
    setIsCardDeleting(true)
    await deleteCard(cardToDelete.id)
    await loadCards()
    setIsCardDeleting(false)
    setCardToDelete(null)
  }

  const tagTree = useMemo(
    () => buildTagTree(cards.map(({ card }) => card.tags)),
    [cards]
  )

  const totalCardsCount = cards.length
  const boxOptions = [0, 1, 2, 3, 4, 5]
  const boxCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    cards.forEach(({ reviewState }) => {
      const box = reviewState?.box ?? 0
      if (typeof counts[box] === 'number') {
        counts[box] += 1
      }
    })
    return counts
  }, [cards])
  const suspendedCount = useMemo(
    () => cards.filter(({ card }) => card.suspended).length,
    [cards]
  )

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return cards.filter(({ card, reviewState }) => {
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

      if (selectedBoxes.length > 0) {
        const selectedActiveBoxes = selectedBoxes.filter((box) => box !== SUSPENDED_BOX)
        const includeSuspended = selectedBoxes.includes(SUSPENDED_BOX)
        if (card.suspended) {
          if (!includeSuspended) {
            return false
          }
        } else {
          const cardBox = reviewState?.box ?? 0
          if (selectedActiveBoxes.length === 0 || !selectedActiveBoxes.includes(cardBox)) {
            return false
          }
        }
      }

      if (normalizedQuery) {
        const haystack = `${card.front_md} ${card.back_md} ${card.tags.join(' ')}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) {
          return false
        }
      }

      return true
    })
  }, [cards, query, selectedBoxes, selectedTag])

  const visibleCards = useMemo(
    () => filteredCards.slice(0, visibleCount),
    [filteredCards, visibleCount]
  )
  const selectedCardIds = useMemo(
    () =>
      filteredCards
        .map(({ card }) => card.id)
        .filter((id): id is number => typeof id === 'number'),
    [filteredCards]
  )
  const filteredSuspendedCount = useMemo(
    () => filteredCards.filter(({ card }) => card.suspended).length,
    [filteredCards]
  )
  const filteredActiveCount = filteredCards.length - filteredSuspendedCount
  const trainingCardIds = useMemo(
    () =>
      filteredCards
        .filter(({ card }) => !card.suspended)
        .map(({ card }) => card.id)
        .filter((id): id is number => typeof id === 'number'),
    [filteredCards]
  )

  const handleExportSelection = async () => {
    if (selectedCardIds.length === 0) {
      return
    }
    setExportStatus(t('importExport.exportInProgress'))
    try {
      const deckCardIds = new Set(selectedCardIds)
      const [media, reviewLogs] = await Promise.all([
        db.media.where('card_id').anyOf(selectedCardIds).toArray(),
        db.reviewLogs.where('card_id').anyOf(selectedCardIds).toArray()
      ])

      const exportMedia: ExportMedia[] = []
      for (const item of media) {
        const base64 = await blobToBase64(item.blob)
        exportMedia.push({
          card_id: item.card_id,
          side: item.side,
          mime: item.mime,
          base64
        })
      }

      const payload: ExportPayload = {
        schema_version: 1,
        cards: filteredCards.map(({ card }) => card),
        reviewStates: filteredCards
          .map(({ reviewState }) => reviewState)
          .filter((state): state is ReviewState => Boolean(state)),
        media: exportMedia,
        reviewLogs: reviewLogs.filter((log) => deckCardIds.has(log.card_id))
      }

      const safeTagName = selectedTag ? selectedTag.replaceAll('/', '-') : 'all'
      downloadJson(payload, `cards-export-${safeTagName}.json`)
      setExportStatus(t('importExport.exportDone'))
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      setExportStatus(t('library.exportFailed', { message }))
    }
  }

  const handleTraining = () => {
    if (trainingCardIds.length === 0) {
      return
    }
    saveTrainingQueue(trainingCardIds)
    navigate('/review?mode=training')
  }

  const handleToggleSuspended = async (card: Card) => {
    if (!card.id) {
      return
    }
    await updateCard(card.id, { suspended: !card.suspended })
    await loadCards()
  }

  const handleSetSuspendedForFiltered = async (suspended: boolean) => {
    if (selectedCardIds.length === 0) {
      return
    }
    await setCardsSuspended(selectedCardIds, suspended)
    await loadCards()
  }

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
                onClick={() => handleSelectTag(node.path)}
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
      handleSelectTag(null)
      return
    }
    handleSelectTag(parts.slice(0, -1).join('/'))
  }

  const renderMarkdown = (value: string) => <MarkdownRenderer value={value} />

  return (
    <main className="container page">
      <div className="page-header">
        <h1>{t('library.title')}</h1>
        <p>{t('library.subtitle')}</p>
      </div>
      <p>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate('/card/new')}
        >
          {t('actions.addCard')}
        </button>
      </p>
      {isLoading ? (
        <p>{t('status.loading')}</p>
      ) : (
        <section className="card section split">
          <div className="sidebar">
            <h2>{t('labels.tags')}</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => handleSelectTag(null)}
            >
              {t('library.allCards')}
            </button>
            {tagTree.children.length === 0 ? <p>{t('library.noTags')}</p> : null}
            {renderTagNodes(tagTree.children)}
          </div>
          <div className="panel">
            <div className="panel-header">
              <h2>
                {selectedTag ? `${t('library.tag')}: ${selectedTag}` : t('library.allCards')}
              </h2>
              <span className="chip">
                {t('labels.total')}: {totalCardsCount}
              </span>
              {selectedTag ? (
                <button type="button" className="btn btn-secondary" onClick={handleGoUp}>
                  {t('actions.up')}
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleTraining}
                disabled={trainingCardIds.length === 0}
              >
                {t('actions.training')}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => void handleExportSelection()}
                disabled={selectedCardIds.length === 0}
              >
                {t('library.exportSelection')}
              </button>
              <div className="panel-actions">
                <span className="chip">{t('labels.boxes')}</span>
                <div className="filter-group">
                  {boxOptions.map((box) => (
                    <button
                      key={box}
                      type="button"
                      className={`btn btn-secondary btn-toggle${
                        selectedBoxes.includes(box) ? ' is-active' : ''
                      }`}
                      onClick={() => toggleBoxFilter(box)}
                    >
                      {box} ({boxCounts[box] ?? 0})
                    </button>
                  ))}
                  <button
                    type="button"
                    className={`btn btn-secondary btn-toggle${
                      selectedBoxes.includes(SUSPENDED_BOX) ? ' is-active' : ''
                    }`}
                    onClick={() => toggleBoxFilter(SUSPENDED_BOX)}
                  >
                    {t('labels.suspended')} ({suspendedCount})
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={clearBoxFilter}
                    disabled={selectedBoxes.length === 0}
                  >
                    {t('library.clearBoxes')}
                  </button>
                </div>
              </div>
            </div>
            {selectedTag ? (
              <div className="section">
                <button type="button" className="btn btn-danger" onClick={openTagDelete}>
                  {t('library.deleteByTag')}
                </button>
              </div>
            ) : null}
            {selectedCardIds.length > 0 ? (
              <div className="section button-row">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleSetSuspendedForFiltered(true)}
                  disabled={filteredActiveCount === 0}
                >
                  {t('actions.suspendSelection')}
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void handleSetSuspendedForFiltered(false)}
                  disabled={filteredSuspendedCount === 0}
                >
                  {t('actions.resumeSelection')}
                </button>
              </div>
            ) : null}
            {breadcrumbParts.length > 0 ? (
              <div className="breadcrumb">
                {breadcrumbParts.map((part, index) => (
                  <span key={breadcrumbPaths[index]} className="chip">
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleSelectTag(breadcrumbPaths[index])}
                    >
                      {part}
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
            <label htmlFor="search">{t('labels.search')}</label>
            <input
              id="search"
              type="text"
              value={query}
              className="input"
              onChange={(event) => {
                setQuery(event.target.value)
                setVisibleCount(100)
                setExportStatus('')
              }}
            />
            {exportStatus ? <p>{exportStatus}</p> : null}
            {filteredCards.length === 0 ? <p>{t('library.noCards')}</p> : null}
            {filteredCards.length > 0 ? (
              <ul className="card-list">
                {visibleCards.map(({ card, reviewState }) => (
                  <li key={card.id} className="card list-item">
                    <Link to={`/card/${card.id}/edit`} className="markdown">
                      <MarkdownRenderer value={card.front_md || `*${t('library.noFront')}*`} />
                    </Link>
                    <div className="chip">
                      {t('labels.box')} {reviewState?.box ?? 0}
                    </div>
                    {card.suspended ? (
                      <div className="chip">{t('labels.suspended')}</div>
                    ) : null}
                    <p>
                      {t('labels.nextReview')}: {formatDueDate(reviewState?.due_date)}
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
                          {openHints[card.id ?? 0]
                            ? t('labels.hideHint')
                            : t('labels.showHint')}
                        </button>
                        {openHints[card.id ?? 0] ? (
                          <div className="markdown">{renderMarkdown(card.hint_md)}</div>
                        ) : null}
                      </div>
                    ) : null}
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => void handleToggleSuspended(card)}
                    >
                      {card.suspended ? t('actions.resumeCard') : t('actions.suspendCard')}
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => handleDelete(card)}
                    >
                      {t('actions.delete')}
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
                {t('actions.loadMore')}
              </button>
            ) : null}
          </div>
        </section>
      )}
      <ConfirmDialog
        open={tagDeleteOpen}
        title={t('library.deleteByTag')}
        message={
          selectedTag
            ? `${t('library.deleteByTag')} "${selectedTag}" ?`
            : t('actions.delete')
        }
        confirmLabel={t('actions.delete')}
        onConfirm={handleDeleteByTag}
        onCancel={() => setTagDeleteOpen(false)}
        isDanger
        confirmDisabled={isTagDeleting || tagDeleteCount === 0}
      >
        {selectedTag ? (
          <div className="section">
            <label>
              <input
                type="checkbox"
                checked={includeSubTags}
                onChange={(event) => setIncludeSubTags(event.target.checked)}
              />{' '}
              {t('labels.includeSubTags')}
            </label>
            <p>
              {t('labels.total')}: {tagDeleteCount}
            </p>
          </div>
        ) : null}
      </ConfirmDialog>
      <ConfirmDialog
        open={Boolean(cardToDelete)}
        title={t('actions.delete')}
        message={t('review.confirmDelete')}
        confirmLabel={t('actions.delete')}
        onConfirm={confirmDeleteCard}
        onCancel={() => setCardToDelete(null)}
        isDanger
        confirmDisabled={isCardDeleting}
      />
    </main>
  )
}

export default Library
