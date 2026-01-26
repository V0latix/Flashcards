import { Image, StyleSheet, Text, View } from 'react-native'
import Markdown, { MarkdownIt } from 'react-native-markdown-display'
import { SvgUri } from 'react-native-svg'
import { resolveImageSrc } from '../core/media'
import { MathView } from './MathView'
import { colors } from '../ui/theme'

type MarkdownRendererProps = {
  value: string
}

type InlineState = {
  pos: number
  src: string
  push: (type: string, tag: string, nesting: number) => { markup: string; content: string }
}

type BlockState = {
  bMarks: number[]
  eMarks: number[]
  tShift: number[]
  src: string
  line: number
  push: (type: string, tag: string, nesting: number) => {
    block: boolean
    content: string
    map: [number, number]
  }
}

const mathPlugin = (md: MarkdownIt) => {
  md.inline.ruler.before('escape', 'math_inline', (state: InlineState, silent: boolean) => {
    const start = state.pos
    if (state.src[start] !== '$' || state.src[start + 1] === '$') {
      return false
    }
    let pos = start + 1
    while (pos < state.src.length) {
      pos = state.src.indexOf('$', pos)
      if (pos === -1) {
        return false
      }
      if (state.src[pos - 1] === '\\') {
        pos += 1
        continue
      }
      break
    }
    const content = state.src.slice(start + 1, pos)
    if (!content.trim()) {
      return false
    }
    if (!silent) {
      const token = state.push('math_inline', 'math', 0)
      token.markup = '$'
      token.content = content
    }
    state.pos = pos + 1
    return true
  })

  md.block.ruler.before(
    'fence',
    'math_block',
    (state: BlockState, begLine: number, endLine: number, silent: boolean) => {
    const start = state.bMarks[begLine] + state.tShift[begLine]
    const max = state.eMarks[begLine]
    if (state.src.slice(start, start + 2) !== '$$') {
      return false
    }
    let nextLine = begLine
    let content = state.src.slice(start + 2, max)
    let found = false

    if (content.trim().endsWith('$$')) {
      content = content.replace(/\$\$\s*$/, '')
      found = true
    }

    while (!found) {
      nextLine += 1
      if (nextLine >= endLine) {
        return false
      }
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine]
      const lineMax = state.eMarks[nextLine]
      const lineText = state.src.slice(lineStart, lineMax)
      const endPos = lineText.indexOf('$$')
      if (endPos !== -1) {
        content += `\n${lineText.slice(0, endPos)}`
        found = true
        break
      }
      content += `\n${lineText}`
    }

    if (!silent) {
      const token = state.push('math_block', 'math', 0)
      token.block = true
      token.content = content.trim()
      token.map = [begLine, nextLine + 1]
    }
    state.line = nextLine + 1
    return true
  }
  )
}

const markdownIt = new MarkdownIt({
  linkify: true,
  breaks: true
}).use(mathPlugin)

const MathInline = ({ value }: { value: string }) => (
  <View style={styles.inlineMath}>
    <MathView latex={value} inline />
  </View>
)

const MathBlock = ({ value }: { value: string }) => (
  <View style={styles.blockMath}>
    <MathView latex={value} />
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
