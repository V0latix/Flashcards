import { Link, useParams } from 'react-router-dom'

function CardEditor() {
  const { deckId = 'demo', cardId } = useParams()
  const basePath = `/deck/${deckId}`
  const modeLabel = cardId ? `Edit card ${cardId}` : 'New card'

  return (
    <main>
      <h1>Card Editor</h1>
      <p>Deck: {deckId}</p>
      <p>{modeLabel}</p>
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
