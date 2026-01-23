import { Link } from 'react-router-dom'

const demoDeckId = 'demo'

function Home() {
  return (
    <main>
      <h1>Home</h1>
      <nav>
        <ul>
          <li>
            <Link to={`/deck/${demoDeckId}`}>Open deck (demo)</Link>
          </li>
          <li>
            <Link to={`/deck/${demoDeckId}/review`}>Review session</Link>
          </li>
          <li>
            <Link to={`/deck/${demoDeckId}/library`}>Library</Link>
          </li>
          <li>
            <Link to={`/deck/${demoDeckId}/card/new`}>New card</Link>
          </li>
          <li>
            <Link to={`/deck/${demoDeckId}/stats`}>Stats</Link>
          </li>
          <li>
            <Link to={`/deck/${demoDeckId}/settings`}>Settings</Link>
          </li>
          <li>
            <Link to={`/deck/${demoDeckId}/import-export`}>Import/Export</Link>
          </li>
        </ul>
      </nav>
    </main>
  )
}

export default Home
