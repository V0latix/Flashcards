import type { SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

export const HomeIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-8.5z"
      fill="currentColor"
    />
  </svg>
)

export const PlayIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M8 5l11 7-11 7V5z" fill="currentColor" />
  </svg>
)

export const PlusIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M11 5h2v14h-2zM5 11h14v2H5z" fill="currentColor" />
  </svg>
)

export const ChartIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path d="M4 19h16v2H4zM6 10h3v7H6zM11 6h3v11h-3zM16 12h3v5h-3z" fill="currentColor" />
  </svg>
)

export const SettingsIcon = (props: IconProps) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" {...props}>
    <path
      d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7zm9 3.5a7.7 7.7 0 0 0-.1-1.2l-2.2-.3-.6-1.4 1.3-1.8a9.2 9.2 0 0 0-1.7-1.7l-1.8 1.3-1.4-.6-.3-2.2A7.7 7.7 0 0 0 12 3a7.7 7.7 0 0 0-1.2.1l-.3 2.2-1.4.6-1.8-1.3a9.2 9.2 0 0 0-1.7 1.7l1.3 1.8-.6 1.4-2.2.3A7.7 7.7 0 0 0 3 12c0 .4 0 .8.1 1.2l2.2.3.6 1.4-1.3 1.8a9.2 9.2 0 0 0 1.7 1.7l1.8-1.3 1.4.6.3 2.2c.4.1.8.1 1.2.1s.8 0 1.2-.1l.3-2.2 1.4-.6 1.8 1.3a9.2 9.2 0 0 0 1.7-1.7l-1.3-1.8.6-1.4 2.2-.3c.1-.4.1-.8.1-1.2z"
      fill="currentColor"
    />
  </svg>
)
