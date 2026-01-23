import { Link, useParams } from 'react-router-dom'

function DeckDashboard() {
  const { deckId = 'demo' } = useParams()
  const basePath = `/deck/${deckId}`

  return (
    <main>
      <h1>Deck Dashboard</h1>
      <p>Pool global</p>
      <p>
        <Link to={`${basePath}/review`}>Demarrer la session du jour</Link>
      </p>
      <nav>
        <ul>
          <li>
            <Link to="/">Home</Link>
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
          <li>
            <Link to={`${basePath}/import-export`}>Import/Export</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default DeckDashboard
