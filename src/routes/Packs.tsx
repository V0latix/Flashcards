import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listPacks } from '../supabase/api'
import type { Pack } from '../supabase/types'

type TagNode = {
  name: string
  path: string
  count: number
  children: TagNode[]
}

function Packs() {
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

  const tagTree = useMemo(() => {
    const root: TagNode = { name: '', path: '', count: 0, children: [] }
    const nodeByPath = new Map<string, TagNode>()
    nodeByPath.set('', root)

    const ensureNode = (path: string, name: string): TagNode => {
      const existing = nodeByPath.get(path)
      if (existing) {
        return existing
      }
      const node: TagNode = { name, path, count: 0, children: [] }
      nodeByPath.set(path, node)
      return node
    }

    packs.forEach((pack) => {
      const tags = pack.tags ?? []
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

      prefixes.forEach((prefix) => {
        const segments = prefix.split('/')
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

        const node = nodeByPath.get(prefix)
        if (node) {
          node.count += 1
        }
      })
    })

    const sortTree = (node: TagNode) => {
      node.children.sort((a, b) => a.name.localeCompare(b.name))
      node.children.forEach(sortTree)
    }
    sortTree(root)

    return root
  }, [packs])

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
      <ul style={{ listStyle: 'none', paddingLeft: depth === 0 ? 0 : 16 }}>
        {nodes.map((node) => {
          const isCollapsed = collapsed[node.path] ?? false
          const hasChildren = node.children.length > 0
          return (
            <li key={node.path}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
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
                  <span style={{ width: 34 }} />
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
    <main className="container">
      <h1>Packs</h1>
      {isLoading ? <p>Chargement...</p> : null}
      {error ? <p>{error}</p> : null}
      {!isLoading && !error && packs.length === 0 ? <p>Aucun pack.</p> : null}
      {!isLoading && !error && packs.length > 0 ? (
        <section className="card section" style={{ display: 'flex', gap: 16 }}>
          <div style={{ minWidth: 220, flex: '0 0 220px' }}>
            <h2>Tags</h2>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setSelectedTag(null)}
            >
              Tous les packs
            </button>
            {tagTree.children.length === 0 ? (
              <p>Aucun tag.</p>
            ) : (
              renderTagNodes(tagTree.children)
            )}
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ marginTop: 0 }}>
              {selectedTag ? `Tag: ${selectedTag}` : 'Tous les packs'}
            </h2>
            {filteredPacks.length === 0 ? (
              <p>Aucun pack.</p>
            ) : (
              <ul>
                {filteredPacks.map((pack) => (
                  <li key={pack.id}>
                    <h2>{pack.title}</h2>
                    <Link className="btn btn-primary" to={`/packs/${pack.slug}`}>
                      Ouvrir
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
            <Link to="/">Home</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default Packs
