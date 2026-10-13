import { describe, expect, it } from 'vitest'
import { ROUND2_CONFIG as C } from './config'
import { advanceCouncil, createGame, finishDecisions, organicCap, organicWalkOffs, updateDecision, walkOffs } from './engine'
import { makeRng } from './rng'
import type { EventKind } from './types'

const roles = ['contract', 'maeTha', 'maeTha', 'maeTha', 'maeTha'] as const
function game(kind: EventKind, price?: number) {
  const state = createGame(roles.map((_, i) => `F${i + 1}`), makeRng(9), { seat: 'automatic', roles: [...roles] })
  state.events[0] = { kind, ...C.events[kind], capacity: 200, ...(price === undefined ? {} : { price }) }
  if (kind === 'marketClosure') state.events[0].capacity = 0
  return advanceCouncil(state)
}

describe('shoppers react to price', () => {
  it('walks off an exact number of shoppers per $1 above the normal price', () => {
    expect(walkOffs(game('normal'))).toBe(0)
    expect(walkOffs(game('festival'))).toBe(Math.round(roles.length * C.shoppers.walkOffsPerDollarPerFarmer * (C.events.festival.price - C.shoppers.normalPrice)))
    expect(walkOffs(game('marketClosure'))).toBe(0)
  })
  it('turns organic shoppers away every open-market week, more often than general shoppers', () => {
    const normal = game('normal')
    expect(organicWalkOffs(normal)).toBe(Math.round(roles.length * C.shoppers.organicWalkOffsPerFarmer))
    expect(organicWalkOffs(normal)).toBeGreaterThan(walkOffs(normal))
    expect(organicWalkOffs(game('marketClosure'))).toBe(0)
    // Organic sales are capped at the shoppers who stay.
    let state = normal
    for (const p of state.players.filter((p) => p.role === 'maeTha')) state = updateDecision(state, p.id, { card: 'sell', promise: false })
    const result = finishDecisions(state).resolution!
    const organicSold = result.lines.filter((l) => l.companyUnits === 0).reduce((s, l) => s + l.marketUnits, 0)
    expect(organicSold).toBeLessThanOrEqual(organicCap(normal) - organicWalkOffs(normal))
    expect(result.shoppers.organicWalkOffs).toBe(organicWalkOffs(normal))
  })
  it('splits unmet households into "food here, but too expensive" and "no food"', () => {
    let state = game('normal', C.shoppers.normalPrice + 3)
    state.reserve = 0
    for (const p of state.players.filter((p) => p.role === 'maeTha')) state = updateDecision(state, p.id, { card: 'sell', promise: false })
    const r = finishDecisions(state).resolution!
    expect(r.shoppers.unsoldOffered).toBeGreaterThan(0)
    expect(r.tooExpensive).toBe(Math.min(r.shortfall, r.shoppers.unsoldOffered))
    expect(r.tooExpensive + r.noFood).toBe(r.shortfall)
  })
})
