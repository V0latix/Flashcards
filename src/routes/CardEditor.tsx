import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { createCard, getCardById, updateCard } from '../db/queries'

function CardEditor() {
  const { cardId } = useParams()
  const navigate = useNavigate()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(cardId))
  const numericCardId = cardId ? Number(cardId) : null
  const modeLabel = cardId ? `Edit card ${cardId}` : 'New card'

  const parsedTags = useMemo(() => {
    if (!tagsInput.trim()) {
      return []
    }
    return tagsInput
      .split(',')
      .map((tag) => tag.trim())
      .filter(Boolean)
  }, [tagsInput])

  useEffect(() => {
    const loadCard = async () => {
      if (!numericCardId || Number.isNaN(numericCardId)) {
        setIsLoading(false)
        return
      }
      const card = await getCardById(numericCardId)
      if (card) {
        setFront(card.front_md)
        setBack(card.back_md)
        setTagsInput(card.tags.join(', '))
      }
      setIsLoading(false)
    }

    void loadCard()
  }, [numericCardId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (numericCardId && !Number.isNaN(numericCardId)) {
      await updateCard(numericCardId, {
        front_md: front,
        back_md: back,
        tags: parsedTags
      })
    } else {
      await createCard({
        front_md: front,
        back_md: back,
        tags: parsedTags
      })
    }
    navigate('/library')
  }

  return (
    <main className="container">
      <h1>Card Editor</h1>
      <p>{modeLabel}</p>
      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit} className="card section">
          <div>
            <label htmlFor="front">Front</label>
            <textarea
              id="front"
              rows={6}
              value={front}
              className="textarea"
              onChange={(event) => setFront(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="back">Back</label>
            <textarea
              id="back"
              rows={6}
              value={back}
              className="textarea"
              onChange={(event) => setBack(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="tags">Tags (comma separated)</label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              className="input"
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            Save
          </button>
        </form>
      )}
      <section className="card section">
        <h2>Preview</h2>
        <div>
          <h3>Front</h3>
          <div className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                img({ alt, ...props }) {
                  return <img alt={alt || 'Image'} loading="lazy" {...props} />
                }
              }}
            >
              {front || '*Rien a afficher*'}
            </ReactMarkdown>
          </div>
        </div>
        <div>
          <h3>Back</h3>
          <div className="markdown">
            <ReactMarkdown
              remarkPlugins={[remarkMath]}
              rehypePlugins={[rehypeKatex]}
              components={{
                img({ alt, ...props }) {
                  return <img alt={alt || 'Image'} loading="lazy" {...props} />
                }
              }}
            >
              {back || '*Rien a afficher*'}
            </ReactMarkdown>
          </div>
        </div>
      </section>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/review">Review session</Link>
          </li>
          <li>
            <Link to="/library">Library</Link>
          </li>
          <li>
            <Link to="/card/new">New card</Link>
          </li>
          <li>
            <Link to="/card/1/edit">Edit card (demo)</Link>
          </li>
          <li>
            <Link to="/stats">Stats</Link>
          </li>
          <li>
            <Link to="/settings">Settings</Link>
          </li>
          <li>
            <Link to="/import-export">Import/Export</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default CardEditor
