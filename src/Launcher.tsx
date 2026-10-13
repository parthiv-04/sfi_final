import { EventScene } from './ui/scenes'
import { lazy, Suspense, useState } from 'react'
import { HelpButtons } from './multiplayer/LearningUI'
const OfflineGame = lazy(() => import('./App'))
const HostView = lazy(() => import('./multiplayer/HostView'))
const PlayerView = lazy(() => import('./multiplayer/PlayerView'))
export default function Launcher() {
  const [mode, setMode] = useState<'home' | 'offline' | 'solo' | 'host' | 'player'>(new URLSearchParams(window.location.search).has('join') ? 'player' : 'home')
  const back = () => { window.history.replaceState(null, '', window.location.pathname); setMode('home') }
  if (mode !== 'home') return <Suspense fallback={<main className="setup-shell"><p>Opening game…</p></main>}>{mode === 'offline' || mode === 'solo' ? <><button className="quiet offline-modes" onClick={back}>Modes</button><OfflineGame singlePlayer={mode === 'solo'} /></> : mode === 'host' ? <HostView onBack={back} /> : <PlayerView onBack={back} />}</Suspense>
  return <main className="setup-shell"><section className="setup-panel"><div className="launcher-heading"><h1>Food Resilience Market</h1><HelpButtons /></div><EventScene kind="normal" /><h2>Two farming paths, one city</h2><p className="lead">Play together on phones, pass one screen around, or take on a single farm yourself.</p><div className="mode-grid"><button className="primary mode-card" onClick={() => setMode('host')}><strong>Host a room</strong></button><button className="primary mode-card" onClick={() => setMode('player')}><strong>Join a room</strong></button><button className="quiet mode-card" onClick={() => setMode('offline')}><strong>Pass-and-play mode</strong><span>Offline · take turns with friends</span></button><button className="quiet mode-card" onClick={() => setMode('solo')}><strong>Single player</strong><span>Offline · choose your farmer role</span></button></div>

  </section></main>
}
