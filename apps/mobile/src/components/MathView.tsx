import { useMemo, useState } from 'react'
import { Platform, StyleSheet } from 'react-native'
import { WebView } from 'react-native-webview'
import { colors } from '../ui/theme'

type MathViewProps = {
  latex: string
  inline?: boolean
}

const buildHtml = (latex: string, inline: boolean) => `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.css"
    />
    <style>
      body { margin: 0; padding: 0; background: transparent; color: ${colors.text}; }
      #math { display: inline-block; }
    </style>
  </head>
  <body>
    <span id="math"></span>
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.11/dist/katex.min.js"></script>
    <script>
      const el = document.getElementById('math');
      try {
        katex.render(${JSON.stringify(latex)}, el, {
          displayMode: ${inline ? 'false' : 'true'},
          throwOnError: false
        });
      } catch (err) {
        el.textContent = ${JSON.stringify(latex)};
      }
      const height = document.body.scrollHeight;
      const width = document.body.scrollWidth;
      window.ReactNativeWebView.postMessage(JSON.stringify({ height, width }));
    </script>
  </body>
</html>
`

export const MathView = ({ latex, inline = false }: MathViewProps) => {
  const [height, setHeight] = useState(inline ? 24 : 48)
  const [width, setWidth] = useState(inline ? 24 : undefined)

  const html = useMemo(() => buildHtml(latex, inline), [latex, inline])

  return (
    <WebView
      originWhitelist={['*']}
      source={{ html }}
      javaScriptEnabled
      scrollEnabled={false}
      onMessage={(event) => {
        try {
          const payload = JSON.parse(event.nativeEvent.data) as { height: number; width: number }
          if (payload?.height) {
            setHeight(Math.max(20, payload.height))
          }
          if (inline && payload?.width) {
            setWidth(Math.max(20, payload.width))
          }
        } catch {
          // ignore malformed messages
        }
      }}
      style={[
        styles.webview,
        inline ? { width, height } : { width: '100%', height }
      ]}
    />
  )
}

const styles = StyleSheet.create({
  webview: {
    backgroundColor: 'transparent',
    ...(Platform.OS === 'android' ? { opacity: 0.99 } : null)
  }
})
