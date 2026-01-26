import { useFocusEffect } from '@react-navigation/native'
import { useCallback, useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { listCards, listReviewLogs, listReviewStates } from '../storage/store'
import { getLeitnerSettings } from '../storage/settings'
import { colors } from '../ui/theme'

type StatsState = {
  totalCards: number
  learnedCards: number
  dueCards: number
  reviewsToday: number
  boxCounts: Record<number, number>
}

const toDateKey = (iso: string): string => iso.slice(0, 10)

export const StatsScreen = () => {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [stats, setStats] = useState<StatsState>({
    totalCards: 0,
    learnedCards: 0,
    dueCards: 0,
    reviewsToday: 0,
    boxCounts: { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  })

  const loadStats = useCallback(async () => {
    const [cards, reviewStates, reviewLogs] = await Promise.all([
      listCards(),
      listReviewStates(),
      listReviewLogs()
    ])
    const settings = await getLeitnerSettings()
    const boxCounts: Record<number, number> = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    let learnedCards = 0
    let dueCards = 0
    reviewStates.forEach((state) => {
      boxCounts[state.box] = (boxCounts[state.box] ?? 0) + 1
      if (state.is_learned) {
        learnedCards += 1
        if (state.learned_at) {
          const learnedDate = toDateKey(state.learned_at)
          const learnedDue = new Date(learnedDate)
          learnedDue.setUTCDate(learnedDue.getUTCDate() + settings.learnedReviewIntervalDays)
          const dueDate = learnedDue.toISOString().slice(0, 10)
          if (dueDate <= today) {
            dueCards += 1
          }
        }
      } else if (state.due_date && state.due_date <= today) {
        dueCards += 1
      }
    })

    const reviewsToday = reviewLogs.filter((log) => toDateKey(log.timestamp) === today).length

    setStats({
      totalCards: cards.length,
      learnedCards,
      dueCards,
      reviewsToday,
      boxCounts
    })
  }, [today])

  useFocusEffect(
    useCallback(() => {
      void loadStats()
    }, [loadStats])
  )

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Stats</Text>
      <Text style={styles.subtitle}>Lightweight snapshot of your progress.</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overview</Text>
        <Text style={styles.statLine}>Total cards: {stats.totalCards}</Text>
        <Text style={styles.statLine}>Due cards: {stats.dueCards}</Text>
        <Text style={styles.statLine}>Learned cards: {stats.learnedCards}</Text>
        <Text style={styles.statLine}>Reviews today: {stats.reviewsToday}</Text>
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Boxes</Text>
        {[0, 1, 2, 3, 4, 5].map((box) => (
          <Text key={box} style={styles.statLine}>
            Box {box}: {stats.boxCounts[box] ?? 0}
          </Text>
        ))}
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
  statLine: {
    color: colors.text,
    marginBottom: 4
  }
})
