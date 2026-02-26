import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPacks, listPublicCardCountsByPackSlug } from '../supabase/api'
import { importPackToLocal } from '../supabase/import'
import type { Pack } from '../supabase/types'
import TagTreeFilter from '../components/TagTreeFilter'
import { useI18n } from '../i18n/useI18n'

function Packs() {
  const { t } = useI18n()
  const [packs, setPacks] = useState<Pack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [cardCountsBySlug, setCardCountsBySlug] = useState<Record<string, number>>({})
  const [importingSlug, setImportingSlug] = useState<string | null>(null)
  const [importStatusBySlug, setImportStatusBySlug] = useState<Record<string, string>>({})

  useEffect(() => {
    const loadPacks = async () => {
      try {
        const [data, counts] = await Promise.all([
          listPacks(),
          listPublicCardCountsByPackSlug()
        ])
        setPacks(data)
        setCardCountsBySlug(counts)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadPacks()
  }, [])

  const tagFilteredPacks = useMemo(() => {
    if (!selectedTag) {
      return packs
    }
    return packs.filter((pack) => {
      const tags = pack.tags ?? []
      return tags.some((tag) => {
        const normalized = tag.trim()
        return (
          normalized === selectedTag ||
          normalized.startsWith(`${selectedTag}/`)
        )
      })
    })
  }, [packs, selectedTag])

  const filteredPacks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return tagFilteredPacks
    }
    return tagFilteredPacks.filter((pack) => {
      const haystack = [
        pack.title,
        pack.slug,
        pack.description ?? '',
        ...(pack.tags ?? [])
      ]
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [query, tagFilteredPacks])

  return (
    <main className="container page">
      <div className="page-header">
        <h1>{t('packs.title')}</h1>
        <p>{t('packs.browseByTags')}</p>
      </div>
      {isLoading ? <p>{t('status.loading')}</p> : null}
      {error ? <p>{error}</p> : null}
      {!isLoading && !error && packs.length === 0 ? <p>{t('packs.none')}</p> : null}
      {!isLoading && !error && packs.length > 0 ? (
        <section className="card section split">
          <div className="sidebar">
            <TagTreeFilter
              title={t('labels.tags')}
              allLabel={t('packs.all')}
              noTagsLabel={t('library.noTags')}
              tagsCollection={packs.map((pack) => pack.tags ?? [])}
              onSelectTag={setSelectedTag}
            />
          </div>
          <div className="panel">
            <h2>{selectedTag ? `${t('library.tag')}: ${selectedTag}` : t('packs.all')}</h2>
            <label htmlFor="packs-search">{t('packs.search')}</label>
            <input
              id="packs-search"
              type="text"
              value={query}
              className="input"
              onChange={(event) => setQuery(event.target.value)}
            />
            {filteredPacks.length === 0 ? (
              <p>{t('packs.none')}</p>
            ) : (
              <ul className="card-list">
                {filteredPacks.map((pack) => (
                  <li key={pack.id} className="card list-item">
                    <h3>{pack.title}</h3>
                    <p>{pack.description?.trim() || t('packs.descriptionFallback')}</p>
                    <p>{t('packs.cardsCount', { count: cardCountsBySlug[pack.slug] ?? 0 })}</p>
                    <p>
                      {t('labels.tags')}:{' '}
                      {pack.tags?.length ? pack.tags.join(', ') : t('status.none')}
                    </p>
                    <div className="button-row">
                      <Link className="btn btn-primary" to={`/packs/${pack.slug}`}>
                        {t('packs.open')}
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        disabled={importingSlug === pack.slug}
                        onClick={async () => {
                          setImportingSlug(pack.slug)
                          setImportStatusBySlug((prev) => ({
                            ...prev,
                            [pack.slug]: ''
                          }))
                          try {
                            const result = await importPackToLocal(pack.slug)
                            setImportStatusBySlug((prev) => ({
                              ...prev,
                              [pack.slug]: t('packs.importResult', {
                                imported: result.imported,
                                already: result.alreadyPresent
                              })
                            }))
                          } catch (err) {
                            setImportStatusBySlug((prev) => ({
                              ...prev,
                              [pack.slug]: t('packs.importFailed', {
                                message: (err as Error).message
                              })
                            }))
                          } finally {
                            setImportingSlug(null)
                          }
                        }}
                      >
                        {t('packs.importDirect')}
                      </button>
                    </div>
                    {importStatusBySlug[pack.slug] ? <p>{importStatusBySlug[pack.slug]}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      ) : null}
      <nav>
        <ul>
          <li>
            <Link to="/">{t('nav.home')}</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default Packs
