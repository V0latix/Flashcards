import { Link, useParams } from 'react-router-dom'

function ImportExport() {
  const { deckId = 'demo' } = useParams()
  const basePath = `/deck/${deckId}`

  return (
    <main>
      <h1>Import/Export</h1>
      <p>Deck: {deckId}</p>
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
            <Link to={`${basePath}/stats`}>Stats</Link>
          </li>
          <li>
            <Link to={`${basePath}/settings`}>Settings</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default ImportExport
