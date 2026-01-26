declare module 'markdown-it-texmath' {
  const texmath: (md: unknown, options?: Record<string, unknown>) => void
  export default texmath
}

declare module 'react-native-math-view' {
  import type { ComponentType } from 'react'
  import type { StyleProp, TextStyle, ViewStyle } from 'react-native'

  type MathViewProps = {
    math: string
    style?: StyleProp<ViewStyle & Pick<TextStyle, 'color'>>
    config?: Record<string, unknown>
  }

  const MathView: ComponentType<MathViewProps>
  export default MathView
}
