import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { buildTagTree } from '../core/tagTree'
import { listPacks as listLocalPacks } from '../storage/store'
import { listPacks } from '../lib/supabaseApi'
import type { PackSummary, RootStackParamList } from '../navigation/types'
import { Button } from '../ui/Button'
import { colors } from '../ui/theme'
import { TagTree } from '../components/TagTree'

type Navigation = NativeStackNavigationProp<RootStackParamList>

export const PacksScreen = () => {
  const navigation = useNavigation<Navigation>()
  const [packs, setPacks] = useState<PackSummary[]>([])
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadPacks = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPacks()
      setPacks(
        data.map((pack) => ({
          id: pack.id,
          slug: pack.slug,
          title: pack.title ?? null,
          description: pack.description ?? null,
          tags: pack.tags ?? []
        }))
      )
      const local = await listLocalPacks()
      setDownloaded(new Set(local.map((pack) => pack.slug)))
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadPacks()
    }, [loadPacks])
  )

  const tagTree = useMemo(() => buildTagTree(packs.map((pack) => pack.tags)), [packs])

  const filteredPacks = useMemo(() => {
    if (!selectedTag) {
      return packs
    }
    return packs.filter((pack) =>
      pack.tags.some((tag) => tag === selectedTag || tag.startsWith(`${selectedTag}/`))
    )
  }, [packs, selectedTag])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Packs</Text>
      <Text style={styles.subtitle}>Browse public packs and download snapshots.</Text>
      {loading ? <Text style={styles.subtitle}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagActions}>
            <Button title="All packs" onPress={() => setSelectedTag(null)} variant="secondary" />
          </View>
          {tagTree.children.length === 0 ? (
            <Text style={styles.subtitle}>No tags yet.</Text>
          ) : (
            <TagTree nodes={tagTree.children} onSelect={(tag) => setSelectedTag(tag)} />
          )}
        </View>
      ) : null}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {selectedTag ? `Tag: ${selectedTag}` : 'All packs'}
        </Text>
        {filteredPacks.length === 0 && !loading ? (
          <Text style={styles.subtitle}>No packs.</Text>
        ) : (
          filteredPacks.map((pack) => (
            <View key={pack.slug} style={styles.card}>
              <Text style={styles.cardTitle}>{pack.title ?? pack.slug}</Text>
              <Text style={styles.cardMeta}>{pack.slug}</Text>
              {downloaded.has(pack.slug) ? (
                <Text style={styles.badge}>Downloaded</Text>
              ) : null}
              <View style={styles.cardActions}>
                <Button
                  title="Open"
                  onPress={() => navigation.navigate('PackDetail', { slug: pack.slug, pack })}
                  variant="secondary"
                />
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.background,
    flexGrow: 1
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    color: colors.muted,
    marginTop: 4
  },
  error: {
    color: colors.danger,
    marginTop: 8
  },
  section: {
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8
  },
  tagActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12
  },
  card: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  cardMeta: {
    marginTop: 4,
    color: colors.muted
  },
  badge: {
    marginTop: 8,
    color: colors.primary,
    fontWeight: '600'
  },
  cardActions: {
    marginTop: 12
  }
})
