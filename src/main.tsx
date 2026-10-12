import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/index.css'
import { useStackableStore } from './store/useStackableStore'
import { initAppearance } from './store/useAppearance'
import { initWidgets } from './store/useWidgets'
import { initItemMeta } from './store/useItemMeta'

// Dev server only: lets the browser console poke the store (fake open tabs, toasts).
if (import.meta.env.DEV) {
  ;(window as unknown as { __stackable: typeof useStackableStore }).__stackable = useStackableStore
}

// Palette, mode, density and background: theme-boot.js already put them on <html> for the first
// frame; this catches up with chrome.storage and follows the OS and other tabs from here on.
initAppearance()
initWidgets()
initItemMeta()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
