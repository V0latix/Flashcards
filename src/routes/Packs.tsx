import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPacks } from '../supabase/api'
import type { Pack } from '../supabase/types'
import { buildTagTree, type TagNode } from '../utils/tagTree'
import { useI18n } from '../i18n/I18nProvider'

function Packs() {
  const { t } = useI18n()
  const [packs, setPacks] = useState<Pack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const loadPacks = async () => {
      try {
        const data = await listPacks()
        setPacks(data)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadPacks()
  }, [])

  const tagTree = useMemo(
    () => buildTagTree(packs.map((pack) => pack.tags ?? [])),
    [packs]
  )

  const filteredPacks = useMemo(() => {
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
            <h2>Tags</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelectedTag(null)}
            >
              {t('packs.all')}
            </button>
            {tagTree.children.length === 0 ? (
              <p>{t('library.noTags')}</p>
            ) : (
              renderTagNodes(tagTree.children)
            )}
          </div>
          <div className="panel">
            <h2>{selectedTag ? `${t('library.tag')}: ${selectedTag}` : t('packs.all')}</h2>
            {filteredPacks.length === 0 ? (
              <p>{t('packs.none')}</p>
            ) : (
              <ul className="card-list">
                {filteredPacks.map((pack) => (
                  <li key={pack.id} className="card list-item">
                    <h3>{pack.title}</h3>
                    <Link className="btn btn-primary" to={`/packs/${pack.slug}`}>
                      {t('packs.open')}
                    </Link>
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
