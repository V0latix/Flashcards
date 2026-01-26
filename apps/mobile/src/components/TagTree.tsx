import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { TagNode } from '../core/tagTree'
import { colors } from '../ui/theme'

type TagTreeProps = {
  nodes: TagNode[]
  onSelect: (tag: string) => void
}

export const TagTree = ({ nodes, onSelect }: TagTreeProps) => {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const renderNodes = (items: TagNode[], depth = 0) =>
    items.map((node) => {
      const isCollapsed = collapsed[node.path] ?? true
      const hasChildren = node.children.length > 0
      return (
        <View key={node.path} style={styles.node}>
          <View style={[styles.row, { marginLeft: depth * 12 }]}>
            <Pressable
              accessibilityRole="button"
              onPress={() =>
                setCollapsed((prev) => ({
                  ...prev,
                  [node.path]: !isCollapsed
                }))
              }
              style={styles.chevron}
            >
              <Text style={styles.chevronText}>
                {hasChildren ? (isCollapsed ? '>' : 'v') : ' '}
              </Text>
            </Pressable>
            <Pressable onPress={() => onSelect(node.path)} style={styles.tagButton}>
              <Text style={styles.tagText}>
                {node.name} ({node.count})
              </Text>
            </Pressable>
          </View>
          {!isCollapsed && hasChildren ? renderNodes(node.children, depth + 1) : null}
        </View>
      )
    })

  return <View>{renderNodes(nodes)}</View>
}

const styles = StyleSheet.create({
  node: {
    marginBottom: 6
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap'
  },
  chevron: {
    width: 22,
    alignItems: 'center'
  },
  chevronText: {
    color: colors.muted,
    fontSize: 12
  },
  tagButton: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: colors.card,
    borderRadius: 6
  },
  tagText: {
    color: colors.text,
    fontSize: 13
  }
})
