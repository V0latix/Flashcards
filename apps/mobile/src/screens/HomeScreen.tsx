import { useNavigation } from '@react-navigation/native'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../navigation/types'
import { Button } from '../ui/Button'
import { colors } from '../ui/theme'

type Navigation = NativeStackNavigationProp<RootStackParamList>

export const HomeScreen = () => {
  const navigation = useNavigation<Navigation>()

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Flashcards</Text>
      <Text style={styles.subtitle}>Daily review, fast sessions.</Text>
      <View style={styles.hero}>
        <Button title="Play Session" onPress={() => navigation.navigate('ReviewSession')} />
      </View>
      <View style={styles.grid}>
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Library</Text>
          <Text style={styles.tileText}>Browse your cards by tags.</Text>
          <Button
            title="Open Library"
            onPress={() => navigation.navigate('Tabs', { screen: 'Library' })}
            variant="secondary"
          />
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Packs</Text>
          <Text style={styles.tileText}>Download new packs.</Text>
          <Button
            title="Explore Packs"
            onPress={() => navigation.navigate('Tabs', { screen: 'Packs' })}
            variant="secondary"
          />
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Settings</Text>
          <Text style={styles.tileText}>Tune Leitner rules.</Text>
          <Button
            title="Open Settings"
            onPress={() => navigation.navigate('Tabs', { screen: 'Settings' })}
            variant="secondary"
          />
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileTitle}>Stats</Text>
          <Text style={styles.tileText}>Track your progress.</Text>
          <Button
            title="View Stats"
            onPress={() => navigation.navigate('Tabs', { screen: 'Stats' })}
            variant="secondary"
          />
        </View>
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
    fontSize: 28,
    fontWeight: '700',
    color: colors.text
  },
  subtitle: {
    marginTop: 6,
    color: colors.muted
  },
  hero: {
    marginTop: 16
  },
  grid: {
    marginTop: 16,
    gap: 12
  },
  tile: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border
  },
  tileTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text
  },
  tileText: {
    marginTop: 6,
    marginBottom: 12,
    color: colors.muted
  }
})
