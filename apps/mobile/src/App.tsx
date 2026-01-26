import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { getEnv } from './config/env'
import { RootNavigator } from './navigation/RootNavigator'
import { colors } from './ui/theme'

export default function App() {
  const envResult = getEnv()

  if (!envResult.ok) {
    return (
      <View style={styles.envContainer}>
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
      <RootNavigator />
      <StatusBar style="auto" />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background
  },
  envContainer: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.muted,
    textAlign: 'center'
  },
  caption: {
    marginTop: 6,
    fontSize: 14,
    color: colors.muted
  },
  errorBox: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fdecea'
  },
  errorText: {
    color: colors.danger,
    fontSize: 14
  }
})
