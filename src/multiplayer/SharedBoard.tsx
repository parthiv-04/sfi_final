import { PolicyComparison } from '../ui/PolicyComparison'
import { CardPanel } from './LearningUI'
import { TimeScale } from '../ui/common'
import { EventScene, RouteScene, CityScene, SecurityScene, FlowScene } from '../ui/scenes'
import { useEffect, useRef, useState } from 'react'
import { ROUND2_CONFIG as C } from '../round2/config'
import type { PrivateView, PublicRoom } from './protocol'
import type { Resolution } from '../round2/types'
import type { Lane } from '../ui/scenes'
export const money = (value: number) => `${value < 0 ? '-' : ''}$${Math.abs(value).toFixed(2)}`
export const units = (value: number) => `${Number(value.toFixed(2))} units`
export const title = (value: string) => value.replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase())
export function Bar({ label, value, max, good = false, danger = false, channel = '' }: { label: string; value: number; max: number; good?: boolean; danger?: boolean; channel?: string }) { return <div className={`goal-bar channel-${channel} ${good ? 'reached' : ''} ${danger ? 'danger' : ''}`}><div className="bar-label"><span>{label}</span><strong>{Number(value.toFixed(2))} / {max}</strong></div><div className="bar-track" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={Math.max(0, Math.min(max, value))}><div className="bar-fill" style={{ width: `${Math.max(0, Math.min(C.quantityPrecision, max ? value / max * C.quantityPrecision : 0))}%`, transitionDuration: `${C.meterAnimationMs}ms` }} /></div></div> }
export function PlanningTimer({ endsAt }: { endsAt: number | null }) { const [now, setNow] = useState(Date.now()); useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), C.timerTickMs); return () => window.clearInterval(timer) }, []); return endsAt === null ? null : <p className="planning-timer" role="timer">Plan together · {Math.max(0, Math.ceil((endsAt - now) / C.millisecondsPerSecond))} seconds left</p> }
export function PhoneBars({ room, view }: { room: PublicRoom; view: PrivateView }) {
 const need = ['flood','marketClosure'].includes(room.event?.kind ?? '') ? room.rules.cityCrisisNeed : room.rules.cityNeed
 return <div className="phone-bars">{view.player && <Bar label={`Cash → $${view.player.goal} goal`} value={view.player.cash} max={view.player.goal} good={view.player.cash>=view.player.goal} channel="market" />}<Bar label="City food security" value={room.security} max={room.rules.cityMaxSecurity} danger={room.security<=room.rules.cityMaxSecurity*C.lowSecurityFraction} channel="hub" /><small>{room.event?.label} · market ${room.event?.price}/unit</small><small>Food: {room.result?.cityDelivered ?? room.previewFed}/{need} · stored: {view.ownStock}</small></div>
}

function FinalResults({ room }: { room: PublicRoom }) {
  const closest = [...room.history].sort((a, b) => a.securityAfter - b.securityAfter)[0]
  const crises = room.history.filter((r) => ['flood', 'marketClosure'].includes(r.event.kind))
  const reserve = crises.reduce((s, r) => s + r.councilReserveReleased + r.lines.reduce((t, l) => t + l.reserveReleased, 0), 0)
  const hub = crises.reduce((s, r) => s + r.hubDelivered, 0)
  return <section className="workspace debrief"><h2>{room.phase === 'gameOver' ? 'City went hungry' : 'City fed!'}</h2><p>{room.endedEarly ? 'The host ended play early. No wins are awarded.' : room.phase === 'gameOver' ? 'Nobody wins, whatever their cash.' : 'Farmers who reached their cash goal win. Rankings use cash.'}</p><figure className="round-chart"><figcaption>Households fed per round</figcaption>{room.history.map((r) => <Bar key={r.round} label={`Round ${r.round}`} value={r.cityDelivered} max={r.cityNeed} good={r.shortfall === 0} channel="hub" />)}</figure><div className="final-farmers">{room.farmers.map((farmer) => { const score = room.scores.find((s) => s.playerId === farmer.id); return <article key={farmer.id}><h3>{score?.won ? '✓' : '✗'} {farmer.name}{score ? ` · rank ${score.rank}` : ''}</h3><Bar label={`$${farmer.cash} / $${farmer.goal} goal`} value={farmer.cash} max={farmer.goal} good={!!score?.won} channel="market" /></article> })}</div><h3>What happened</h3><p>{closest ? `The city came closest to going hungry in round ${closest.round}, with food security at ${closest.securityAfter}.` : 'The game ended before the first reveal.'} Food wasted: {units(room.waste)}.</p><p>In crisis rounds, the Mae Tha community reserve contributed {units(reserve)} and the community food hub delivered {units(hub)} in total, including reserve food.</p><p className="limitation">This is a simplified distribution chain; real cities have many more routes. Prices, harvests, costs and policy effects are simplified for gameplay.</p></section>
}
export function SharedBoard({ room, compact = false, revealStep = C.revealSteps }: { room: PublicRoom; compact?: boolean; revealStep?: number }) {
  const result = room.result, stage = C.revealStage
  const securityShown = !result || revealStep >= stage.security
  const householdsShown = !result || revealStep >= stage.households
  const security = result && !securityShown ? result.securityBefore : room.security
  const fed = result ? householdsShown ? result.cityDelivered : 0 : room.previewFed
  const need = result?.cityNeed ?? (['flood', 'marketClosure'].includes(room.event?.kind ?? '') ? room.rules.cityCrisisNeed : room.rules.cityNeed)
  return <section className={`shared-board ${compact ? 'compact-board' : ''}`}>
    {!result && <div className="projector-board"><aside className="board-event workspace"><p className="eyebrow">Round {room.round}/{C.rounds} · {room.step} · Policy {room.policy === 'none' ? 'None' : room.policy}</p><h2>{room.event?.label ?? 'Choose seats'}</h2><p className="channel-market">🏪 {money(room.event?.price ?? 0)}/unit · market takes {units(room.event?.capacity ?? 0)}</p>{room.event?.kind === 'warning' && <p className="forecast-card">Forecast: flood next round · {C.eventForecastAccuracy * C.quantityPrecision}% chance</p>}{room.event?.kind === 'flood' && <p className="shock-box">Transport is halved now. Next round’s harvest is halved.</p>}<PlanningTimer endsAt={room.planningEndsAt} />{room.paused && <p className="error">Paused by host</p>}</aside><section className="board-goals workspace"><h2>Keep the city fed</h2><Bar label="Households fed this round" value={fed} max={need} good={fed >= need} channel="hub" /><p>Food access for vulnerable households, schools and hospitals</p><Bar label="City Food Security" value={security} max={room.rules.cityMaxSecurity} danger={security <= room.rules.cityMaxSecurity * C.lowSecurityFraction} good={security === room.rules.cityMaxSecurity} channel="hub" /><h3>Shared resources</h3><Bar label="Mae Tha community reserve" value={room.reserve} max={room.rules.warehouseStartingUnits + (room.policy === 'C' ? room.rules.playerCount*C.policies.C.startingReserveBonusPerFarmer + (C.rounds-1)*C.policies.C.reserveGrowthPerRound : 0)} channel="warehouse" /><Bar label="Council budget" value={room.councilBudget} max={room.rules.councilStartingBudget} channel="contract" />{room.councilExplanation && <details className="council-explanation"><summary>Council coordination</summary><p>{room.councilExplanation}</p></details>}</section>{!compact && <aside className="board-players workspace"><h2>Farmers</h2>{room.farmers.map((farmer) => { const cash = farmer.cash; return <article key={farmer.id}><strong>{farmer.submitted ? '✓ ' : ''}{farmer.name}</strong>{!room.offline && <small>{farmer.connected ? 'Connected' : 'Disconnected'}</small>}<Bar label={`$${Number(cash.toFixed(2))} / $${farmer.goal} goal`} value={cash} max={farmer.goal} good={cash >= farmer.goal} channel="market" /></article> })}</aside>}</div>}
    {result && <section key={revealStep} className="workspace reveal-scene">
      {revealStep === stage.event && <><h2>{result.event.label}</h2><EventScene kind={result.event.kind} /><small className="pixel-label">Market: {result.event.price}/unit · {result.event.capacity} capacity</small></>}
      {revealStep === stage.market && <><h2>Market and company</h2><MarketFlow room={room} result={result} /><small className="pixel-label">{result.lines.map(l=>`${room.farmers.find(p=>p.id===l.playerId)?.name}: ${l.companyUnits ? `company ${num(l.companyUnits)}` : `sold ${num(l.marketUnits)}`}`).join(' · ')}</small></>}
      {revealStep === stage.contract && <><h2>Schools & hospital</h2><RouteScene amount={result.contractsDelivered} /><small className="pixel-label">Delivered {result.contractsDelivered} · disrupted {result.lines.reduce((s,l)=>s+l.contractShortfall,0)}</small></>}
      {revealStep === stage.warehouse && <><h2>Farm storage</h2><StorageFlow result={result} /><small className="pixel-label">Farm stock now {num(room.warehouseUnits)} · community reserve {num(room.reserve)}</small></>}
      {revealStep === stage.hub && <><h2>Community food hub/kitchen</h2><HubFlow result={result} /><small className="pixel-label">Delivered {num(result.hubDelivered)} · Council funding {money(result.councilSpent)}</small></>}
      {revealStep === stage.households && <><h2>Chiang Mai households</h2><CityScene result={result} /><small className="pixel-label">Delivered {result.cityDelivered}/{result.cityNeed} · unmet {result.shortfall}</small></>}
      {revealStep >= stage.security && <><h2>City food security</h2><SecurityScene result={result} max={room.rules.cityMaxSecurity} /><small className="pixel-label">{result.securityBefore} → {result.securityAfter} · unmet {result.shortfall}</small></>}
    </section>}
    {securityShown && ['debrief', 'gameOver'].includes(room.phase) && <><FinalResults room={room} />{room.comparison && <PolicyComparison comparison={room.comparison} />}</>}
  </section>
}
const num = (value: number) => Number(value.toFixed(2))
const sum = (result: Resolution, pick: (line: Resolution['lines'][number]) => number) => num(result.lines.reduce((s, l) => s + pick(l), 0))
// Reveal flows read the resolved quantities and payments; nothing here re-runs the economy.
function MarketFlow({ room, result }: { room: PublicRoom; result: Resolution }) {
  const closed = result.event.kind === 'marketClosure', role = (id: string) => room.farmers.find((p) => p.id === id)?.role
  const sold = sum(result, (l) => l.marketUnits), paid = sum(result, (l) => l.marketUnits * (result.event.price + (role(l.playerId) === 'maeTha' && result.event.price > 0 ? C.organicPricePremium : 0)))
  const company = sum(result, (l) => l.companyUnits), companyPaid = sum(result, (l) => l.companySold * C.companyPrice), companyRotten = sum(result, (l) => l.companyRotten)
  const farmSpoiled = num(sum(result, (l) => l.spoilage) - companyRotten)
  const lanes: Lane[] = [{ from: 'farmer', shirt: '#5cb85c', to: 'market', tag: closed ? 'Market closed' : `Sold ${sold} · +${money(paid)}`, units: sold, money: paid, blocked: closed, rotten: farmSpoiled, rottenAt: 'from' }]
  if (room.farmers.some((p) => p.role === 'contract')) lanes.push({ from: 'farmer', shirt: '#4aa3df', to: 'supermarket', tag: `Company collected ${company} · paid ${money(companyPaid)}`, units: company, money: companyPaid, rotten: companyRotten, rottenAt: 'to' })
  return <FlowScene lanes={lanes} label={lanes.map((lane) => `${lane.tag}${lane.rotten ? `, spoiled ${lane.rotten}` : ''}`).join('; ')} />
}
function StorageFlow({ result }: { result: Resolution }) {
  const stored = sum(result, (l) => l.stored), decay = sum(result, (l) => l.decay), fees = sum(result, (l) => l.storageCost)
  const tag = `Kept on farm ${stored}${fees ? ` · fees ${money(fees)}` : ''}`
  return <FlowScene lanes={[{ from: 'farmer', shirt: '#5cb85c', to: 'storehouse', near: true, tag, units: stored, rotten: decay, rottenAt: 'to' }]} label={tag} />
}
function HubFlow({ result }: { result: Resolution }) {
  const reserve = num(result.councilReserveReleased + sum(result, (l) => l.reserveReleased)), fromStorage = sum(result, (l) => l.warehouseReleased), shared = num(result.hubDelivered - reserve)
  const lanes: Lane[] = [{ from: 'farmer', shirt: '#5cb85c', to: 'storehouse', tag: `Farms → kitchen ${shared}${fromStorage ? ` (${fromStorage} stored)` : ''}`, units: shared, recipients: true }, { from: 'warehouse', to: 'storehouse', tag: `Community reserve → kitchen ${reserve}`, units: reserve, recipients: true }]
  return <FlowScene lanes={lanes} label={lanes.map((lane) => lane.tag).join('; ')} />
}
export function RoundReveal({ room, onComplete }: { room: PublicRoom; onComplete?: () => void }) {
  // Each reveal step waits for the host: Next moves on, Replay restarts the current animation.
  const [step, setStep] = useState(0), [replay, setReplay] = useState(0), complete = useRef(onComplete)
  complete.current = onComplete
  useEffect(() => { if (step >= C.revealSteps) complete.current?.() }, [step])
  const done = step >= C.revealSteps, last = step === C.revealSteps - 1
  return <TimeScale.Provider value={done ? 0 : 1}><div style={{ ['--t' as string]: done ? 0 : 1, ['--loop' as string]: done ? 'paused' : 'running' }}><div className="reveal-heading"><h2>Round {room.round}: reveal together</h2><div className="phone-actions">{done ? <button className="quiet" onClick={() => { setStep(0); setReplay(replay + 1) }}>Replay round</button> : <><button className="quiet" onClick={() => setReplay(replay + 1)}>Replay</button><button className="primary" onClick={() => setStep(step + 1)}>{last ? 'Finish reveal' : 'Next'}</button><button className="quiet" onClick={() => setStep(C.revealSteps)}>Skip</button></>}</div></div><div className="reveal-track">{['Event', 'Market', 'Contracts', 'Storage', 'Food hub', 'Households fed', 'Food security'].map((label, i) => <span key={label} className={i === Math.min(step, C.revealStage.security) ? 'shown' : ''}>{label}</span>)}</div><SharedBoard key={replay} room={room} revealStep={step} />{done && room.roundFact && <section className="workspace fact"><CardPanel card={room.roundFact} /></section>}</div></TimeScale.Provider>
}
