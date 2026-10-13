import { describe, expect, it } from 'vitest'
import { ROUND2_CONFIG as C } from './config'
import { advanceCouncil, allowedCards, createGame, finishDecisions, optionOutcome, promiseOutcome, updateDecision } from './engine'
import type { EventKind, PlanCard } from './types'
import { makeRng } from './rng'

function start(kind: EventKind, roles: ('contract' | 'maeTha')[] = ['contract', 'maeTha', 'maeTha']) {
  const state = createGame(roles.map((_, i) => `F${i + 1}`), makeRng(3), { seat: 'automatic', roles })
  state.events[0] = { kind, ...C.events[kind], capacity: kind === 'marketClosure' ? 0 : 100 }
  return advanceCouncil(state)
}

describe('exact option outcomes', () => {
  it.each([['normal'], ['festival'], ['flood'], ['marketClosure']] as [EventKind][])('match the resolved cash and households for every card in a %s round', (kind) => {
    for (const card of ['sell', 'share', 'store'] as PlanCard[]) {
      let state = start(kind)
      const me = state.players[1]
      if (!allowedCards(state, me).includes(card)) continue
      // The other Mae Tha farm stores, so shared organic buyers do not limit this farm's sale.
      state = updateDecision(state, state.players[2].id, { card: 'store', promise: false })
      const outcome = optionOutcome(state, me.id, card)
      state = updateDecision(state, me.id, { card, promise: false })
      const line = finishDecisions(state).resolution!.lines.find((l) => l.playerId === me.id)!
      // Card cash excludes the fixed organic certificate; market cash assumes every offered unit sells (buyers set to 100 here).
      expect(Math.round((line.revenue - line.storageCost) * 100) / 100).toBe(outcome.cash)
      expect(Math.round((line.hubUnits) * 100) / 100).toBe(outcome.households)
    }
  })
  it('gives a company farmer the exact company payment', () => {
    const state = start('normal')
    const farmer = state.players[0]
    const outcome = optionOutcome(state, farmer.id, 'sell')
    const line = finishDecisions(state).resolution!.lines.find((l) => l.playerId === farmer.id)!
    expect(outcome.cash).toBe(line.revenue)
    expect(outcome.households).toBe(0)
  })
  it('states a promise exactly for normal and crisis rounds, and only for Mae Tha before the last round', () => {
    const state = start('normal')
    expect(promiseOutcome(state, state.players[1])).toEqual({ cash: C.contractPrice, households: 1, crisisCash: C.contractPrice * C.crisisContractArrivalFraction, crisisHouseholds: C.crisisContractArrivalFraction })
    expect(promiseOutcome(state, state.players[0])).toBeNull()
    expect(promiseOutcome({ ...state, round: C.rounds }, state.players[1])).toBeNull()
  })
})
describe('market buyers left for Mae Tha farms', () => {
  it('subtract the company take from market capacity and cap at organic buyers', async () => {
    const { organicBuyersLeft, organicCap, companyDue } = await import('./engine')
    const state = start('normal')
    state.events[0].capacity = 3
    const company = state.players[0]
    const taken = Math.round((companyDue(state, company) + state.plans[company.id].marketUnits) * 100) / 100
    expect(organicBuyersLeft(state)).toBe(Math.min(3 - taken, organicCap(state)))
  })
})
