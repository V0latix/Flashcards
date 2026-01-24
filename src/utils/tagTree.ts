export type TagNode = {
  name: string
  path: string
  count: number
  children: TagNode[]
}

const buildPrefixes = (tags: string[]): string[] => {
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

export const buildTagTree = (tagGroups: string[][]): TagNode => {
  const root: TagNode = { name: '', path: '', count: 0, children: [] }
  const nodeByPath = new Map<string, TagNode>([['', root]])
  const childrenByPath = new Map<string, Map<string, TagNode>>()

  const ensureNode = (path: string, name: string): TagNode => {
    const existing = nodeByPath.get(path)
    if (existing) {
      return existing
    }
    const node: TagNode = { name, path, count: 0, children: [] }
    nodeByPath.set(path, node)
    return node
  }

  tagGroups.forEach((tags) => {
    const prefixes = buildPrefixes(tags)
    prefixes.forEach((prefix) => {
      const segments = prefix.split('/')
      let currentPath = ''
      let parentPath = ''
      let parent = root

      for (const segment of segments) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment
        const node = ensureNode(currentPath, segment)

        const childMap = childrenByPath.get(parentPath) ?? new Map<string, TagNode>()
        if (!childMap.has(currentPath)) {
          childMap.set(currentPath, node)
          parent.children.push(node)
          childrenByPath.set(parentPath, childMap)
        }

        parent = node
        parentPath = currentPath
      }

      const node = nodeByPath.get(prefix)
      if (node) {
        node.count += 1
      }
    })
  })

  const sortTree = (node: TagNode) => {
    node.children.sort((a, b) => {
      const aFolder = a.children.length > 0
      const bFolder = b.children.length > 0
      if (aFolder !== bFolder) {
        return aFolder ? -1 : 1
      }
      return a.name.localeCompare(b.name)
    })
    node.children.forEach(sortTree)
  }

  sortTree(root)
  return root
}
