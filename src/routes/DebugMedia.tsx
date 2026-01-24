import { useEffect, useMemo, useState } from 'react'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { resolveImageSrc } from '../utils/media'

const TEST_MARKDOWN = '![test](storage:assets/flags/fr.svg)'

function DebugMedia() {
  const originalSrc = 'storage:assets/flags/fr.svg'
  const resolvedSrc = useMemo(() => resolveImageSrc(originalSrc), [originalSrc])
  const [status, setStatus] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    console.log('[IMG RESOLVE][debug]', originalSrc, '->', resolvedSrc)
  }, [originalSrc, resolvedSrc])

  useEffect(() => {
    const run = async () => {
      try {
        const response = await fetch(resolvedSrc, { method: 'HEAD' })
        setStatus(response.status)
      } catch (err) {
        setError((err as Error).message)
      }
    }
    if (resolvedSrc) {
      void run()
    }
  }, [resolvedSrc])

  return (
    <main className="container page">
      <div className="page-header">
        <h1>Debug Media</h1>
        <p>Verification du resolver storage: + statut HTTP.</p>
      </div>
      <section className="card section">
        <h2>Markdown test</h2>
        <div className="markdown">
          <MarkdownRenderer value={TEST_MARKDOWN} />
        </div>
      </section>
      <section className="card section">
        <h2>Resolution</h2>
        <p>
          <strong>Original:</strong> {originalSrc}
        </p>
        <p>
          <strong>Resolved:</strong> {resolvedSrc || '—'}
        </p>
        <p>
          <strong>HEAD status:</strong> {status ?? '—'}
        </p>
        {error ? <p>Erreur: {error}</p> : null}
        {status && status !== 200 ? (
          <p>
            La ressource n'est pas accessible (bucket public/policy/path).
          </p>
        ) : null}
      </section>
    </main>
  )
}

export default DebugMedia
