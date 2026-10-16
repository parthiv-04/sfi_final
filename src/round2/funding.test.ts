import { expect, it } from 'vitest'
import { advanceCouncil, createGame, finishDecisions, updateDecision, updateCouncilPlan, replayUnderNone } from './engine'
import { guidedEvents } from './guided'
import { ROUND2_CONFIG as C } from './config'
import { decisionFeedback } from '../feedback'

function farm(seat: 'automatic' | 'player' = 'automatic') {
  let game = createGame(['Alex'], () => 0.4, { seat, singlePlayer: true, roles: ['contract'] })
  game.events = guidedEvents(1)
  game = advanceCouncil(game)
  game.council.budget = 0
  return game
}
it('turns a voluntary contribution into extra Council deliveries, at an exact cost to the farmer', () => {
  const original = farm()
  const keep = finishDecisions(updateDecision(original, 'p1', { card: 'sell', promise: false }))
  const fund = finishDecisions(updateDecision(original, 'p1', { card: 'sell', promise: false, supportCouncil: true }))
  expect(fund.resolution!.cityDelivered).toBeGreaterThan(keep.resolution!.cityDelivered)
  expect(fund.players[0].cash).toBe(keep.players[0].cash - C.councilContribution)
  expect(fund.players[0].companyDebt).toBe(keep.players[0].companyDebt)
  expect(fund.resolution!.lines[0].companyUnits).toBe(keep.resolution!.lines[0].companyUnits)
  expect(fund.council.budget).toBe(C.councilContribution - fund.resolution!.councilSpent)
  expect(finishDecisions(fund)).toEqual(fund)
  expect(original.council.budget).toBe(0)
})
it('makes funding available to a human Council before its decision and charges it only once', () => {
  const original = farm('player')
  let game = finishDecisions(updateDecision(original, 'p1', { card: 'sell', promise: false, supportCouncil: true }))
  expect(game.phase).toBe('council'); expect(game.council.budget).toBe(C.councilContribution)
  game = advanceCouncil(updateCouncilPlan(game, { policy: 'none', reserveRelease: 1 }))
  expect(game.resolution!.cityDelivered).toBe(1)
  expect(game.players[0].cash).toBe(original.players[0].cash + game.resolution!.lines[0].revenue - C.councilContribution)
  expect(advanceCouncil(game)).toEqual(game)
})
it('rejects unsupported or unaffordable contributions', () => {
  const game = farm(); game.players[0].cash = C.councilContribution - 1
  expect(() => updateDecision(game, 'p1', { card: 'sell', promise: false, supportCouncil: true })).toThrow(/enough cash/)
  game.players[0].cash = 72; game.players[0].role = 'maeTha'
  expect(() => updateDecision(game, 'p1', { card: 'sell', promise: false, supportCouncil: true })).toThrow(/contract farmer/)
})
it('starts a guided sequence gently and tests preparation with later disruptions', () => {
  const events = guidedEvents(3)
  expect(events.map((e) => e.kind)).toEqual(['normal', 'festival', 'warning', 'flood', 'marketClosure'])
  expect(events[0].capacity).toBe(Math.ceil(3 * C.marketShares.normal))
  expect(events[2].forecastHits).toBe(true)
})
it('explains actual outcomes from the recorded contribution', () => {
  const game = finishDecisions(updateDecision(farm(), 'p1', { card: 'sell', promise: false, supportCouncil: true }))
  expect(decisionFeedback(game.resolution!, game.resolution!.lines[0], game.decisions.p1).join(' ')).toContain('gave $4')
})

it('keeps the contribution in the recorded decision and replays its cash and delivery consequences', () => {
  const original = farm(); original.council.budget = original.rules.councilStartingBudget
  const game = finishDecisions(updateDecision(original, 'p1', { card: 'sell', promise: false, supportCouncil: true }))
  const replay = replayUnderNone(game)
  expect(game.decisionHistory[0].choices.p1.supportCouncil).toBe(true)
  expect(replay.decisionHistory[0].choices.p1.supportCouncil).toBe(true)
  expect(replay.history[0].lines).toEqual(game.history[0].lines)
  expect(replay.players[0].cash).toBe(game.players[0].cash)
})
