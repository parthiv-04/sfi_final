import { describe, expect, it } from 'vitest'
import { ROUND2_CONFIG as C } from './config'
import { personalGoalPassed, contractArrivals, allocateDecision, previewDecision, updateDecision, finishDecisions, advanceCouncil, advancePlanning, advanceRound, createGame as makeGame, currentEvent, finishPlanning, rankPlayers, resolveCurrentRound, transportCapacity, updateCouncilPlan, updatePlan, validatePlan, warehouseUnits } from './engine'
import type { EventKind, GameState, TurnPlan } from './types'
const createGame: typeof makeGame = (names,random,council) => makeGame(names,random,{...council,mixedRoles:false})
const names = ['A', 'B', 'C', 'D', 'E']
const seed = (value: number) => () => { value = (value + 0x6D2B79F5) >>> 0; let n = Math.imul(value ^ value >>> 15, value | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 2 ** 32 }
function game(kind: EventKind = 'normal') { const state = createGame(names, seed(1)); state.events[0] = { kind, ...C.events[kind] }; return advanceCouncil(state) }
const routes = (patch: Partial<TurnPlan> = {}): TurnPlan => ({ marketUnits: 0, hubUnits: 0, storeUnits: 0, warehouseRelease: 0, reserveRelease: 0, contractQuantity: 0, ...patch })
const setAll = (state: GameState, patch: Partial<TurnPlan>) => { for (const p of state.players) state.plans[p.id] = routes(patch); return state }

describe('simplified food distribution engine', () => {
  it.each(['normal', 'flood', 'marketClosure'] as EventKind[])('disrupts only crisis contracts in %s and counts failed consignments as waste', (kind) => {
    const state = game(kind)
    state.players[0].contracts = [{ quantity: 1, dueRound: 1 }]
    state.plans.p1 = routes({ hubUnits: kind === 'flood' ? 0.5 : 1 })
    const snapshot = structuredClone(state)
    const preview = previewDecision(state, 'p1', { card: 'share', promise: false })
    const result = finishPlanning(state)
    const arrived = kind === 'normal' ? 1 : 0.5
    expect(contractArrivals(state, state.players[0])).toBe(arrived)
    expect(result.resolution!.lines[0].contractUnits).toBe(arrived)
    expect(result.resolution!.lines[0].contractShortfall).toBe(1 - arrived)
    expect(result.resolution!.lines[0].spoilage).toBeGreaterThanOrEqual(1 - arrived)
    expect(preview.households).toBe(arrived + (kind === 'flood' ? 0.5 : 1))
    expect(preview.cashMin).toBe(arrived * C.contractPrice)
    expect(result.players[0].contracts).toEqual([])
    expect(state).toEqual(snapshot)
  })
  it('sets the goal eight dollars above starting cash and pays contracts below the normal market', () => {
    expect(createGame(names).players[0].goal).toBe(C.startingCash + 8)
    expect(C.contractPrice).toBe(3)
    expect(C.events.normal.price).toBe(4)
  })
  it('awards a personal win only when the city survives and the cash goal is reached', () => {
    const state = game()
    state.phase = 'debrief'
    state.players[0].cash = state.players[0].goal
    state.players[1].cash = state.players[1].goal - 1
    expect(personalGoalPassed(state, state.players[0])).toBe(true)
    expect(personalGoalPassed(state, state.players[1])).toBe(false)
    expect(rankPlayers(state)[0].won).toBe(true)
    state.phase = 'gameOver'
    expect(personalGoalPassed(state, state.players[0])).toBe(false)
    state.phase = 'debrief'; state.endedEarly = true
    expect(personalGoalPassed(state, state.players[0])).toBe(false)
  })
  it.each([3, 5, 8])('finishes a full seeded game with %i farmers and records every round', (n) => {
    let state = createGame(Array.from({ length: n }, (_, i) => `Farm ${i + 1}`), seed(1), { seat: 'automatic' })
    for (let round = 1; round <= C.rounds; round++) {
      state = advanceCouncil(state)
      for (const p of state.players) state = updateDecision(state, p.id, { card: 'share', promise: round < C.rounds })
      state = finishDecisions(state)
      expect(state.citySecurity).toBeGreaterThan(0)
      state = advanceRound(state)
    }
    expect(state.phase).toBe('debrief')
    expect(state.history).toHaveLength(C.rounds)
    expect(rankPlayers(state)).toHaveLength(n)
  })
  it('turns one-tap cards into allocations, rounding the shared half up', () => {
    const state = game()
    expect(allocateDecision(state, 'p1', { card: 'sell', promise: false }).marketUnits).toBe(2)
    expect(allocateDecision(state, 'p1', { card: 'share', promise: false })).toMatchObject({ hubUnits: 2, marketUnits: 0 })
    state.players[0].contracts = [{ quantity: 1, dueRound: 1 }]
    expect(allocateDecision(state, 'p1', { card: 'share', promise: true })).toMatchObject({ hubUnits: 1, marketUnits: 0, contractQuantity: 1 })
    expect(previewDecision(state, 'p1', { card: 'share', promise: true }).households).toBe(2)
    expect(allocateDecision(state, 'p1', { card: 'store', promise: false }).storeUnits).toBe(1)
  })
  it('shows Release only for stored food, preserves transport limits and lets zero-harvest farms decide', () => {
    const state = game('flood')
    expect(() => allocateDecision(state, 'p1', { card: 'release', promise: false })).toThrow('Choose')
    state.warehouse = [{ ownerId: 'p1', units: 3, depositedRound: 0 }]
    state.players[0].harvest = 0
    expect(allocateDecision(state, 'p1', { card: 'release', promise: true })).toMatchObject({ warehouseRelease: 1.5, marketUnits: 0, contractQuantity: 1 })
    expect(updateDecision(state, 'p2', { card: 'store', promise: true }).decisions.p2.promise).toBe(true)
  })
  it('applies the human Council after cards have been submitted, preserving their intent', () => {
    let state = game()
    for (const p of state.players) state = updateDecision(state, p.id, { card: 'store', promise: true })
    state = finishDecisions(state)
    expect(state.phase).toBe('council')
    state = advanceCouncil(updateCouncilPlan(state, { policy: 'procurement', quantity: 2, farmerId: 'p1' }))
    expect(state.resolution!.lines[0]).toMatchObject({ hubUnits: 2, stored: 0 })
    expect(state.resolution!.lines[1].stored).toBe(2)
    expect(state.players[0].contracts).toEqual([{ quantity: 1, dueRound: 2 }])
  })
  it('automatic Council cannot redirect a Sell choice into crisis hub deliveries', () => {
    let state = createGame(names, seed(1), { seat: 'automatic' })
    state = advanceCouncil(state)
    state.events[0] = { kind: 'marketClosure', ...C.events.marketClosure }
    state.reserve = 0
    state = finishDecisions(state)
    expect(state.resolution!.hubDelivered).toBe(0)
    expect(state.resolution!.shortfall).toBe(state.rules.cityCrisisNeed)
    expect(state.council.spent).toBe(0)
    expect(state.plans.p1.hubUnits).toBe(0)
  })
  it('automatic Council buys reserve first and funds crisis hub food with the remainder', () => {
    let state = createGame(['A', 'B', 'C'], seed(1), { seat: 'automatic' })
    state.events[0] = { kind: 'marketClosure', ...C.events.marketClosure }
    state = advanceCouncil(state)
    state.plans.p1 = routes({ hubUnits: 1 })
    state = finishPlanning(state)
    expect(state.resolution!.hubDelivered).toBe(5)
    expect(state.resolution!.councilReserveReleased).toBe(4)
    expect(state.council.budget).toBe(state.rules.councilStartingBudget - 4 * C.procurementPrice - C.hubPrice)
    expect(state.council.explanation).toContain('because')
  })
  it.each([
    [3, 5, 8.4, 4, 21], [5, 8, 14, 7, 35], [8, 12, 22.4, 10, 56],
  ])('scales the resources for %i farmers', (n, crisis, maximum, reserve, budget) => {
    const state = createGame(Array.from({ length: n }, (_, i) => `Farmer ${i + 1}`), seed(1))
    expect(state.rules).toMatchObject({ playerCount: n, cityNeed: n, cityCrisisNeed: crisis })
    expect(state.rules.cityMaxSecurity).toBeCloseTo(maximum)
    expect(state.citySecurity).toBeCloseTo(n * C.scaling.startingSecurity)
    expect(state.reserve).toBe(reserve)
    expect(state.council.budget).toBe(budget)
    for (const event of state.events) expect(event.capacity).toBe(Math.ceil(n * C.marketShares[event.kind]))
  })
  it('keeps the Council pre-position commitment available when hub food competes for its budget', () => {
    let state = createGame(names, seed(1))
    state.council.budget = 4
    state = advanceCouncil(updateCouncilPlan(state, { policy: 'prePosition', quantity: 4 }))
    state = setAll(state, { hubUnits: 1, storeUnits: 1 })
    const result = finishPlanning(state)
    expect(result.totalHubUnits).toBe(0)
    expect(result.resolution!.lines.reduce((sum, line) => sum + line.revenue, 0)).toBe(4)
    expect(result.council.budget).toBe(0)
  })
  it('starts with a harvest and a separate six-unit permanent reserve', () => { const state = createGame(names, seed(1)); expect(state.players.every((p) => p.harvest === C.harvestPerFarm)).toBe(true); expect(state.reserve).toBe(state.rules.warehouseStartingUnits); expect(state.warehouse).toEqual([]); expect(state.citySecurity).toBe(state.rules.cityStartingSecurity) })
  it('is pure and deterministic given an injected random function', () => { expect(createGame(names, seed(37))).toEqual(createGame(names, seed(37))); const state = game(); const before = structuredClone(state); finishPlanning(state); expect(state).toEqual(before) })
  it('reveals the event before planning and uses its market price and capacity', () => { const result = finishPlanning(game('festival')); expect(currentEvent(result).label).toBe(C.events.festival.label); expect(result.resolution!.lines.every((line) => line.marketUnits === C.harvestPerFarm && line.revenue === C.harvestPerFarm * C.events.festival.price)).toBe(true) })
  it('shares limited market demand exactly and preserves all food', () => { const result = finishPlanning(game()); expect(result.resolution!.lines.reduce((s, l) => s + l.marketUnits, 0)).toBe(C.events.normal.capacity); for (const line of result.resolution!.lines) expect(line.marketUnits + line.spoilage).toBe(line.harvest) })
  it('closes the market while leaving contracts and hub routes open', () => { const state = game('marketClosure'); state.players[0].contracts = [{ quantity: 1, dueRound: 1 }]; state.plans.p1 = routes({ hubUnits: 1 }); const result = finishPlanning(state); expect(result.resolution!.lines[0]).toMatchObject({ marketUnits: 0, contractUnits: 0.5, hubUnits: 1, revenue: C.contractPrice * 0.5 + C.hubPrice }) })
  it('caps pre-orders at one unit, delivers next round and pays the fixed price', () => { let state = game(); state = setAll(state, { hubUnits: 2, contractQuantity: 1 }); state = finishPlanning(state); expect(state.players[0].contracts).toEqual([{ quantity: 1, dueRound: 2 }]); state = advanceRound(state); state.events[1] = { kind: 'normal', ...C.events.normal }; state = advanceCouncil(state); const result = finishPlanning(state); expect(result.resolution!.lines.every((line) => line.contractUnits === 1 && line.revenue >= C.contractPrice)).toBe(true); expect(result.resolution!.contractsDelivered).toBe(5) })
  it('rejects over-contracting and contracts beyond the final round', () => { const state = game(); expect(() => validatePlan(state, 'p1', routes({ contractQuantity: 2 }))).toThrow('Contract limit'); state.round = C.rounds; expect(() => validatePlan(state, 'p1', routes({ contractQuantity: 1 }))).toThrow('no next round') })
  it('halves transport in a flood and only the next round harvest', () => { let state = game('flood'); expect(state.players[0].harvest).toBe(2); expect(transportCapacity(state)).toBe(1.5); expect(() => validatePlan(state, 'p1', routes({ hubUnits: 2 }))).toThrow('transport'); state = advanceRound(finishPlanning(state)); expect(state.players.every((p) => p.harvest === 1)).toBe(true); state.events[1] = { kind: 'normal', ...C.events.normal }; state = advanceRound(finishPlanning(setAll(advanceCouncil(state), { hubUnits: 1 }))); expect(state.players.every((p) => p.harvest === 2)).toBe(true) })
  it('preserves reserve without decay, cost or payout', () => { const result = finishPlanning(game()); expect(result.reserve).toBe(result.rules.warehouseStartingUnits); expect(result.resolution!.lines.every((line) => line.storageCost === 0 && line.decay === 0)).toBe(true) })
  it('charges owners for held stock, then rounds pooled decay down', () => { const state = setAll(game(), { storeUnits: 2 }); const result = finishPlanning(state); expect(warehouseUnits(result)).toBe(8); expect(result.resolution!.lines[0]).toMatchObject({ stored: 2, storageCost: 2, decay: 2, spoilage: 0 }); expect(result.players.every((p) => p.cash === C.startingCash - 2)).toBe(true); expect(result.totalWaste).toBe(2); expect(result.reserve).toBe(state.rules.warehouseStartingUnits) })
  it('releases only a farmer’s own deposited stock and pays actual funded units', () => { const state = game(); state.warehouse = [{ ownerId: 'p1', units: 2, depositedRound: 0 }]; state.council.budget = 2; state.plans.p1 = routes({ warehouseRelease: 2 }); expect(() => validatePlan(state, 'p2', routes({ warehouseRelease: 1 }))).toThrow('your stored'); const result = finishPlanning(state); expect(result.resolution!.lines[0]).toMatchObject({ warehouseReleased: 1, revenue: 2, storageCost: 1 }); expect(result.council.budget).toBe(0); expect(warehouseUnits(result)).toBe(1) })
  it('allows any farmer to move reserve, without cash payout or budget cost', () => { const state = game(); state.council.budget = 0; state.plans.p5 = routes({ reserveRelease: 2 }); const result = finishPlanning(state); expect(result.resolution!.lines[4]).toMatchObject({ reserveReleased: 2, hubUnits: 2, revenue: 0, transportUsed: 2 }); expect(result.reserve).toBe(state.reserve - 2) })
  it('Council reserve deliveries use spare farm transport and cannot move inaccessible stock', () => { let state = createGame(names, seed(1)); state.events[0] = { kind: 'normal', ...C.events.normal }; state = advanceCouncil(updateCouncilPlan(state, { reserveRelease: 2 })); const result = finishPlanning(state); expect(result.resolution!.councilReserveReleased).toBe(2); expect(result.reserve).toBe(state.reserve - 2); expect(result.resolution!.lines.every((line) => line.transportUsed <= line.transportCapacity)).toBe(true) })
  it('counts school/hospital contracts toward normal need, but needs the hub for extra crisis demand', () => { const state = game('marketClosure'); for (const p of state.players) { p.contracts = [{ quantity: 1, dueRound: 1 }]; state.plans[p.id] = routes() } const result = finishPlanning(state); expect(result.resolution).toMatchObject({ contractsDelivered: 2.5, hubDelivered: 0, cityNeed: 8, crisisHubNeed: 3, shortfall: 5.5 }); expect(result.citySecurity).toBe(state.citySecurity - 5.5); for (const p of state.players) state.plans[p.id].hubUnits = 1; expect(finishPlanning(state).citySecurity).toBe(state.citySecurity - 0.5) })
  it('recovers slowly when all need is met and caps at configured maximum', () => { const state = setAll(game(), { hubUnits: 1 }); state.citySecurity = 6; expect(finishPlanning(state).citySecurity).toBe(6 + C.cityRecovery); state.citySecurity = state.rules.cityMaxSecurity; expect(finishPlanning(state).citySecurity).toBe(state.rules.cityMaxSecurity) })
  it('loses one per unmet unit and ends immediately at zero', () => { const state = game(); state.citySecurity = 5; const result = finishPlanning(state); expect(result.citySecurity).toBe(0); expect(result.phase).toBe('gameOver'); expect(advanceRound(result)).toEqual(result); expect(finishPlanning(result)).toEqual(result); expect(rankPlayers(result)).toEqual([]) })
  it('caps hub delivery at the available Council budget without paying fractional overdrafts', () => { const state = setAll(game(), { hubUnits: 2 }); state.council.budget = 1; const result = finishPlanning(state); expect(result.totalHubUnits).toBe(0.5); expect(result.council.budget).toBe(0); expect(result.resolution!.lines[0].revenue).toBe(1) })
  it('pre-position pays only for actual deposits and offsets current storage cost', () => { let state = createGame(names, seed(1)); state = advanceCouncil(updateCouncilPlan(state, { policy: 'prePosition', quantity: 4 })); state = setAll(state, { storeUnits: 1 }); const result = finishPlanning(state); expect(result.resolution!.councilSpent).toBe(4); expect(result.players.slice(0, 4).every((p) => p.cash === C.startingCash)).toBe(true); expect(result.players[4].cash).toBe(C.startingCash - 1) })
  it('emergency buying feeds the hub, pays three per unit and reserves farmer food', () => { let state = createGame(names, seed(1)); state.events[0] = { kind: 'marketClosure', ...C.events.marketClosure }; state = advanceCouncil(updateCouncilPlan(state, { policy: 'procurement', quantity: 2, farmerId: 'p3' })); expect(() => validatePlan(state, 'p3', routes({ hubUnits: 1 }))).toThrow('harvest'); const result = finishPlanning(state); expect(result.resolution!.lines[2]).toMatchObject({ hubUnits: 2, revenue: 6 }); expect(result.council.budget).toBe(state.rules.councilStartingBudget - 6) })
  it('extra trucks increase farm capacity, are halved in a flood and cost six once', () => { let state = createGame(names, seed(1)); state.events[0] = { kind: 'flood', ...C.events.flood }; state = advanceCouncil(updateCouncilPlan(state, { policy: 'extraTrucks' })); expect(transportCapacity(state)).toBe(3.5); expect(finishPlanning(state).council.budget).toBe(state.rules.councilStartingBudget - C.extraTruckCost) })
  it('validates Council policy limits and affordability', () => { const state = createGame(names, seed(1)); expect(() => advanceCouncil(updateCouncilPlan(state, { quantity: 5 }))).toThrow('limit'); state.council.budget = 5; expect(() => advanceCouncil(updateCouncilPlan(state, { policy: 'extraTrucks' }))).toThrow('afford') })
  it('allows simultaneous drafts in any order and rejects duplicate pass-and-play submissions', () => { let state = game(); state = advancePlanning(updatePlan(state, 'p5', { contractQuantity: 1 }), 'p5'); expect(state.phase).toBe('planning'); expect(state.ready).toEqual(['p5']); expect(advancePlanning(state, 'p5')).toEqual(state); state = finishPlanning(state); expect(state.resolution).not.toBeNull() })
  it('validates transport, harvest, finite numbers and reserve over-allocation', () => { let state = game(); for (const patch of [{ hubUnits: -1 }, { hubUnits: NaN }, { hubUnits: 0.005 }, { hubUnits: 3 }, { reserveRelease: 4 }]) expect(() => validatePlan(state, 'p1', routes(patch))).toThrow(); state = advancePlanning(updatePlan(state, 'p1', routes({ reserveRelease: 3 })), 'p1'); state = advancePlanning(updatePlan(state, 'p2', routes({ reserveRelease: 3 })), 'p2'); expect(() => validatePlan(state, 'p3', routes({ reserveRelease: state.reserve - 5 }))).toThrow('allocated') })
  it('keeps warnings correct given seeded rolls, including false warnings', () => { let hits = 0, warnings = 0; for (let s = 1; s <= 1000; s++) { const state = createGame(names, seed(s)); for (let i = 0; i < C.rounds - 1; i++) if (state.events[i].kind === 'warning') { warnings++; if (state.events[i].forecastHits) hits++; expect(state.events[i + 1].kind === 'flood').toBe(state.events[i].forecastHits) } } expect(hits / warnings).toBeGreaterThan(0.55); expect(hits / warnings).toBeLessThan(0.65) })
  it('ranks only surviving games by cash, sharing tied ranks', () => { const state = game(); state.phase = 'debrief'; state.players[0].cash = 40; state.players[1].cash = 40; state.players[2].cash = 30; expect(rankPlayers(state).map((p) => p.rank)).toEqual([1, 1, 3, 4, 4]); expect(rankPlayers(state)[0].cash).toBe(40) })
  it('configures a sixty-second window and two-second reveal steps', () => { expect(C.planningSeconds).toBe(60); expect(C.revealStepMs).toBe(2 * C.millisecondsPerSecond); expect(C.revealSteps).toBe(Object.keys(C.revealStage).length) })
})
