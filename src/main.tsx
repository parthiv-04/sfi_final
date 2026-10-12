import { Component, StrictMode } from 'react'
import type { ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import Launcher from './Launcher'
import './styles.css'
import './ui/pixel.css'

class GameErrorBoundary extends Component<{ children: ReactNode }, { message: string | null }> {
  state: { message: string | null } = { message: null }
  static getDerivedStateFromError(error: Error) { return { message: error.message || 'The game could not load.' } }
  render() {
    if (this.state.message) return <main className="setup-shell"><section className="setup-panel"><h1>Could not open the game</h1><p className="error" role="alert">{this.state.message}</p><p>Check your connection, then reload. If this repeats, share this message so we can fix it.</p><button className="primary" onClick={() => window.location.reload()}>Reload game</button></section></main>
    return this.props.children
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><GameErrorBoundary><Launcher /></GameErrorBoundary></StrictMode>)
