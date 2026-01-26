import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback, useMemo, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { applyReviewResult, buildDailySession, type SessionCard } from '../core/leitner'
import { addReviewLog, deleteCard, listCards, listReviewStates, replaceReviewStates, upsertReviewState } from '../storage/store'
import { getLeitnerSettings } from '../storage/settings'
import { Button } from '../ui/Button'
import { colors } from '../ui/theme'

type Navigation = NativeStackNavigationProp<RootStackParamList>

export const ReviewSessionScreen = () => {
  const navigation = useNavigation<Navigation>()
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [isLoading, setIsLoading] = useState(true)
  const [queue, setQueue] = useState<SessionCard[]>([])
  const [index, setIndex] = useState(0)
  const [showBack, setShowBack] = useState(false)
  const [goodCount, setGoodCount] = useState(0)
  const [badCount, setBadCount] = useState(0)

  const loadSession = useCallback(async () => {
    setIsLoading(true)
    const [cards, reviewStates] = await Promise.all([listCards(), listReviewStates()])
    const settings = await getLeitnerSettings()
    const result = buildDailySession(cards, reviewStates, today, settings, Math.random)
    await replaceReviewStates(result.reviewStates)
    setQueue(result.sessionCards)
    setIndex(0)
    setShowBack(false)
    setGoodCount(0)
    setBadCount(0)
    setIsLoading(false)
  }, [today])

  useFocusEffect(
    useCallback(() => {
      void loadSession()
    }, [loadSession])
  )

  const current = queue[index]
  const isDone = !isLoading && index >= queue.length

  const handleAnswer = async (result: 'good' | 'bad') => {
    if (!current) {
      return
    }
    const settings = await getLeitnerSettings()
    const { nextState, log } = applyReviewResult(current.reviewState, result, today, settings, {
      wasReversed: current.wasReversed
    })
    await upsertReviewState(nextState)
    await addReviewLog(log)
    setShowBack(false)
    setIndex((prev) => prev + 1)
    if (result === 'good') {
      setGoodCount((prev) => prev + 1)
    } else {
      setBadCount((prev) => prev + 1)
    }
  }

  const handleDelete = () => {
    if (!current) {
      return
    }
    Alert.alert('Delete card', 'Delete this card permanently?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCard(current.cardId)
          setQueue((prev) => {
            const next = prev.filter((card) => card.cardId !== current.cardId)
            setIndex((prevIndex) => Math.min(prevIndex, Math.max(0, next.length - 1)))
            return next
          })
          setShowBack(false)
        }
      }
    ])
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>Loading session...</Text>
      </View>
    )
  }

  if (isDone) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Session complete</Text>
        <Text style={styles.subtitle}>
          Total: {queue.length} | Good: {goodCount} | Bad: {badCount}
        </Text>
        <View style={styles.section}>
          <Button title="Back Home" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} />
          <View style={styles.spacer} />
          <Button title="Play Again" onPress={loadSession} variant="secondary" />
        </View>
      </View>
    )
  }

  if (!current) {
    return (
      <View style={styles.center}>
        <Text style={styles.subtitle}>No cards to review.</Text>
        <View style={styles.section}>
          <Button title="Back Home" onPress={() => navigation.navigate('Tabs', { screen: 'Home' })} />
        </View>
      </View>
    )
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.subtitle}>
        Card {index + 1} / {queue.length}
      </Text>
      <View style={styles.card}>
        <Text style={styles.cardLabel}>Front</Text>
        <Text style={styles.cardText}>{current.front || '-'}</Text>
      </View>
      {showBack ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Back</Text>
          <Text style={styles.cardText}>{current.back || '-'}</Text>
        </View>
      ) : (
        <View style={styles.section}>
          <Button title="Reveal" onPress={() => setShowBack(true)} />
        </View>
      )}
      {showBack ? (
        <View style={styles.row}>
          <View style={styles.rowItem}>
            <Button title="Bad" onPress={() => handleAnswer('bad')} variant="secondary" />
          </View>
          <View style={styles.rowItem}>
            <Button title="Good" onPress={() => handleAnswer('good')} />
          </View>
        </View>
      ) : null}
      <View style={styles.section}>
        <Button title="Delete Card" onPress={handleDelete} variant="danger" />
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
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: colors.background
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    color: colors.muted
  },
  card: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  cardLabel: {
    fontSize: 12,
    color: colors.muted,
    textTransform: 'uppercase'
  },
  cardText: {
    marginTop: 8,
    fontSize: 16,
    color: colors.text
  },
  section: {
    marginTop: 16
  },
  row: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12
  },
  rowItem: {
    flex: 1
  },
  spacer: {
    height: 12
  }
})
