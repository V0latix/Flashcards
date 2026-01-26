import { ScrollView, StyleSheet, Text } from 'react-native'
import { MarkdownRenderer } from '../components/MarkdownRenderer'
import { colors } from '../ui/theme'

const sample = `
# Media Test

Inline formula: $E = mc^2$ inside a sentence.

Block formula:

$$
\\int_0^1 x^2 dx = \\frac{1}{3}
$$

Image:

![Mountain](https://upload.wikimedia.org/wikipedia/commons/3/3f/Fronalpstock_big.jpg)

SVG Flag:

![Flag](https://upload.wikimedia.org/wikipedia/en/c/c3/Flag_of_France.svg)
`

export const MediaTestScreen = () => (
  <ScrollView contentContainerStyle={styles.container}>
    <Text style={styles.title}>Media Test</Text>
    <MarkdownRenderer value={sample} />
  </ScrollView>
)

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: colors.background,
    flexGrow: 1
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12
  }
})
