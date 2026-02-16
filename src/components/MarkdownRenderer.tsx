import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { resolveImageSrc } from '../utils/media'

type MarkdownRendererProps = {
  value: string
}

const normalizeMathDelimiters = (value: string) =>
  value
    .replace(/\\\[((?:.|\r|\n)*?)\\\]/g, (_, expr: string) => `$$\n${expr}\n$$`)
    .replace(/\\\(((?:.|\r|\n)*?)\\\)/g, (_, expr: string) => `$${expr}$`)

const normalizeMathEscapes = (value: string) =>
  value
    .replace(/\\\$/g, '$')
    // Some imports over-escape TeX commands like \\forall -> \forall.
    .replace(/\\\\(?=[A-Za-z{}[\]()])/g, '\\')

const CONTROL_ESCAPE_MAP = new Map<number, string>([
  [8, '\\b'], // \b -> backspace (e.g., \big)
  [9, '\\t'], // \t -> tab (e.g., \text)
  [12, '\\f'] // \f -> form feed (e.g., \frac)
])

const normalizeControlEscapes = (value: string) => {
  let out = ''
  for (const char of value) {
    const replacement = CONTROL_ESCAPE_MAP.get(char.charCodeAt(0))
    out += replacement ?? char
  }
  return out
}

const MarkdownImage = ({
  src,
  alt,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement>) => {
  const [errored, setErrored] = useState(false)
  const originalSrc = src ?? ''
  const resolvedSrc = originalSrc ? resolveImageSrc(originalSrc) : ''

  useEffect(() => {
    if (import.meta.env.DEV && originalSrc) {
      console.log('[IMG RESOLVE]', originalSrc, '->', resolvedSrc)
    }
  }, [originalSrc, resolvedSrc])

  if (!resolvedSrc || errored) {
    return <span className="img-error">Image introuvable</span>
  }

  return (
    <img
      {...props}
      alt={alt || 'Image'}
      loading="lazy"
      src={resolvedSrc}
      onError={() => {
        console.error('[IMG ERROR]', { originalSrc, resolvedSrc })
        setErrored(true)
      }}
    />
  )
}

const MarkdownRenderer = ({ value }: MarkdownRendererProps) => {
  const normalizedValue = normalizeMathDelimiters(
    normalizeMathEscapes(normalizeControlEscapes(value))
  )

  return (
    <ReactMarkdown
      urlTransform={(uri) => uri}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        img: MarkdownImage
      }}
    >
      {normalizedValue}
    </ReactMarkdown>
  )
}

export default MarkdownRenderer
