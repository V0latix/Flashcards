import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { useCallback, useState } from 'react'
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { getLeitnerSettings, saveLeitnerSettings } from '../storage/settings'
import { deleteAll } from '../storage/store'
import { Button } from '../ui/Button'
import { colors } from '../ui/theme'

type Navigation = NativeStackNavigationProp<RootStackParamList>

const parsePositiveInt = (value: string, label: string): number => {
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive number.`)
  }
  return parsed
}

const parseProbability = (value: string): number => {
  const parsed = Number.parseFloat(value)
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
    throw new Error('Reverse probability must be between 0 and 1.')
  }
  return parsed
}

export const SettingsScreen = () => {
  const navigation = useNavigation<Navigation>()
  const [box1Target, setBox1Target] = useState('10')
  const [intervals, setIntervals] = useState<Record<number, string>>({
    1: '1',
    2: '3',
    3: '7',
    4: '15',
    5: '30'
  })
  const [learnedInterval, setLearnedInterval] = useState('90')
  const [reverseProbability, setReverseProbability] = useState('0')
  const [saving, setSaving] = useState(false)

  const loadSettings = useCallback(async () => {
    const settings = await getLeitnerSettings()
    setBox1Target(String(settings.box1Target))
    setIntervals({
      1: String(settings.intervalDays[1]),
      2: String(settings.intervalDays[2]),
      3: String(settings.intervalDays[3]),
      4: String(settings.intervalDays[4]),
      5: String(settings.intervalDays[5])
    })
    setLearnedInterval(String(settings.learnedReviewIntervalDays))
    setReverseProbability(String(settings.reverseProbability))
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadSettings()
    }, [loadSettings])
  )

  const handleSave = async () => {
    if (saving) {
      return
    }
    setSaving(true)
    try {
      const parsedIntervals: Record<number, number> = {}
      for (const box of [1, 2, 3, 4, 5]) {
        parsedIntervals[box] = parsePositiveInt(intervals[box], `Interval box ${box}`)
      }
      await saveLeitnerSettings({
        box1Target: parsePositiveInt(box1Target, 'Box 1 target'),
        intervalDays: parsedIntervals,
        learnedReviewIntervalDays: parsePositiveInt(
          learnedInterval,
          'Learned review interval'
        ),
        reverseProbability: parseProbability(reverseProbability)
      })
      Alert.alert('Saved', 'Settings updated.')
    } catch (err) {
      Alert.alert('Invalid input', (err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteAll = () => {
    Alert.alert('Delete all', 'Delete all cards and progress on this device?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteAll()
          Alert.alert('Done', 'All cards deleted.')
        }
      }
    ])
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>Configure Leitner parameters.</Text>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Box 1 target</Text>
        <TextInput
          value={box1Target}
          onChangeText={setBox1Target}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Intervals (days)</Text>
        {([1, 2, 3, 4, 5] as const).map((box) => (
          <View key={box} style={styles.row}>
            <Text style={styles.rowLabel}>Box {box}</Text>
            <TextInput
              value={intervals[box]}
              onChangeText={(value) =>
                setIntervals((prev) => ({ ...prev, [box]: value }))
              }
              keyboardType="number-pad"
              style={styles.inputSmall}
            />
          </View>
        ))}
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Learned review interval (days)</Text>
        <TextInput
          value={learnedInterval}
          onChangeText={setLearnedInterval}
          keyboardType="number-pad"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reverse probability (0-1)</Text>
        <TextInput
          value={reverseProbability}
          onChangeText={setReverseProbability}
          keyboardType="decimal-pad"
          style={styles.input}
        />
      </View>
      <View style={styles.section}>
        <Button title={saving ? 'Saving...' : 'Save Settings'} onPress={handleSave} />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Debug</Text>
        <Button
          title="Open Supabase Debug"
          onPress={() => navigation.navigate('SupabaseDebug')}
          variant="secondary"
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Danger zone</Text>
        <Button title="Delete all cards" onPress={handleDeleteAll} variant="danger" />
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
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10
  },
  inputSmall: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 8,
    width: 80
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8
  },
  rowLabel: {
    color: colors.text
  }
})
