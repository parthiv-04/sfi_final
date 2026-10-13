import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { applyAction, newRoom } from './multiplayer/hostModel'
import { baseEvents, policyMetrics } from './round2/engine'
import { recordSnapshot, rewindTo, type Snapshots } from './rewind'
import { RewindComparison } from './ui/RewindComparison'
import type { ActionType, RoomModel } from './multiplayer/protocol'

let serial = 0
const act = (m: RoomModel, uid: string, type: ActionType, payload: unknown = {}) => { const r = applyAction(m, uid, { id: String(++serial), actorUid: uid, revision: m.revision, round: m.game?.round, seatRevision: m.seatRevisions[uid] ?? 0, type, payload }, () => 0.4, 1000); expect(r.receipt.accepted, r.receipt.message).toBe(true); return r.model }
function play(m: RoomModel, saved: Snapshots, card: (round: number) => 'sell' | 'share') {
  saved = recordSnapshot(saved, m)
  while (!['debrief', 'gameOver'].includes(m.game!.phase)) {
    while (m.learning.kind) m = act(m, 'host', 'learningSkip', { ...m.learning })
    m = act(m, 'u1', 'plan', { choice: { card: card(m.game!.round), promise: false } })
    if (m.game!.phase === 'resolution') { m = act(m, 'host', 'nextRound'); saved = recordSnapshot(saved, m) }
  }
  return { m, saved }
}

it('rewinds a single-screen game to a round start with the same events, lets players choose again, and compares both runs', () => {
  let m = newRoom('SOLO', 'host', 'automatic', 1, true); m.offline = true; m.skipPest = true; m.runId = 7
  m = act(m, 'u1', 'join', { name: 'Solo' }); m = act(m, 'u1', 'claimSeat', { seatId: 'p1' }); m = act(m, 'host', 'start', { roles: ['maeTha'] })
  const first = play(m, {}, () => 'sell')
  expect(Object.keys(first.saved).map(Number)).toEqual(first.m.game!.history.map((r) => r.round))
  const back = rewindTo(first.saved, 2)
  expect(back.model.game!.round).toBe(2)
  expect(back.model.game!.history).toHaveLength(1)
  // Same deck; loop price rises are recomputed by the new run.
  expect(baseEvents(back.model.game!.events)).toEqual(baseEvents(first.m.game!.events))
  expect(Object.keys(back.saved)).toEqual(['1', '2'])
  const second = play(back.model, back.saved, () => 'share')
  expect(second.m.game!.history[0]).toEqual(first.m.game!.history[0])
  expect(second.m.game!.history.slice(1).map((r) => r.hubDelivered)).not.toEqual(first.m.game!.history.slice(1).map((r) => r.hubDelivered))
  const summary = (g: RoomModel) => ({ metrics: policyMetrics(g.game!), fed: g.game!.history.reduce((s, r) => s + r.cityDelivered, 0), rounds: g.game!.history.length, roles: g.game!.players.map((p) => p.role) })
  const html = renderToStaticMarkup(<RewindComparison before={summary(first.m)} after={summary(second.m)} from={2} />)
  expect(html).toContain('Rewound to round 2')
  expect(html).toContain(`<td>${summary(first.m).fed}</td><td>${summary(second.m).fed}</td>`)
})

it('starts a fresh snapshot set for a new run', () => {
  const a = { game: { round: 1 }, runId: 1 } as RoomModel, b = { game: { round: 1 }, runId: 2 } as RoomModel
  const saved = recordSnapshot(recordSnapshot({}, a), { ...a, game: { round: 2 } } as RoomModel)
  expect(Object.keys(recordSnapshot(saved, b))).toEqual(['1'])
  expect(recordSnapshot(saved, b)[1].runId).toBe(2)
})

it('hides role rows for roles nobody played', () => {
  const run = { metrics: { shortageRounds: 1, finalSecurity: 50, contractCash: 0, contractDebt: 0, maeThaProfit: 4, waste: 2 }, fed: 9, rounds: 5, roles: ['maeTha' as const] }
  const html = renderToStaticMarkup(<RewindComparison before={run} after={run} from={1} />)
  expect(html).not.toContain('company-farmer cash')
  expect(html).toContain('Mae Tha profit')
})
