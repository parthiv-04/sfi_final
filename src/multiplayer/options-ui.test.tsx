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
