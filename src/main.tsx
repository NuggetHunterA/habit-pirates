import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import './looks.css'
import { applyLook } from './look'
import App from './App'

applyLook()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD && location.protocol === 'https:' && !import.meta.env.VITE_SINGLEFILE) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}))
}
