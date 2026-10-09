import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { isNative } from './lib/native'
import { applyTheme, getTheme, setTheme } from './lib/theme'

const forced = new URLSearchParams(window.location.search).get('theme')
if (forced === 'dark' || forced === 'light') setTheme(forced)
else applyTheme(getTheme())

if (isNative()) {
  import('@capacitor/status-bar')
    .then(({ StatusBar, Style }) => StatusBar.setStyle({ style: Style.Default }).catch(() => undefined))
    .catch(() => undefined)
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
