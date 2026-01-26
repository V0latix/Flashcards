import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import { buildTagTree } from '../core/tagTree'
import type { ReviewState, StoredCard } from '../storage/store'
import { deleteCard, deleteCardsByTag, listCards, listReviewStates } from '../storage/store'
import { Button } from '../ui/Button'
import { colors } from '../ui/theme'
import { TagTree } from '../components/TagTree'

type CardEntry = {
  card: StoredCard
  reviewState?: ReviewState
}

export const LibraryScreen = () => {
  const [cards, setCards] = useState<CardEntry[]>([])
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  const loadCards = useCallback(async () => {
    setLoading(true)
    const [cardList, reviewStates] = await Promise.all([listCards(), listReviewStates()])
    const stateById = new Map(reviewStates.map((state) => [state.card_id, state]))
    setCards(
      cardList.map((card) => ({
        card,
        reviewState: stateById.get(card.id)
      }))
    )
    setLoading(false)
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadCards()
    }, [loadCards])
  )

  const tagTree = useMemo(
    () => buildTagTree(cards.map(({ card }) => card.tags)),
    [cards]
  )

  const filteredCards = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    return cards.filter(({ card }) => {
      if (selectedTag) {
        const matchesTag = card.tags.some(
          (tag) => tag === selectedTag || tag.startsWith(`${selectedTag}/`)
        )
        if (!matchesTag) {
          return false
        }
      }
      if (normalizedQuery) {
        const haystack = `${card.front_md} ${card.back_md}`.toLowerCase()
        if (!haystack.includes(normalizedQuery)) {
          return false
        }
      }
      return true
    })
  }, [cards, query, selectedTag])

  const tagDeleteCount = useMemo(() => {
    if (!selectedTag) {
      return 0
    }
    return cards.filter(({ card }) =>
      card.tags.some((tag) => tag === selectedTag || tag.startsWith(`${selectedTag}/`))
    ).length
  }, [cards, selectedTag])

  const handleDeleteByTag = () => {
    if (!selectedTag) {
      return
    }
    Alert.alert(
      'Delete by tag',
      `Delete ${tagDeleteCount} cards with tag "${selectedTag}" (including sub-tags)?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCardsByTag(selectedTag, true)
            await loadCards()
          }
        }
      ]
    )
  }

  const handleDeleteCard = (cardId: number) => {
    Alert.alert('Delete card', 'Delete this card permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(cardId)
          await loadCards()
        }
      }
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Library</Text>
      <Text style={styles.subtitle}>Browse your cards by tag folders.</Text>
      {loading ? <Text style={styles.subtitle}>Loading...</Text> : null}
      {!loading ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tags</Text>
          <View style={styles.tagActions}>
            <Button title="All cards" onPress={() => setSelectedTag(null)} variant="secondary" />
            {selectedTag ? (
              <Button title="Delete tag" onPress={handleDeleteByTag} variant="danger" />
            ) : null}
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
          {selectedTag ? `Tag: ${selectedTag}` : 'All cards'}
        </Text>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search..."
          style={styles.input}
        />
        {filteredCards.length === 0 ? (
          <Text style={styles.subtitle}>No cards found.</Text>
        ) : (
          filteredCards.map(({ card, reviewState }) => (
            <View key={card.id} style={styles.card}>
              <Text style={styles.cardTitle}>{card.front_md || '-'}</Text>
              <Text style={styles.cardMeta}>
                Box {reviewState?.box ?? 0} | Due {reviewState?.due_date ?? '-'}
              </Text>
              <Text style={styles.cardPreview}>{card.back_md || '-'}</Text>
              <View style={styles.cardActions}>
                <Button
                  title="Delete"
                  onPress={() => handleDeleteCard(card.id)}
                  variant="danger"
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
    marginBottom: 12,
    flexWrap: 'wrap'
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
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
  cardPreview: {
    marginTop: 8,
    color: colors.text
  },
  cardActions: {
    marginTop: 12
  }
})
