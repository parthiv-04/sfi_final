import { describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { applyAction, newRoom as makeRoom, projectRoom } from './hostModel'
const newRoom: typeof makeRoom = (...args) => ({ ...makeRoom(...args), skipPest: true })
import { HostController, roomCode } from './controller'
import { ROUND2_CONFIG as C } from '../round2/config'
import { baseEvents } from '../round2/engine'
import { DEBRIEF_QUESTIONS } from '../learning'
import type { ActionType, ClientAction, Publication, RealtimeService, RoomModel } from './protocol'
let serial = 0
const packet = (m: RoomModel, uid: string, type: ActionType, payload: unknown = {}): ClientAction => ({ id: `a${++serial}`, actorUid: uid, revision: m.revision, round: m.game?.round, seatRevision: m.seatRevisions[uid] ?? 0, type, payload })
const run = (m: RoomModel, uid: string, type: ActionType, payload: unknown = {}, now = 1000) => applyAction(m, uid, packet(m, uid, type, payload), () => 0, now)
const sell = { card: 'sell', promise: false }
// The last farm seat is the company contract farmer; everyone else is Mae Tha.
function lobby(n = 5, mode: RoomModel['councilMode'] = 'automatic') { let m = newRoom('TEST', 'host', mode, n); for (let i = 1; i <= n + (mode === 'player' ? 1 : 0); i++) { const uid = `u${i}`; m = run(m, uid, 'join', { name: `Person ${i}` }).model; m = run(m, uid, 'claimSeat', { seatId: i > n ? 'council' : `p${i}` }).model; if (i <= n) m = run(m, uid, 'chooseRole', { role: i === n ? 'contract' : 'maeTha' }).model } return m }
function planning(n = 5, mode: RoomModel['councilMode'] = 'automatic') { let m = run(lobby(n, mode), 'host', 'start').model; while (m.learning.kind) m = run(m, 'host', 'learningSkip', { ...m.learning }).model; return m }
function mockService() { const publications: Publication[] = []; let listener: ((uid: string, a: ClientAction) => void) | null = null; const service: RealtimeService = { uid: 'host', clientId: 'tab', createRoom: vi.fn(async () => {}), resumeHost: vi.fn(async () => lobby()), publish: vi.fn(async (_code, p) => { publications.push(structuredClone(p)) }), watchActions: vi.fn((_code, callback) => { listener = callback; return () => { listener = null } }), watchPublic: vi.fn(() => () => {}), watchPrivate: vi.fn(() => () => {}), watchPresence: vi.fn(() => () => {}), watchConnection: vi.fn(() => () => {}), watchReceipts: vi.fn(() => () => {}), sendAction: vi.fn(async () => {}), startHostPresence: vi.fn(async () => () => {}) }; return { service, publications, emit: (uid: string, action: ClientAction) => listener?.(uid, action) } }
describe('host authority, room flow and learning sequence', () => {
  it('synchronizes discussion questions and accepts simultaneous anonymous reflections', () => {
    let model = planning(3)
    model = run(model, 'host', 'end').model
    model = run(model, 'host', 'question', { index: 0 }).model
    expect(projectRoom(model).publicRoom.discussionIndex).toBe(0)
    expect(run(model, 'u1', 'question', { index: 1 }).receipt.accepted).toBe(false)
    expect(run(model, 'u1', 'reflection', { answer: 'Prepare food early' }).receipt.accepted).toBe(false)
    model = run(model, 'host', 'question', { index: DEBRIEF_QUESTIONS.length }).model
    const initial = structuredClone(model)
    for (const n of [1, 2, 3]) {
      const action = packet(initial, `u${n}`, 'reflection', { answer: `Learning ${n}` })
      const result = applyAction(model, `u${n}`, action)
      expect(result.receipt.accepted).toBe(true)
      model = result.model
    }
    const publication = projectRoom(model)
    expect(publication.publicRoom.wordWall).toEqual(['Learning 1', 'Learning 2', 'Learning 3'])
    expect(JSON.stringify(publication.publicRoom.wordWall)).not.toContain('u1')
    expect(publication.privateViews.u2.reflection).toBe('Learning 2')
  })
  it('replays exactly the same events while resetting farms, goals, stock and answers', () => {
    let model = planning(3)
    const events = baseEvents(model.game!.events)
    model.game!.players[0].cash = 99
    model.reflections.u1 = 'Old answer'
    model = run(model, 'host', 'end').model
    model = run(model, 'host', 'replay', { sameEvents: true }).model
    expect(model.game!.events).toEqual(events)
    expect(model.game!.players[0].cash).toBe(C.startingCash)
    expect(model.game!.reserve).toBe(model.game!.rules.warehouseStartingUnits)
    expect(model.reflections).toEqual({})
    expect(model.runId).toBe(1)
    expect(model.learning.kind).toBe('howto')
  })
  it('makes four-letter codes and keeps the host outside all playing seats', () => { expect(roomCode(() => 0)).toBe('AAAA'); const m = lobby(); expect(m.participants.host).toBeUndefined(); expect(run(m, 'host', 'join', { name: 'Host' }).receipt.accepted).toBe(false); expect(run(newRoom('TEST', 'host', 'player'), 'host', 'start').receipt.accepted).toBe(false) })
  it('starts a chosen or smaller joined group and scales to the actual count', () => { let m = newRoom('TEST', 'host', 'automatic', 8); for (const i of [1, 4, 8]) { m = run(m, `u${i}`, 'join', { name: `Farmer ${i}` }).model; m = run(m, `u${i}`, 'claimSeat', { seatId: `p${i}` }).model; m = run(m, `u${i}`, 'chooseRole', { role: i === 1 ? 'contract' : 'maeTha' }).model } expect(run(m, 'host', 'start').receipt.accepted).toBe(false); const result = run(m, 'host', 'start', { farmerCount: 3 }); expect(result.receipt.accepted).toBe(true); expect(result.model.game!.rules.playerCount).toBe(3); expect(result.model.participants.u8.seatId).toBe('p3') })
  it('lets farmers pick roles in the lobby and requires one of each to start', () => {
    let m = newRoom('TEST', 'host', 'automatic', 3)
    for (const i of [1, 2, 3]) { m = run(m, `u${i}`, 'join', { name: `Farmer ${i}` }).model }
    expect(run(m, 'u1', 'chooseRole', { role: 'contract' }).receipt.accepted).toBe(false)
    for (const i of [1, 2, 3]) { m = run(m, `u${i}`, 'claimSeat', { seatId: `p${i}` }).model }
    expect(run(m, 'u1', 'chooseRole', { role: 'boss' }).receipt.accepted).toBe(false)
    expect(run(m, 'host', 'start').receipt.message).toMatch(/role/)
    for (const i of [1, 2, 3]) { m = run(m, `u${i}`, 'chooseRole', { role: 'maeTha' }).model }
    expect(projectRoom(m).publicRoom.seats.map((seat) => seat.role)).toEqual(['maeTha', 'maeTha', 'maeTha'])
    expect(run(m, 'host', 'start').receipt.accepted).toBe(false)
    m = run(m, 'u2', 'chooseRole', { role: 'contract' }).model
    const started = run(m, 'host', 'start')
    expect(started.receipt.accepted).toBe(true)
    expect(started.model.game!.players.map((p) => p.role)).toEqual(['maeTha', 'contract', 'maeTha'])
    expect(run(started.model, 'u1', 'chooseRole', { role: 'contract' }).receipt.accepted).toBe(false)
    const replay = run(run(started.model, 'host', 'end').model, 'host', 'replay', { sameEvents: false }).model
    expect(replay.game!.players.map((p) => p.role)).toEqual(['maeTha', 'contract', 'maeTha'])
  })
  it('requires a separate Council phone only in player mode', () => { const m = newRoom('TEST', 'host', 'automatic', 3); expect(projectRoom(m).publicRoom.seats).toHaveLength(3); expect(projectRoom(newRoom('TEST', 'host', 'player', 3)).publicRoom.seats).toHaveLength(4); expect(run(lobby(3, 'player'), 'host', 'start').receipt.accepted).toBe(true) })
  it('starts the guided scenario and accepts a contract contribution through the host action schema', () => {
    let m = run(lobby(3), 'host', 'start', { guided: true }).model
    expect(m.game!.events.slice(0, 5).map((e) => e.kind)).toEqual(['normal', 'festival', 'warning', 'flood', 'marketClosure'])
    while (m.learning.kind) m = run(m, 'host', 'learningNext', { ...m.learning }).model
    const uid = Object.values(m.participants).find((p) => p.role === 'contract')!.uid
    expect(run(m, uid, 'plan', { choice: { card: 'sell', promise: false, supportCouncil: 'yes' } }).receipt.accepted).toBe(false)
    const accepted = run(m, uid, 'plan', { choice: { card: 'sell', promise: false, supportCouncil: true } })
    expect(accepted.receipt.accepted).toBe(true)
    expect(projectRoom(accepted.model).privateViews[uid].choice!.supportCouncil).toBe(true)
  })
  it('shows only how-to and the current event before planning when Grow is disabled', () => {
    let m = run(lobby(), 'host', 'start').model
    expect(m.learning.kind).toBe('howto'); expect(m.planningEndsAt).toBeNull()
    m = run(m, 'host', 'learningNext', { ...m.learning }).model
    expect(m.learning.kind).toBe('event'); expect(m.planningEndsAt).toBeNull()
    m = run(m, 'host', 'learningNext', { ...m.learning }).model
    expect(m.learning.kind).toBeNull()
    expect(m.planningEndsAt).toBe(1000 + C.planningSeconds * C.millisecondsPerSecond)
    expect(projectRoom(m).publicRoom.step).toBe('Decide')
  })
  it('opens Grow directly after the event, without another introduction card', () => {
    let m = run({ ...lobby(), skipPest: false }, 'host', 'start').model
    m = run(m, 'host', 'learningNext', { ...m.learning }).model
    m = run(m, 'host', 'learningNext', { ...m.learning }).model
    expect(m.learning).toEqual({ kind: 'grow', index: 1 })
    expect(m.planningEndsAt).toBeNull()
    expect(m.pestEndsAt).toBe(1000 + C.minigame.durationSec * C.millisecondsPerSecond)
  })
  it('accepts simultaneous card submissions from the same board and decides Council afterward', () => { let m = planning(3, 'player'); const initial = structuredClone(m); const actions = [3, 1, 2].map((i) => packet(initial, `u${i}`, 'plan', { choice: { card: initial.game!.players[i-1].role === 'contract' ? 'sell' : 'share', promise: initial.game!.players[i-1].role !== 'contract' } })); for (const a of actions) { const result = applyAction(m, a.actorUid, a, () => 0, 1001); expect(result.receipt.accepted).toBe(true); m = result.model } expect(m.game!.phase).toBe('council'); expect(m.game!.resolution).toBeNull(); expect(projectRoom(m).privateViews.u4.canCouncil).toBe(true); m = run(m, 'u4', 'council', { plan: m.game!.council.plan }).model; expect(m.game!.resolution).not.toBeNull() })
  it('publishes aggregate submitted households without exposing individual choices', () => { let m = planning(); m = run(m, 'u1', 'plan', { choice: { card: 'share', promise: false } }).model; const projection = projectRoom(m); expect(projection.publicRoom.previewFed).toBe(C.harvestPerFarm * C.soilRecoveryFraction); expect(JSON.stringify(projection.publicRoom)).not.toContain('"card":"share"'); expect(projection.privateViews.u1.choice!.card).toBe('share'); expect(projection.privateViews.u2.choice!.card).toBe('sell') })
  it('handles deadline defaults, rejects late submissions and prevents duplicate application', () => { const m = planning(); const a = packet(m, 'u1', 'plan', { choice: sell }); const first = applyAction(m, 'u1', a, () => 0, 1001); expect(applyAction(first.model, 'u1', a).model.revision).toBe(first.model.revision); expect(run(m, 'u2', 'plan', { choice: sell }, m.planningEndsAt!).receipt.accepted).toBe(false); expect(run(m, 'host', 'resolve', {}, m.planningEndsAt!).model.game!.resolution).not.toBeNull() })
  it('validates identities, decision schema and revision without changing gameplay', () => { const m = planning(); const a = packet(m, 'u1', 'plan', { choice: sell }); expect(applyAction(m, 'u2', a).receipt.accepted).toBe(false); for (const choice of [{ card: 'cheat', promise: false }, { card: 'sell', promise: 'yes' }, { card: 'sell', promise: false, cash: 999 }]) { const result = run(m, 'u1', 'plan', { choice }); expect(result.receipt.accepted).toBe(false); expect(result.model.game).toEqual(m.game) } })
  it('preserves reconnect seats, and restricts late joiners to spectators', () => { const m = planning(); expect(run(m, 'u1', 'join', { name: 'Again' }).model.participants.u1.seatId).toBe('p1'); const late = run(m, 'late', 'join', { name: 'Observer' }).model; expect(late.participants.late.spectator).toBe(true); expect(run(late, 'late', 'claimSeat', { seatId: 'p1' }).receipt.accepted).toBe(false) })
  it('freezes a paused timer and permits only disconnected player replacement', () => { let m = planning(); m = run(m, 'host', 'pause', {}, 2000).model; expect(m.planningEndsAt).toBeNull(); expect(run(m, 'u1', 'plan', { choice: sell }).receipt.accepted).toBe(false); m = run(m, 'host', 'resume', {}, 9000).model; expect(m.planningEndsAt).toBe(9000 + m.remainingMs); m = run(m, 'new', 'join', { name: 'Replacement' }, 10000).model; expect(run(m, 'host', 'replace', { uid: 'u1', replacementUid: 'new' }, 10001).receipt.accepted).toBe(false); m = run(m, 'host', 'replace', { uid: 'u1', replacementUid: 'new' }, 30000).model; expect(m.participants.new.seatId).toBe('p1'); expect(m.game!.players[0].name).toBe('Replacement'); expect(run(m, 'host', 'skipTimer', {}, 30001).model.game!.resolution).not.toBeNull() })
})
describe('controller transport', () => {
  it('keeps host controls valid when a phone heartbeat is queued first', async () => {
    const model = planning(3), { service } = mockService()
    const controller = new HostController(service, model, () => {}, () => {}, () => 0, () => 1001)
    const heartbeat = controller.dispatch('u1', packet(model, 'u1', 'heartbeat'))
    const pause = controller.hostAction('pause')
    await Promise.all([heartbeat, pause])
    expect(controller.model.paused).toBe(true)
    expect(controller.model.participants.u1.lastSeen).toBe(1001)
    expect(service.publish).toHaveBeenCalledTimes(2)
  })
  it('serializes concurrent submissions with atomic expected revisions', async () => { const mock = mockService(), m = planning(); const c = new HostController(mock.service, m, vi.fn(), vi.fn(), () => 0, () => 1001); await Promise.all([1, 2].map((i) => c.dispatch(`u${i}`, packet(m, `u${i}`, 'plan', { choice: sell })))); expect(c.model.savedSeats).toHaveLength(2); expect(mock.publications.map((p) => p.expectedRevision)).toEqual([m.revision, m.revision + 1]) })
  it('does not advance on a failed publication and retries safely', async () => { const mock = mockService(), m = planning(); const c = new HostController(mock.service, m, vi.fn(), vi.fn(), () => 0, () => 1001), a = packet(m, 'u1', 'plan', { choice: sell }); vi.mocked(mock.service.publish).mockRejectedValueOnce(new Error('Offline')); await expect(c.dispatch('u1', a)).rejects.toThrow('Offline'); expect(c.model).toEqual(m); await c.dispatch('u1', a); expect(c.model.savedSeats).toEqual(['p1']) })
  it('keeps phone dependencies free of runtime engine imports', () => { for (const file of ['PlayerView.tsx', 'PhoneControls.tsx', 'SharedBoard.tsx', 'LearningUI.tsx', 'firebase.ts', 'protocol.ts']) { const source = readFileSync(new URL(file, import.meta.url), 'utf8'); expect(source).not.toMatch(/from\s+['"].*\/engine['"]/); expect(source).not.toMatch(/from\s+['"].*hostModel['"]/); } })
})

describe('shared learning cards', () => {
  it('waits for every connected player before advancing, while the host can advance for everyone', () => {
    let m = run(lobby(3), 'host', 'start').model
    const card = { ...m.learning }
    const first = run(m, 'u1', 'learningSkip', card)
    expect(first.receipt.accepted).toBe(true)
    expect(first.receipt.message).toMatch(/Waiting for 2 more players/)
    expect(first.model.learning).toEqual(card)
    expect(projectRoom(first.model, undefined, 1000).publicRoom.learningReady).toEqual(['u1'])
    m = run(first.model, 'u2', 'learningNext', card).model
    expect(m.learning).toEqual(card)
    m = run(m, 'u3', 'learningNext', card).model
    expect(m.learning).not.toEqual(card)
    expect(m.learningReady).toEqual({})
    const before = { ...m.learning }
    expect(run(m, 'host', 'learningNext', before).model.learning).not.toEqual(before)
  })
})
