import { useEffect, useState } from 'react'
import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { getEnv } from './config/env'
import { getSupabase } from './lib/supabase'

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

const SupabaseDebug = () => {
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

  if (loading) {
    return <Text style={styles.subtitle}>Loading Supabase...</Text>
  }

  if (error) {
    return (
      <View style={styles.errorBox}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    )
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Supabase Debug</Text>
      <Text style={styles.sectionSubtitle}>Packs (5)</Text>
      {packs.length === 0 ? (
        <Text style={styles.caption}>No packs found.</Text>
      ) : (
        packs.map((pack) => (
          <Text key={`pack-${pack.id}`} style={styles.listItem}>
            {pack.title ?? pack.slug} ({pack.slug})
          </Text>
        ))
      )}
      <Text style={styles.sectionSubtitle}>Public Cards (5)</Text>
      {cards.length === 0 ? (
        <Text style={styles.caption}>No cards found.</Text>
      ) : (
        cards.map((card) => (
          <Text key={`card-${card.id}`} style={styles.listItem}>
            {card.front_md ?? '-'} [{card.pack_slug ?? 'n/a'}]
          </Text>
        ))
      )}
    </View>
  )
}

export default function App() {
  const envResult = getEnv()

  if (!envResult.ok) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Env Missing</Text>
        <Text style={styles.subtitle}>
          Create apps/mobile/.env and restart Expo with cache cleared.
        </Text>
        <View style={styles.errorBox}>
          {envResult.errors.map((error) => (
            <Text key={error} style={styles.errorText}>
              {error}
            </Text>
          ))}
        </View>
        <StatusBar style="auto" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Boot OK</Text>
      <Text style={styles.subtitle}>Env OK</Text>
      <Text style={styles.caption}>Flashcards Mobile</Text>
      <SupabaseDebug />
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#444',
    textAlign: 'center'
  },
  caption: {
    marginTop: 6,
    fontSize: 14,
    color: '#666'
  },
  section: {
    marginTop: 20,
    width: '100%'
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8
  },
  sectionSubtitle: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#222'
  },
  listItem: {
    fontSize: 13,
    color: '#333',
    marginTop: 4
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fdecea'
  },
  errorText: {
    color: '#b91c1c',
    fontSize: 14
  }
})
