import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { createCard, getCardById, updateCard } from '../db/queries'
import MarkdownRenderer from '../components/MarkdownRenderer'
import { useI18n } from '../i18n/useI18n'

function CardEditor() {
  const { t } = useI18n()
  const { cardId } = useParams()
  const navigate = useNavigate()
  const [front, setFront] = useState('')
  const [back, setBack] = useState('')
  const [hint, setHint] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isLoading, setIsLoading] = useState(Boolean(cardId))
  const numericCardId = cardId ? Number(cardId) : null
  const modeLabel = cardId ? `${t('cardEditor.titleEdit')} ${cardId}` : t('cardEditor.titleNew')

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
        setHint(card.hint_md ?? '')
        setTagsInput(card.tags.join(', '))
      }
      setIsLoading(false)
    }

    void loadCard()
  }, [numericCardId])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedHint = hint.trim() ? hint : null
    if (numericCardId && !Number.isNaN(numericCardId)) {
      await updateCard(numericCardId, {
        front_md: front,
        back_md: back,
        tags: parsedTags,
        hint_md: normalizedHint
      })
    } else {
      await createCard({
        front_md: front,
        back_md: back,
        tags: parsedTags,
        hint_md: normalizedHint
      })
    }
    navigate('/library')
  }

  return (
    <main className="container page">
      <h1>{cardId ? t('cardEditor.titleEdit') : t('cardEditor.titleNew')}</h1>
      <p>{modeLabel}</p>
      {isLoading ? (
        <p>{t('status.loading')}</p>
      ) : (
        <form onSubmit={handleSubmit} className="card section">
          <div>
            <label htmlFor="front">{t('cardEditor.front')}</label>
            <textarea
              id="front"
              rows={6}
              value={front}
              className="textarea"
              onChange={(event) => setFront(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="back">{t('cardEditor.back')}</label>
            <textarea
              id="back"
              rows={6}
              value={back}
              className="textarea"
              onChange={(event) => setBack(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="hint">{t('cardEditor.hint')}</label>
            <textarea
              id="hint"
              rows={4}
              value={hint}
              className="textarea"
              onChange={(event) => setHint(event.target.value)}
            />
          </div>
          <div>
            <label htmlFor="tags">{t('cardEditor.tags')}</label>
            <input
              id="tags"
              type="text"
              value={tagsInput}
              className="input"
              onChange={(event) => setTagsInput(event.target.value)}
            />
          </div>
          <button type="submit" className="btn btn-primary">
            {t('actions.save')}
          </button>
        </form>
      )}
      <section className="card section">
        <h2>{t('cardEditor.preview')}</h2>
        <div>
          <h3>{t('cardEditor.front')}</h3>
          <div className="markdown">
            <MarkdownRenderer value={front || '*Rien à afficher*'} />
          </div>
        </div>
        <div>
          <h3>{t('cardEditor.back')}</h3>
          <div className="markdown">
            <MarkdownRenderer value={back || '*Rien à afficher*'} />
          </div>
        </div>
      </section>
    </main>
  )
}

export default CardEditor
