import { GrowFarm } from '../ui/GrowFarm'
import { useEffect, useRef, useState } from 'react'
import { randomId } from './ids'
import { connectFirebase } from './firebase'
import { NETWORK_CONFIG } from './config'
import { CouncilControls, PhoneFarm, ROLE_HINTS, ROLE_LABELS } from './PhoneControls'
import { Discussion } from './Debrief'
import { HelpButtons, RoundTracker, SharedLearning } from './LearningUI'
import { money, PhoneBars, PlanningTimer, SharedBoard, units } from './SharedBoard'
import type { ClientAction, Presence, PrivateView, PublicRoom, RealtimeService } from './protocol'
export default function PlayerView({ onBack }: { onBack: () => void }) {
  const [code, setCode] = useState(new URLSearchParams(window.location.search).get('join')?.toUpperCase() ?? localStorage.getItem('frm-player-room') ?? '')
  const [name, setName] = useState(localStorage.getItem('frm-player-name') ?? '')
  const [room, setRoom] = useState<PublicRoom | null>(null), [view, setView] = useState<PrivateView | null>(null)
  const [presence, setPresence] = useState<Presence | null>(null), [online, setOnline] = useState(false)
  const [joined, setJoined] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [message, setMessage] = useState('')
  const [pending, setPending] = useState<ClientAction | null>(null), [now, setNow] = useState(Date.now())
  const service = useRef<RealtimeService | null>(null), pendingRef = useRef<ClientAction | null>(null), stops = useRef<(() => void)[]>([]), autoJoined = useRef(false)
  const hostOnline = !!presence?.online && now - presence.lastSeen < NETWORK_CONFIG.hostTimeoutMs
  const pendingKey = `frm-pending-${code}`
  const remember = (packet: ClientAction | null) => { pendingRef.current = packet; setPending(packet); if (packet) sessionStorage.setItem(pendingKey, JSON.stringify(packet)); else sessionStorage.removeItem(pendingKey) }
  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), NETWORK_CONFIG.phoneTickMs); return () => { window.clearInterval(timer); stops.current.forEach((stop) => stop()) } }, [])
  const send = async (type: ClientAction['type'], payload: unknown) => {
    if (!service.current || !room || pendingRef.current) return
    const packet: ClientAction = { id: randomId(), actorUid: service.current.uid, revision: view?.revision ?? room.revision, round: room.round, seatRevision: view?.seatRevision, type, payload }
    setError(''); setMessage(''); remember(packet)
    try { await service.current.sendAction(code, packet) } catch (e) { remember(null); setError(e instanceof Error ? e.message : 'Could not save.') }
  }
  const join = async () => {
    setBusy(true); setError('')
    try {
      if (!/^[A-Z]{4}$/.test(code) || !name.trim()) throw new Error('Enter the room code and your name.')
      const connection = await connectFirebase(); service.current = connection; stops.current.forEach((stop) => stop())
      let restored: ClientAction | null = null
      try { restored = JSON.parse(sessionStorage.getItem(pendingKey) ?? 'null') } catch { /* discard invalid local packet */ }
      if (restored?.actorUid !== connection.uid) restored = null
      remember(restored)
      const failed = (e: Error) => setError(e.message)
      stops.current = [connection.watchConnection(setOnline), connection.watchPublic(code, (value) => { setRoom(value); if (!value) setError('Room not found.') }, failed), connection.watchPrivate(code, setView, failed), connection.watchPresence(code, setPresence, failed), connection.watchReceipts(code, (receipt) => { if (receipt.actionId !== pendingRef.current?.id) return; remember(null); if (receipt.accepted) { setMessage(receipt.message); setError('') } else setError(receipt.message) }, failed)]
      setJoined(true); localStorage.setItem('frm-player-room', code); localStorage.setItem('frm-player-name', name.trim())
      if (!restored) { const packet: ClientAction = { id: randomId(), actorUid: connection.uid, revision: 0, type: 'join', payload: { name: name.trim() } }; remember(packet); await connection.sendAction(code, packet) }
    } catch (e) { remember(null); setJoined(false); setError(e instanceof Error ? e.message : 'Could not join.') }
    finally { setBusy(false) }
  }
  const leave = () => {
    if (!window.confirm(`Leave room ${code}? You can join a different room afterward.`)) return
    stops.current.forEach((stop) => stop()); stops.current = []
    sessionStorage.removeItem(pendingKey); pendingRef.current = null; setPending(null)
    localStorage.removeItem('frm-player-room')
    const url = new URL(window.location.href); url.searchParams.delete('join'); window.history.replaceState(null, '', url)
    service.current = null; setRoom(null); setView(null); setPresence(null); setJoined(false); setError(''); setMessage(''); setCode('')
  }
  useEffect(() => { if (!autoJoined.current && name && localStorage.getItem('frm-player-room') === code) { autoJoined.current = true; void join() } }, [])
  useEffect(() => {
    if (!joined || !online || !service.current || !room) return
    const connection = service.current
    const beat = () => { void connection.sendAction(code, { id: randomId(), actorUid: connection.uid, revision: 0, type: 'heartbeat', payload: {} }).catch(() => {}) }
    beat()
    const timer = window.setInterval(beat, NETWORK_CONFIG.heartbeatMs)
    return () => window.clearInterval(timer)
  }, [joined, online, room?.code])
  const disabled = busy || !!pending || !!room?.paused || !online || !hostOnline || (!!view && !!room && view.revision !== room.revision)
  return <main className="phone-shell"><header className="phone-header"><h1>Food Resilience Market</h1><HelpButtons room={room ?? undefined} /><button className="quiet" onClick={onBack}>Modes</button></header>{room?.started && <RoundTracker room={room} />}{error && <p className="error" role="alert">{error}</p>}{message && <p className="accepted-message" role="status">{message}</p>}
    {!joined ? <section className="workspace"><h2>Join a room</h2><form className="phone-form" onSubmit={(e) => { e.preventDefault(); void join() }}><label>Room code<input maxLength={NETWORK_CONFIG.roomCodeLength} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /></label><label>Your name<input maxLength={NETWORK_CONFIG.maxNameLength} value={name} onChange={(e) => setName(e.target.value)} /></label><button className="primary" disabled={busy}>Join room</button></form></section> : <>
      <p className="phone-room-line">Room {code} · {name} <button className="quiet" onClick={leave}>Leave room</button></p>{!online ? <p className="error">Disconnected. Reconnecting…</p> : !hostOnline && <p className="error">Host disconnected. Wait for the host to reopen the room.</p>}
      {pending && <button className="quiet" disabled={!online || !hostOnline} onClick={() => { if (pendingRef.current) void service.current!.sendAction(code, pendingRef.current).catch((e) => setError(String(e))) }}>Retry pending choice safely</button>}
      {room && view && !room.started && <section className="workspace"><h2>Pick a seat</h2><div className="seat-grid">{room.seats.map((seat) => <button key={seat.id} className="quiet seat-card" disabled={disabled || (seat.taken && view.participant.seatId !== seat.id)} onClick={() => void send('claimSeat', { seatId: seat.id })}><strong>{seat.id === 'council' ? 'Food Council' : `Farm ${seat.id.slice(1)}`}</strong><span>{seat.taken ? seat.name : 'Available'}</span>{seat.role && <small>{ROLE_LABELS[seat.role]}</small>}</button>)}</div>{view.participant.seatId && view.participant.seatId !== 'council' && <><h2>Pick your role</h2><div className="seat-grid">{(['contract', 'maeTha'] as const).map((role) => <button key={role} className={`quiet seat-card ${view.participant.role === role ? 'selected' : ''}`} aria-pressed={view.participant.role === role} disabled={disabled} onClick={() => void send('chooseRole', { role })}><strong>{ROLE_LABELS[role]}</strong><span>{ROLE_HINTS[role]}</span></button>)}</div><p className="hint">Each game needs at least one company-contract farmer and one Mae Tha organic farmer.</p></>}</section>}
      {room?.started && view?.participant.spectator && <p>Spectator: the game has started.</p>}
      {room && view && <PhoneBars room={room} view={view} />}
      {room && view?.player && room.learning.kind === 'grow' && room.learning.index === 1 && <GrowFarm key={`${room.runId}-${room.round}-${view.player.id}`} view={view} room={room} disabled={disabled} onDone={destroyed=>void send('pest',{destroyed})} />}{room?.learning.kind && <SharedLearning room={room} disabled={disabled} ready={!!view && room.learningReady.includes(view.participant.uid)} onNext={() => void send('learningNext', { ...room.learning })} onSkip={() => void send('learningSkip', { ...room.learning })} />}
      {room && view?.player && room.discussionIndex < 0 && !room.learning.kind && <section className="workspace own-farm"><h2>{view.player.name} · {money(view.player.cash)}</h2><p>Harvest: {units(view.player.harvest)} · your stored food: {units(view.ownStock)}</p>{view.canPlan ? <><PlanningTimer endsAt={room.planningEndsAt} /><PhoneFarm key={`${room.round}-${view.player.id}`} view={view} room={room} disabled={disabled} onSave={(choice) => void send('plan', { choice })} /></> : <p>{room.phase === 'council' ? 'Waiting for the Council action after everyone submits.' : 'Planning is complete.'}</p>}</section>}
      {room && view?.canCouncil && <section className="workspace"><h2>Food Council</h2><CouncilControls key={room.round} view={view} disabled={disabled} onSubmit={(plan) => void send('council', { plan })} /></section>}
      {room && (room.discussionIndex >= 0 ? <Discussion key={view?.participant.uid} room={room} answer={view?.reflection ?? ''} disabled={disabled} onAnswer={view?.player ? (answer) => void send('reflection', { answer }) : undefined} /> : !room.learning.kind && <SharedBoard room={room} compact />)}
    </>}
  </main>
}
