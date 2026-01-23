import { Link } from 'react-router-dom'
const globalDeckId = 1

function Home() {

  return (
    <main>
      <h1>Home</h1>
      <section>
        <h2>Pool global</h2>
        <ul>
          <li>
            <Link to={`/deck/${globalDeckId}`}>Dashboard</Link>
          </li>
          <li>
            <Link to={`/deck/${globalDeckId}/review`}>Demarrer la session</Link>
          </li>
          <li>
            <Link to={`/deck/${globalDeckId}/library`}>Library</Link>
          </li>
          <li>
            <Link to={`/deck/${globalDeckId}/card/new`}>Nouvelle carte</Link>
          </li>
          <li>
            <Link to={`/deck/${globalDeckId}/stats`}>Stats</Link>
          </li>
          <li>
            <Link to={`/deck/${globalDeckId}/settings`}>Settings</Link>
          </li>
          <li>
            <Link to={`/deck/${globalDeckId}/import-export`}>Import/Export</Link>
          </li>
        </ul>
      </section>
    </main>
  )
}

export default Home
