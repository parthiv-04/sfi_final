import { lazy, Suspense, useState } from 'react'
import { HelpButtons } from './multiplayer/LearningUI'
const OfflineGame = lazy(() => import('./App'))
const HostView = lazy(() => import('./multiplayer/HostView'))
const PlayerView = lazy(() => import('./multiplayer/PlayerView'))
export default function Launcher() {
  const [mode, setMode] = useState<'home' | 'offline' | 'host' | 'player'>(new URLSearchParams(window.location.search).has('join') ? 'player' : 'home')
  const back = () => { window.history.replaceState(null, '', window.location.pathname); setMode('home') }
  if (mode !== 'home') return <Suspense fallback={<main className="setup-shell"><p>Opening game…</p></main>}>{mode === 'offline' ? <><button className="quiet offline-modes" onClick={back}>Modes</button><OfflineGame /></> : mode === 'host' ? <HostView onBack={back} /> : <PlayerView onBack={back} />}</Suspense>
  return <main className="setup-shell"><section className="setup-panel"><div className="launcher-heading"><h1>Food Resilience Market</h1><HelpButtons /></div><p className="lead">Play together on phones, or pass one screen around.</p><div className="mode-grid"><button className="primary mode-card" onClick={() => setMode('host')}><strong>Host a room</strong></button><button className="primary mode-card" onClick={() => setMode('player')}><strong>Join a room</strong></button><button className="quiet mode-card" onClick={() => setMode('offline')}><strong>Single-screen mode</strong><span>Offline · pass-and-play</span></button></div>

  </section></main>
}
