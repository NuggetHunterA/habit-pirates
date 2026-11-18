import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './theme-arena.css'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol === 'https:' && !import.meta.env.VITE_SINGLEFILE) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
