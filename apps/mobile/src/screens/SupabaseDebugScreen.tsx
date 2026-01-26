import { useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { getSupabase } from '../lib/supabase'
import { colors } from '../ui/theme'

type Pack = {
  id: number | string
  slug: string
  title: string | null
}

type PublicCard = {
  id: number | string
  pack_slug: string | null
  front_md: string | null
}

export const SupabaseDebugScreen = () => {
  const [packs, setPacks] = useState<Pack[]>([])
  const [cards, setCards] = useState<PublicCard[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try {
        const supabase = getSupabase()
        const { data: packData, error: packError } = await supabase
          .from('packs')
          .select('id, slug, title')
          .order('title', { ascending: true })
          .limit(5)
        if (packError) {
          throw new Error(`packs: ${packError.message}`)
        }

        const { data: cardData, error: cardError } = await supabase
          .from('public_cards')
          .select('id, pack_slug, front_md')
          .order('created_at', { ascending: true })
          .limit(5)
        if (cardError) {
          throw new Error(`public_cards: ${cardError.message}`)
        }

        if (isMounted) {
          setPacks((packData ?? []) as Pack[])
          setCards((cardData ?? []) as PublicCard[])
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
  }, [])

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Supabase Debug</Text>
      {loading ? <Text style={styles.subtitle}>Loading...</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!loading && !error ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Packs (5)</Text>
          {packs.length === 0 ? (
            <Text style={styles.subtitle}>No packs found.</Text>
          ) : (
            packs.map((pack) => (
              <Text key={String(pack.id)} style={styles.row}>
                {pack.title ?? pack.slug} ({pack.slug})
              </Text>
            ))
          )}
          <Text style={styles.sectionTitle}>Public Cards (5)</Text>
          {cards.length === 0 ? (
            <Text style={styles.subtitle}>No cards found.</Text>
          ) : (
            cards.map((card) => (
              <Text key={String(card.id)} style={styles.row}>
                {card.front_md ?? '-'} [{card.pack_slug ?? 'n/a'}]
              </Text>
            ))
          )}
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
    marginTop: 6
  },
  section: {
    marginTop: 16
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '600',
    color: colors.text
  },
  row: {
    color: colors.text,
    marginBottom: 4
  },
  error: {
    color: colors.danger,
    marginTop: 8
  }
})
