import { useEffect, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
import { resolveImageSrc } from '../utils/media'

type MarkdownRendererProps = {
  value: string
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

const MarkdownRenderer = ({ value }: MarkdownRendererProps) => (
  <ReactMarkdown
    urlTransform={(uri) => uri}
    remarkPlugins={[remarkMath]}
    rehypePlugins={[rehypeKatex]}
    components={{
      img: MarkdownImage
    }}
  >
    {value}
  </ReactMarkdown>
)

export default MarkdownRenderer
