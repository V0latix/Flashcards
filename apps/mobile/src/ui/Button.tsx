import { Pressable, StyleSheet, Text } from 'react-native'
import { colors } from './theme'

type Variant = 'primary' | 'secondary' | 'danger'

type ButtonProps = {
  title: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
}

const variantStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  secondary: {
    backgroundColor: colors.secondary,
    borderColor: colors.border
  },
  danger: {
    backgroundColor: colors.danger,
    borderColor: colors.danger
  }
})

const textStyles = StyleSheet.create({
  primary: {
    color: colors.primaryText
  },
  secondary: {
    color: colors.secondaryText
  },
  danger: {
    color: colors.dangerText
  }
})

export const Button = ({ title, onPress, variant = 'primary', disabled }: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    onPress={onPress}
    disabled={disabled}
    style={({ pressed }) => [
      styles.button,
      variantStyles[variant],
      pressed && !disabled ? styles.pressed : null,
      disabled ? styles.disabled : null
    ]}
  >
    <Text style={[styles.text, textStyles[variant]]}>{title}</Text>
  </Pressable>
)

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  text: {
    fontSize: 14,
    fontWeight: '600'
  },
  pressed: {
    opacity: 0.85
  },
  disabled: {
    opacity: 0.5
  }
})
