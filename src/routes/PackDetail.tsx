import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listPublicCardsByPackSlug } from '../supabase/api'
import { importPackToLocal } from '../supabase/import'
import type { PublicCard } from '../supabase/types'
import { useI18n } from '../i18n/I18nProvider'

function PackDetail() {
  const { t } = useI18n()
  const { slug } = useParams()
  const [cards, setCards] = useState<PublicCard[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  useEffect(() => {
    const loadCards = async () => {
      if (!slug) {
        setIsLoading(false)
        return
      }
      try {
        const data = await listPublicCardsByPackSlug(slug)
        setCards(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadCards()
  }, [slug])

  const filteredCards = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) {
      return cards
    }
    return cards.filter((card) => {
      const haystack = `${card.front_md} ${card.back_md}`.toLowerCase()
      return haystack.includes(normalized)
    })
  }, [cards, query])

  return (
    <main className="container page">
      <h1>{t('packDetail.title')}</h1>
      <p>
        {t('packDetail.slug')}: {slug}
      </p>
      <button
        type="button"
        className="btn btn-primary"
        disabled={isImporting || !slug}
        onClick={async () => {
          if (!slug) {
            return
          }
          setIsImporting(true)
          setImportStatus(null)
          try {
            const result = await importPackToLocal(slug)
            setImportStatus(
              t('packDetail.importResult', {
                imported: result.imported,
                already: result.alreadyPresent
              })
            )
          } catch (err) {
            setImportStatus((err as Error).message)
          } finally {
            setIsImporting(false)
          }
        }}
      >
        {t('packDetail.import')}
      </button>
      {importStatus ? <p>{importStatus}</p> : null}
      <section className="card section">
        <label htmlFor="search">{t('labels.search')}</label>
        <input
          id="search"
          type="text"
          value={query}
          className="input"
          onChange={(event) => setQuery(event.target.value)}
        />
      </section>
      {isLoading ? <p>{t('status.loading')}</p> : null}
      {error ? <p>{error}</p> : null}
      {!isLoading && !error ? (
        <section className="card section">
          <p>
            {t('packDetail.total')}: {filteredCards.length}
          </p>
          {filteredCards.length === 0 ? (
            <p>{t('packDetail.none')}</p>
          ) : (
            <ul>
              {filteredCards.map((card) => (
                <li key={card.id}>
                  <p>
                    {t('cardEditor.front')}: {card.front_md}
                  </p>
                  <p>
                    {t('cardEditor.back')}: {card.back_md}
                  </p>
                  <p>Tags: {card.tags?.join(', ') || t('status.none')}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
      <nav>
        <ul>
          <li>
            <Link to="/packs">{t('packDetail.backToPacks')}</Link>
          </li>
          <li>
            <Link to="/">{t('nav.home')}</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default PackDetail
