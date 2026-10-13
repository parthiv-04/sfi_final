import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { applyAction, newRoom, projectRoom } from './hostModel'
import { PhoneFarm } from './PhoneControls'
import { signed, YourChoice } from './SharedBoard'
import type { ActionType, RoomModel } from './protocol'

let id = 0
const run = (m: RoomModel, uid: string, type: ActionType, payload: unknown = {}) => applyAction(m, uid, { id: `a${++id}`, actorUid: uid, revision: m.revision, round: m.game?.round, seatRevision: m.seatRevisions[uid] ?? 0, type, payload }, () => 0.3, 1000).model
function planning() {
  let m: RoomModel = { ...newRoom('TEST', 'host', 'automatic', 3), skipPest: true }
  for (let i = 1; i <= 3; i++) { m = run(m, `u${i}`, 'join', { name: `P${i}` }); m = run(m, `u${i}`, 'claimSeat', { seatId: `p${i}` }); m = run(m, `u${i}`, 'chooseRole', { role: i === 3 ? 'contract' : 'maeTha' }) }
  m = run(m, 'host', 'start')
  while (m.learning.kind) m = run(m, 'host', 'learningSkip', { ...m.learning })
  return m
}

it('shows exact You get / City gets / Catch lines and a Why? button on every card, with no ranges', () => {
  vi.stubGlobal('sessionStorage', { getItem: () => 'seen', setItem: () => {} })
  const m = planning(), p = projectRoom(m, undefined, 1000)
  for (const uid of ['u1', 'u3']) {
    const view = p.privateViews[uid]
    const html = renderToStaticMarkup(<PhoneFarm view={view} room={p.publicRoom} disabled={false} onSave={() => {}} />)
    const cards = Object.keys(view.options).length
    expect(cards).toBeGreaterThan(0)
    for (const label of ['You get', 'City gets', 'Catch']) expect(html.split(`<dt>${label}</dt>`).length - 1).toBe(cards + (uid === 'u1' ? 1 : 0))
    expect(html.split('<summary>Why?</summary>').length - 1).toBe(cards + (uid === 'u1' ? 1 : 0))
    expect(html).not.toMatch(/\$[\d.]+\s*[–-]\s*\$|\babout\b|\bmay\b/i)
  }
})

it('tells each farmer what they chose, earned and fed after the reveal', () => {
  let m = planning()
  m = run(m, 'u1', 'plan', { choice: { card: 'share', promise: true } })
  m = run(m, 'u2', 'plan', { choice: { card: 'sell', promise: false } })
  m = run(m, 'u3', 'plan', { choice: { card: 'sell', promise: false } })
  const p = projectRoom(m, undefined, 1000), line = p.publicRoom.result!.lines.find((l) => l.playerId === 'p1')!
  const html = renderToStaticMarkup(<YourChoice room={p.publicRoom} view={p.privateViews.u1} />)
  const earned = Math.round((line.revenue - line.storageCost - line.certificateCost) * 100) / 100
  expect(html).toContain('Share + promise')
  expect(html).toContain(`earned ${signed(earned)}`)
  expect(html).toContain(`fed ${Math.round((line.contractUnits + line.hubUnits) * 100) / 100} household`)
})

it('tells Mae Tha members the organic trap story in round 1 only, and tracks its costs', async () => {
  const { ROUND2_CONFIG: C } = await import('../round2/config')
  vi.stubGlobal('sessionStorage', { getItem: (k: string) => k.endsWith('-organic') ? null : 'seen', setItem: () => {} })
  let m = planning()
  const p = projectRoom(m, undefined, 1000)
  const organic = renderToStaticMarkup(<PhoneFarm view={p.privateViews.u1} room={p.publicRoom} disabled={false} onSave={() => {}} />)
  expect(organic).toContain('Your soil needs time to recover from chemicals. Half harvest this year.')
  expect(organic).toContain('The organic trap · 1/3')
  const company = renderToStaticMarkup(<PhoneFarm view={p.privateViews.u3} room={p.publicRoom} disabled={false} onSave={() => {}} />)
  expect(company).not.toContain('organic trap')
  expect(p.privateViews.u1.player!.soilLost).toBe(C.harvestPerFarm * (1 - C.soilRecoveryFraction))
  for (const uid of ['u1', 'u2', 'u3']) m = run(m, uid, 'plan', { choice: { card: 'sell', promise: false } })
  expect(projectRoom(m, undefined, 1000).privateViews.u1.player!.certificatePaid).toBe(C.organicCertificateCost)
  expect(projectRoom(m, undefined, 1000).privateViews.u3.player!.certificatePaid).toBe(0)
})

it('compares contract farmers and Mae Tha members side by side at the end', async () => {
  const { RoleComparison } = await import('./SharedBoard')
  const farmers = [
    { id: 'p1', name: 'A', role: 'contract' as const, cash: 80, goal: 104, submitted: true, connected: true, debt: 10, waste: 4, fed: 0 },
    { id: 'p2', name: 'B', role: 'maeTha' as const, cash: 90, goal: 104, submitted: true, connected: true, debt: 0, waste: 2, fed: 12 },
    { id: 'p3', name: 'C', role: 'maeTha' as const, cash: 100, goal: 104, submitted: true, connected: true, debt: 0, waste: 4, fed: 8 },
  ]
  const html = renderToStaticMarkup(<RoleComparison farmers={farmers} />)
  for (const text of ['Company contract (1)', 'Mae Tha organic (2)', '$80', '$95', '10 crates', '3 crates', '<td>10</td>', 'Organic pays off later. Contract farming pays now but locks you in debt.']) expect(html).toContain(text)
})
