import { useEffect, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import { RouteProp, useRoute } from '@react-navigation/native'
import type { RootStackParamList } from '../navigation/types'
import { listPublicCardsByPackSlug } from '../lib/supabaseApi'
import { savePackSnapshot } from '../storage/store'
import { Button } from '../ui/Button'
import { colors } from '../ui/theme'

type ScreenRoute = RouteProp<RootStackParamList, 'PackDetail'>

export const PackDetailScreen = () => {
  const route = useRoute<ScreenRoute>()
  const { slug, pack } = route.params
  const [cards, setCards] = useState<Array<{ id: number | string; front_md: string | null; back_md: string | null; tags: string[] | null }>>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const data = await listPublicCardsByPackSlug(slug)
        if (isMounted) {
          setCards(data)
          setError(null)
        }
      } catch (err) {
        if (isMounted) {
          setError((err as Error).message)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    void load()
    return () => {
      isMounted = false
    }
  }, [slug])

  const displayTitle = useMemo(() => pack?.title ?? slug, [pack, slug])

  const handleDownload = async () => {
    if (isDownloading) {
      return
    }
    setIsDownloading(true)
    setStatus(null)
    try {
      const result = await savePackSnapshot(
        {
          id: pack?.id ?? slug,
          slug,
          title: pack?.title ?? null,
          description: pack?.description ?? null,
          tags: pack?.tags ?? []
        },
        cards.map((card) => ({
          front_md: card.front_md ?? '',
          back_md: card.back_md ?? '',
          tags: card.tags ?? [],
          source: 'supabase',
          source_type: 'supabase_public',
          source_id: String(card.id)
        }))
      )
      setStatus(`Imported ${result.imported}, already present ${result.alreadyPresent}.`)
    } catch (err) {
      setStatus((err as Error).message)
    } finally {
      setIsDownloading(false)
    }
  }

  const handleConfirmDownload = () => {
    Alert.alert('Download pack', 'Download this pack to local storage?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Download', onPress: handleDownload }
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{displayTitle}</Text>
      <Text style={styles.subtitle}>Slug: {slug}</Text>
      <View style={styles.section}>
        <Button title="Download Pack" onPress={handleConfirmDownload} />
        {status ? <Text style={styles.status}>{status}</Text> : null}
      </View>
      {loading ? <Text style={styles.subtitle}>Loading cards...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cards ({cards.length})</Text>
          {cards.length === 0 ? (
            <Text style={styles.subtitle}>No cards in this pack.</Text>
          ) : (
            cards.slice(0, 50).map((card) => (
              <View key={String(card.id)} style={styles.card}>
                <Text style={styles.cardTitle}>{card.front_md ?? '-'}</Text>
                <Text style={styles.cardPreview}>{card.back_md ?? '-'}</Text>
              </View>
            ))
          )}
          {cards.length > 50 ? (
            <Text style={styles.subtitle}>Showing first 50 cards.</Text>
          ) : null}
        </View>
      ) : null}
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
  section: {
    marginTop: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8
  },
  error: {
    color: colors.danger,
    marginTop: 8
  },
  status: {
    marginTop: 8,
    color: colors.primary
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
  cardPreview: {
    marginTop: 8,
    color: colors.text
  }
})
