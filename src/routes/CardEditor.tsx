import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import { createCard, getCardById, updateCard } from '../db/queries'

function CardEditor() {
  const { deckId = 'demo', cardId } = useParams()
  const basePath = `/deck/${deckId}`
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
    navigate(`${basePath}/library`)
  }

  return (
    <main>
      <h1>Card Editor</h1>
      <p>Deck: {deckId}</p>
      <p>{modeLabel}</p>
      {isLoading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit}>
          <div>
            <label htmlFor="front">Front</label>
            <textarea
              id="front"
              rows={6}
              value={front}
              onChange={(event) => setFront(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="back">Back</label>
            <textarea
              id="back"
              rows={6}
              value={back}
              onChange={(event) => setBack(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="tags">Tags (comma separated)</label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </div>
          <button type="submit">Save</button>
        </form>
      )}
      <section>
        <h2>Preview</h2>
        <div>
          <h3>Front</h3>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {front || '*Rien a afficher*'}
          </ReactMarkdown>
        </div>
        <div>
          <h3>Back</h3>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {back || '*Rien a afficher*'}
          </ReactMarkdown>
        </div>
      </section>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to={basePath}>Deck dashboard</Link>
          </li>
          <li>
            <Link to={`${basePath}/review`}>Review session</Link>
          </li>
          <li>
            <Link to={`${basePath}/library`}>Library</Link>
          </li>
          <li>
            <Link to={`${basePath}/card/new`}>New card</Link>
          </li>
          <li>
            <Link to={`${basePath}/card/1/edit`}>Edit card (demo)</Link>
          </li>
          <li>
            <Link to={`${basePath}/stats`}>Stats</Link>
          </li>
          <li>
            <Link to={`${basePath}/settings`}>Settings</Link>
          </li>
          <li>
            <Link to={`${basePath}/import-export`}>Import/Export</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default CardEditor
