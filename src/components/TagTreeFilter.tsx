import { useMemo, useState } from 'react'
import { buildTagTree, type TagNode } from '../utils/tagTree'

type TagTreeFilterProps = {
  title: string
  allLabel: string
  noTagsLabel: string
  tagsCollection: string[][]
  onSelectTag: (tag: string | null) => void
}

function TagTreeFilter({
  title,
  allLabel,
  noTagsLabel,
  tagsCollection,
  onSelectTag
}: TagTreeFilterProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const tagTree = useMemo(
    () => buildTagTree(tagsCollection),
    [tagsCollection]
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
                  onClick={() => onSelectTag(node.path)}
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
    <>
      <h2>{title}</h2>
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => onSelectTag(null)}
      >
        {allLabel}
      </button>
      {tagTree.children.length === 0 ? (
        <p>{noTagsLabel}</p>
      ) : (
        renderTagNodes(tagTree.children)
      )}
    </>
  )
}

export default TagTreeFilter
