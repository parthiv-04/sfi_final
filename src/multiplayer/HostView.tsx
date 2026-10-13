import { PolicySettings } from '../ui/PolicySettings'
import type { PolicyScenario } from '../round2/types'
import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { ROUND2_CONFIG } from '../round2/config'
import { connectFirebase } from './firebase'
import { HostController } from './controller'
import { projectRoom } from './hostModel'
import { Discussion } from './Debrief'
import { HelpButtons, RoundTracker, SharedLearning } from './LearningUI'
import { RoundReveal, SharedBoard } from './SharedBoard'
import type { RealtimeService, RoomModel } from './protocol'


export default function HostView({ onBack }: { onBack: () => void }) {
  const [model, setModel] = useState<RoomModel | null>(null)
  const [policy,setPolicy] = useState<PolicyScenario>('none')
  const [skipPest, setSkipPest] = useState(false)
  const [farmerCount, setFarmerCount] = useState<number>(ROUND2_CONFIG.playerCount)
  const [mode, setMode] = useState<RoomModel['councilMode']>('automatic')
  const [resumeCode, setResumeCode] = useState(localStorage.getItem('frm-host-code') ?? '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [online, setOnline] = useState(true)
  const [qr, setQr] = useState('')
  const [revealedRound, setRevealedRound] = useState(0)
  const controller = useRef<HostController | null>(null)
  const serviceRef = useRef<RealtimeService | null>(null)
  const stopRef = useRef<(() => void) | null>(null)
  const alive = useRef(true)
  useEffect(() => { alive.current = true; return () => { alive.current = false; controller.current?.stop(); stopRef.current?.() } }, [])
  const attach = async (service: RealtimeService, host: HostController) => {
    stopRef.current?.()
    controller.current?.stop()
    localStorage.setItem('frm-host-code', host.model.code)
    setResumeCode(host.model.code)
    const stopPresence = await service.startHostPresence(host.model.code, (err) => setError(err.message))
    if (!alive.current) { stopPresence(); return }
    const stopConnection = service.watchConnection((connected) => { setOnline(connected); if (connected) host.listen() })
    controller.current = host
    serviceRef.current = service
    stopRef.current = () => { stopPresence(); stopConnection() }
    localStorage.setItem('frm-host-code', host.model.code)
    setResumeCode(host.model.code)
    setModel(host.model)
    host.listen()
  }
  const openRoom = async (resume = false) => {
    setBusy(true); setError('')
    try {
      controller.current?.stop()
      await controller.current?.drain()
      stopRef.current?.()
      stopRef.current = null
      const service = await connectFirebase()
      const host = resume ? new HostController(service, await service.resumeHost(resumeCode.toUpperCase()), setModel, (err) => setError(err.message)) : await HostController.create(service, mode, setModel, (err) => setError(err.message), farmerCount)
      if (!resume) await host.hostAction('settings', { skipPest, policy })
      await attach(service, host)
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not open the room.') }
    finally { setBusy(false) }
  }
  const joinUrl = model ? new URL(`?join=${model.code}`, import.meta.env.VITE_PUBLIC_APP_URL || window.location.href).href : ''
  useEffect(() => { let canceled = false; if (joinUrl) void QRCode.toDataURL(joinUrl, { width: 220, margin: 2 }).then((data) => { if (!canceled) setQr(data) }).catch((err) => setError(String(err))); return () => { canceled = true } }, [joinUrl])
  const act = async (type: Parameters<HostController['hostAction']>[0], payload: unknown = {}) => {
    if (!controller.current) return
    setBusy(true); setError('')
    try { await controller.current.hostAction(type, payload); if (type === 'replay') setRevealedRound(0) } catch (err) { setError(err instanceof Error ? err.message : 'Action failed.') }
    finally { setBusy(false) }
  }
  useEffect(() => {
    if (!online || model?.paused || model?.game?.phase !== 'planning' || model.planningEndsAt === null) return
    const timer = window.setTimeout(() => { void controller.current?.hostAction('resolve').catch((err) => setError(err.message)) }, Math.max(0, model.planningEndsAt - Date.now()))
    return () => window.clearTimeout(timer)
  }, [online, model?.planningEndsAt, model?.game?.phase, model?.paused])
  useEffect(() => {
    if (!online || model?.paused || model?.pestEndsAt == null) return
    const timer = window.setTimeout(() => { void controller.current?.hostAction('growFinish').catch(err=>setError(err.message)) }, Math.max(0, model.pestEndsAt-Date.now()) + ROUND2_CONFIG.timerTickMs)
    return ()=>window.clearTimeout(timer)
  }, [online,model?.paused,model?.pestEndsAt])
  const projection = model ? projectRoom(model) : null
  
  return <main className="round-two-shell host-shell"><header className="r2-header"><h1>Food Resilience Market · Host</h1>{model?.game && <strong>Room {model.code}</strong>}<HelpButtons room={model ? projectRoom(model).publicRoom : undefined} cards /><button className="quiet" onClick={onBack}>Modes</button></header>{error && <p className="error" role="alert">{error}</p>}{!online && <p className="error">Host connection lost. Choices are paused until you reconnect.</p>}
    {!model ? <section className="workspace host-room-entry"><h2>Create a room</h2><label className="field">Farmers<select value={farmerCount} onChange={(event) => { const count = Number(event.target.value); setFarmerCount(count); if (count < ROUND2_CONFIG.playerCount) setMode('automatic') }}>{Array.from({ length: ROUND2_CONFIG.maxPlayers - ROUND2_CONFIG.minPlayers + 1 }, (_, i) => i + ROUND2_CONFIG.minPlayers).map((n) => <option key={n} value={n}>{n} farmers</option>)}</select></label><label className="field">Council seat<select value={mode} onChange={(event) => setMode(event.target.value as RoomModel['councilMode'])}><option value="automatic">Automatic Council</option><option value="player">A player is the Council</option></select></label><PolicySettings value={policy} onChange={setPolicy} /><label><input type="checkbox" checked={skipPest} onChange={e=>setSkipPest(e.target.checked)} /> Skip pest game</label><button className="primary" disabled={busy} onClick={() => void openRoom()}>Create room</button><p className="limitation">This is a simplified distribution chain; real cities have many more routes.</p><hr /><label className="field">Resume your host room<input maxLength={4} value={resumeCode} onChange={(event) => setResumeCode(event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))} /></label><button className="quiet" disabled={busy || resumeCode.length !== 4} onClick={() => void openRoom(true)}>Resume room</button></section> : <>
      {!model.game && <section className="room-banner"><div><p className="eyebrow">Join on a phone</p><strong className="room-code">{model.code}</strong><a href={joinUrl}>{joinUrl}</a>{/^(localhost|127\.0\.0\.1)$/.test(new URL(joinUrl).hostname) && <p className="hint">Use your laptop’s LAN address or deployed URL so phones can reach this QR link.</p>}</div>{qr && <img src={qr} width={220} height={220} alt={`QR code to join room ${model.code}`} />}</section>}
      {!model.game && <section className="workspace"><h2>Lobby</h2><div className="seat-grid">{projection!.publicRoom.seats.map((seat) => <div className="seat-card" key={seat.id}><strong>{seat.id === 'council' ? 'Council' : `Farm ${seat.id.slice(1)}`}</strong><span>{seat.taken ? seat.name : 'Waiting for a phone'}</span></div>)}</div><button className="primary" disabled={busy || !online || projection!.publicRoom.seats.some((seat) => !seat.taken)} onClick={() => void act('start')}>Start game</button>{projection!.publicRoom.seats.filter((seat) => seat.id !== 'council' && seat.taken).length >= ROUND2_CONFIG.minPlayers && <button className="quiet" disabled={busy || !online} onClick={() => void act('start', { farmerCount: projection!.publicRoom.seats.filter((seat) => seat.id !== 'council' && seat.taken).length })}>Start with {projection!.publicRoom.seats.filter((seat) => seat.id !== 'council' && seat.taken).length} players</button>}</section>}
      {model.game && <RoundTracker room={projection!.publicRoom} />}
      {model.learning.kind && <SharedLearning room={projection!.publicRoom} disabled={busy || model.paused} onNext={() => void act('learningNext', { ...model.learning })} onSkip={() => void act('learningSkip', { ...model.learning })} />}
      {projection!.publicRoom.discussionIndex >= 0 ? <Discussion room={projection!.publicRoom} host onQuestion={(index) => void act('question', { index })} /> : model.game?.resolution ? <RoundReveal key={model.game.round} room={projection!.publicRoom} onComplete={() => setRevealedRound(model.game!.round)} /> : !model.learning.kind && <SharedBoard room={projection!.publicRoom} />}
      {model.game?.phase === 'resolution' && <button className="primary advance" disabled={busy || !online || revealedRound !== model.game.round} onClick={() => void act('nextRound')}>{model.game.round === ROUND2_CONFIG.rounds ? 'Show final scores' : 'Start next round'}</button>}
      {model.game && <div className="host-controls"><button className="quiet" onClick={() => void act(model.paused ? 'resume' : 'pause')}>{model.paused ? 'Resume' : 'Pause'}</button><button className="quiet" disabled={model.game.phase !== 'planning' || !!model.learning.kind} onClick={() => void act('skipTimer')}>Skip timer</button><button className="quiet" onClick={() => { if (window.confirm('End this game now?')) void act('end') }}>End game</button>{Object.values(model.participants).filter((p) => p.seatId || p.vacatedSeat).map((p) => <div key={p.uid}><span>{p.name}</span><button className="quiet" onClick={() => void act('kick', { uid: p.uid })}>Kick disconnected player</button><select aria-label={`Replace ${p.name}`} defaultValue="" onChange={(e) => { if (e.target.value) void act('replace', { uid: p.uid, replacementUid: e.target.value }) }}><option value="">Replace with joined spectator…</option>{Object.values(model.participants).filter((s) => s.spectator).map((s) => <option key={s.uid} value={s.uid}>{s.name}</option>)}</select></div>)}</div>}
      {model.game && ['debrief', 'gameOver'].includes(model.game.phase) && <><Discussion room={{ ...projection!.publicRoom, discussionIndex: -1 }} host onQuestion={(index) => void act('question', { index })} /><div className="phone-actions"><button className="primary" onClick={() => void act('replay', { sameEvents: true })}>Play again with the same events</button><button className="quiet" onClick={() => void act('replay', { sameEvents: false })}>New game</button></div></>}
      <button className="quiet reconnect-host" disabled={busy} onClick={() => void openRoom(true)}>Reconnect / resume host</button>
    </>}
  </main>
}
