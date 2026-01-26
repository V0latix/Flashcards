import { StatusBar } from 'expo-status-bar'
import { StyleSheet, Text, View } from 'react-native'
import { getEnv } from './config/env'

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
