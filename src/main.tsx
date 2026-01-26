import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import 'katex/dist/katex.min.css'
import App from './App.tsx'
import { applyTheme, getStoredTheme } from './theme'

applyTheme(getStoredTheme())

const params = new URLSearchParams(window.location.search)
const redirect = params.get('redirect')
if (redirect) {
  const base = import.meta.env.BASE_URL
  const normalized = decodeURIComponent(redirect).replace(/^\\//, '')
  const target = base.endsWith('/') ? `${base}${normalized}` : `${base}/${normalized}`
  window.history.replaceState(null, '', target)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
