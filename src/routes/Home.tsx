import { Link } from 'react-router-dom'

function Home() {
  return (
    <main>
      <h1>Home</h1>
      <section>
        <h2>Pool global</h2>
        <ul>
          <li>
            <Link to="/review">Demarrer la session</Link>
          </li>
          <li>
            <Link to="/library">Library</Link>
          </li>
          <li>
            <Link to="/card/new">Nouvelle carte</Link>
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
      </section>
    </main>
  )
}

export default Home
