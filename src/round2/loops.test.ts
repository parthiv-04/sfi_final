import { describe, expect, it } from 'vitest'
import { ROUND2_CONFIG as C } from './config'
import { walkOffs, advanceCouncil, advanceRound, baseEvents, createGame, currentEvent, finishDecisions, marketPrice, replayUnderNone, updateDecision } from './engine'
import { makeRng } from './rng'
import type { EventKind, GameState } from './types'

const roles = ['contract', 'maeTha', 'maeTha', 'maeTha', 'maeTha'] as const
function game(kinds: EventKind[]) {
  const state = createGame(roles.map((_, i) => `F${i + 1}`), makeRng(5), { seat: 'automatic', roles: [...roles] })
  kinds.forEach((kind, i) => { state.events[i] = { kind, ...C.events[kind], capacity: Math.ceil(roles.length * C.marketShares[kind]) } })
  return advanceCouncil(state)
}
const choose = (state: GameState, card: 'sell' | 'share' | 'store' | 'release', count = state.players.length) => {
  let next = state
  for (const p of next.players.filter((p) => p.role === 'maeTha').slice(0, count)) next = updateDecision(next, p.id, { card, promise: false })
  return next
}

describe('feedback loops', () => {
  it('low city security raises next round’s market price by $1 and loses exact buyers', () => {
    let state = game(['normal', 'normal'])
    state.citySecurity = state.rules.cityMaxSecurity * C.loops.lowSecurityFraction; state.reserve = 0 // already low; a sell-only round with no reserve keeps it low
    state = finishDecisions(state)
    expect(state.resolution!.securityAfter).toBeLessThan(state.rules.cityMaxSecurity * C.loops.lowSecurityFraction)
    expect(state.resolution!.loops.lowSecurityNext).toBe(true)
    const next = advanceCouncil(advanceRound(state)), event = currentEvent(next)
    expect(event.price).toBe(C.events.normal.price + C.loops.lowSecurityPriceRise)
    expect(event.surcharge).toBe(C.loops.lowSecurityPriceRise)
    expect(walkOffs(next)).toBe(Math.round(roles.length * C.shoppers.walkOffsPerDollarPerFarmer * C.loops.lowSecurityPriceRise))
    expect(marketPrice(next, next.players[1])).toBe(C.events.normal.price + C.loops.lowSecurityPriceRise + C.organicPricePremium)
  })
  it('does not raise prices when security stays healthy, or for a closed market', () => {
    const healthy = advanceRound(finishDecisions(choose(game(['normal', 'normal']), 'share')))
    expect(healthy.history[0].loops.lowSecurityNext).toBe(false)
    expect(currentEvent(healthy).price).toBe(C.events.normal.price)
    let low = game(['normal', 'marketClosure']); low.citySecurity = 0.5; low = advanceRound(finishDecisions(low))
    expect(currentEvent(low).price).toBe(0)
  })
  it('sharing by at least half the farms in a crisis adds $1 per farmer to next round’s Council budget', () => {
    const shared = finishDecisions(choose(game(['flood', 'normal']), 'share', Math.ceil(roles.length * C.loops.crisisShareFraction)))
    expect(shared.resolution!.loops.trustBudgetNext).toBe(roles.length * C.loops.trustBudgetPerFarmer)
    expect(advanceRound(shared).council.budget).toBe(shared.council.budget + roles.length * C.loops.trustBudgetPerFarmer)
    const few = finishDecisions(choose(game(['flood', 'normal']), 'share', 1))
    expect(few.resolution!.loops.trustBudgetNext).toBe(0)
    const calm = finishDecisions(choose(game(['normal', 'normal']), 'share'))
    expect(calm.resolution!.loops.trustBudgetNext).toBe(0)
  })
  it('flags a flood that followed a warning round with no storing', () => {
    let unprepared = finishDecisions(choose(game(['warning', 'flood']), 'sell'))
    unprepared = finishDecisions(advanceCouncil(advanceRound(unprepared)))
    expect(unprepared.resolution!.loops.unpreparedFlood).toBe(true)
    let prepared = finishDecisions(choose(game(['warning', 'flood']), 'store', 1))
    prepared = finishDecisions(advanceCouncil(advanceRound(prepared)))
    expect(prepared.resolution!.loops.unpreparedFlood).toBe(false)
  })
  it('replays and comparisons start from the deck without loop effects', () => {
    let state = game(['normal', 'normal']); state.citySecurity = 0.5
    state = advanceRound(finishDecisions(state))
    expect(baseEvents(state.events)[1]).toEqual({ kind: 'normal', ...C.events.normal, capacity: Math.ceil(roles.length * C.marketShares.normal) })
    expect(replayUnderNone(state).events[1].price).toBe(C.events.normal.price)
  })
})
