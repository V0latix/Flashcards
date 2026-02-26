import { memo, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { defaultUrlTransform } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { resolveImageSrc } from '../utils/media'

type MarkdownRendererProps = {
  value: string
  imageLoading?: 'lazy' | 'eager'
  imageFetchPriority?: 'auto' | 'high' | 'low'
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

const urlTransform = (url: string, key: string, node: { tagName?: string }) => {
  if (key === 'src' && node.tagName === 'img' && url.startsWith('storage:')) {
    return url
  }
  return defaultUrlTransform(url)
}

const MarkdownImage = (
  props: React.ImgHTMLAttributes<HTMLImageElement> & {
    imageLoading: 'lazy' | 'eager'
    imageFetchPriority: 'auto' | 'high' | 'low'
  }
) => {
  const { src, alt, imageLoading, imageFetchPriority, ...rest } = props
  const [erroredSrc, setErroredSrc] = useState<string | null>(null)
  const originalSrc = src ?? ''
  const resolvedSrc = originalSrc ? resolveImageSrc(originalSrc) : ''

  useEffect(() => {
    if (import.meta.env.DEV && originalSrc) {
      console.log('[IMG RESOLVE]', originalSrc, '->', resolvedSrc)
    }
  }, [originalSrc, resolvedSrc])

  if (!resolvedSrc || erroredSrc === resolvedSrc) {
    return <span className="img-error">Image introuvable</span>
  }

  return (
    <img
      {...rest}
      alt={alt || 'Image'}
      decoding="async"
      loading={imageLoading}
      src={resolvedSrc}
      // React types may lag this attribute; keep it runtime-safe.
      {...({ fetchPriority: imageFetchPriority } as unknown as Record<string, string>)}
      onError={() => {
        console.error('[IMG ERROR]', { originalSrc, resolvedSrc })
        setErroredSrc(resolvedSrc)
      }}
    />
  )
}

const MarkdownRenderer = ({
  value,
  imageLoading = 'lazy',
  imageFetchPriority = 'auto'
}: MarkdownRendererProps) => {
  const normalizedValue = useMemo(
    () =>
      normalizeMathDelimiters(normalizeMathEscapes(normalizeControlEscapes(value))),
    [value]
  )

  const components = useMemo(
    () => ({
      img: (imgProps: React.ImgHTMLAttributes<HTMLImageElement>) => (
        <MarkdownImage
          {...imgProps}
          imageLoading={imageLoading}
          imageFetchPriority={imageFetchPriority}
        />
      )
    }),
    [imageFetchPriority, imageLoading]
  )

  return (
    <ReactMarkdown
      urlTransform={urlTransform}
      remarkPlugins={[remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={components}
    >
      {normalizedValue}
    </ReactMarkdown>
  )
}

export default memo(MarkdownRenderer)
