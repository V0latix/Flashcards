import { Image, StyleSheet, Text, View } from 'react-native'
import Markdown, { MarkdownIt } from 'react-native-markdown-display'
import texmath from 'markdown-it-texmath'
import katex from 'katex'
import MathView from 'react-native-math-view'
import { SvgUri } from 'react-native-svg'
import { resolveImageSrc } from '../core/media'
import { colors } from '../ui/theme'

type MarkdownRendererProps = {
  value: string
}

const markdownIt = new MarkdownIt({
  linkify: true,
  breaks: true
}).use(texmath, {
  engine: katex,
  delimiters: 'dollars',
  katexOptions: {
    throwOnError: false
  }
})

const MathInline = ({ value }: { value: string }) => (
  <View style={styles.inlineMath}>
    <MathView math={value} config={{ inline: true }} />
  </View>
)

const MathBlock = ({ value }: { value: string }) => (
  <View style={styles.blockMath}>
    <MathView math={value} config={{ inline: false }} />
  </View>
)

export const MarkdownRenderer = ({ value }: MarkdownRendererProps) => (
  <Markdown
    markdownit={markdownIt}
    style={markdownStyles}
    rules={{
      paragraph: (node, children) => (
        <View key={node.key} style={styles.paragraph}>
          {children}
        </View>
      ),
      math_inline: (node) => <MathInline key={node.key} value={node.content} />,
      math_inline_double: (node) => <MathBlock key={node.key} value={node.content} />,
      math_block: (node) => <MathBlock key={node.key} value={node.content} />,
      math_block_eqno: (node) => <MathBlock key={node.key} value={node.content} />,
      image: (node) => {
        const resolved = resolveImageSrc(node.attributes.src)
        if (!resolved) {
          return (
            <Text key={node.key} style={styles.inlineText}>
              [image unavailable]
            </Text>
          )
        }
        const isSvg = resolved.toLowerCase().includes('.svg')
        if (isSvg) {
          return <SvgUri key={node.key} uri={resolved} width="100%" height={180} />
        }
        return (
          <Image
            key={node.key}
            source={{ uri: resolved }}
            style={styles.image}
            resizeMode="contain"
          />
        )
      }
    }}
  >
    {value}
  </Markdown>
)

const styles = StyleSheet.create({
  paragraph: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginBottom: 8
  },
  inlineText: {
    color: colors.muted
  },
  inlineMath: {
    marginHorizontal: 2
  },
  blockMath: {
    width: '100%',
    marginVertical: 8
  },
  image: {
    width: '100%',
    height: 180,
    marginVertical: 8
  }
})

const markdownStyles = StyleSheet.create({
  body: {
    color: colors.text
  },
  text: {
    color: colors.text
  },
  heading1: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
    color: colors.text
  },
  heading2: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
    color: colors.text
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: 6
  },
  bullet_list: {
    marginBottom: 8
  }
})
