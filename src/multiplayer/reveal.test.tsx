import { expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ROUND2_CONFIG as C } from '../round2/config'
import { advanceCouncil, createGame, finishDecisions, updateDecision, allowedCards, canPromise, advanceRound } from '../round2/engine'
import { makeRng } from '../round2/rng'
import type { EventKind, GameState, Resolution } from '../round2/types'
import { newRoom, projectRoom } from './hostModel'
import { SharedBoard } from './SharedBoard'

const count = (html: string, pattern: RegExp) => (html.match(pattern) ?? []).length
const crates = (html: string) => count(html, /class="anim fly"[^>]*><svg[^>]*viewBox="0 0 10 9"/g)
const rotten = (html: string) => count(html, /class="anim appear"[^>]*><svg[^>]*viewBox="0 0 10 9"/g)
const coins = (html: string) => count(html, /class="anim fly"[^>]*><svg[^>]*viewBox="0 0 6 6"/g)
const visual = (units: number) => units > 0 ? Math.min(8, Math.ceil(units)) : 0
const total = (r: Resolution, pick: (l: Resolution['lines'][number]) => number) => Math.round(r.lines.reduce((s, l) => s + pick(l), 0) * 100) / 100

function resolved(kind: EventKind, choose: (game: GameState, id: string) => 'sell' | 'share' | 'store' | 'release', policy: 'none' | 'A' = 'none') {
  let game = createGame(['Ann', 'Bo', 'Cy', 'Di', 'Ed'], makeRng(7), { seat: 'automatic', policy, roles: ['contract', 'contract', 'maeTha', 'maeTha', 'maeTha'] })
  if (kind === 'flood') { game.events[1] = { kind, ...C.events[kind], capacity: game.events[1].capacity }; game = advanceCouncil(game); game = finishDecisions(game); game = advanceRound(game) }
  game.events[game.round - 1] = { kind, ...C.events[kind], capacity: Math.ceil(5 * C.marketShares[kind]) }
  game = advanceCouncil(game)
  for (const p of game.players) { const card = allowedCards(game, p).includes(choose(game, p.id)) ? choose(game, p.id) : 'sell'; game = updateDecision(game, p.id, { card, promise: canPromise(game, p) && game.round < C.rounds }) }
  game = finishDecisions(game)
  const room = newRoom('TEST', 'host', 'automatic', 5); room.game = game
  return { room: projectRoom(room).publicRoom, r: game.resolution! }
}

it.each([
  ['normal', 'sell'], ['festival', 'share'], ['marketClosure', 'sell'], ['flood', 'store'], ['warning', 'store'],
] as const)('reveal flows in a %s round match the resolved quantities and payments', (kind, card) => {
  const { room, r } = resolved(kind, () => card)
  const step = (s: number) => renderToStaticMarkup(<SharedBoard room={room} revealStep={s} />)
  // Market: Mae Tha sales and payment, company collection and payment, recorded spoilage only.
  const market = step(C.revealStage.market)
  const sold = total(r, (l) => l.marketUnits), company = total(r, (l) => l.companyUnits), companyRot = total(r, (l) => l.companyRotten)
  const farmRot = Math.round((total(r, (l) => l.spoilage) - companyRot) * 100) / 100
  const paid = total(r, (l) => l.marketUnits * (r.event.price + (room.farmers.find((p) => p.id === l.playerId)!.role === 'maeTha' && r.event.price > 0 ? C.organicPricePremium : 0)))
  expect(crates(market)).toBe(visual(sold) + visual(company))
  expect(rotten(market)).toBe(visual(farmRot) + visual(companyRot))
  expect(coins(market)).toBe((paid > 0 ? Math.min(5, Math.ceil(paid / 4)) : 0) + (total(r, (l) => l.companySold) > 0 ? Math.min(5, Math.ceil(total(r, (l) => l.companySold) * C.companyPrice / 4)) : 0))
  expect(market).toContain(kind === 'marketClosure' ? 'Market closed' : `Sold ${sold}`)
  expect(market).toContain(`Company collected ${company}`)
  expect(market.includes('class="shutter"')).toBe(kind === 'marketClosure')
  // Storage: food stays on the farm; decay only when recorded.
  const storage = step(C.revealStage.warehouse)
  expect(crates(storage)).toBe(visual(total(r, (l) => l.stored)))
  expect(rotten(storage)).toBe(visual(total(r, (l) => l.decay)))
  expect(storage.includes('spoiled')).toBe(total(r, (l) => l.decay) > 0)
  expect(coins(storage)).toBe(0)
  // Hub: farm food and reserve food reach the community kitchen.
  const hub = step(C.revealStage.hub)
  const reserve = Math.round((r.councilReserveReleased + total(r, (l) => l.reserveReleased)) * 100) / 100
  expect(crates(hub)).toBe(visual(Math.round((r.hubDelivered - reserve) * 100) / 100) + visual(reserve))
  expect(hub).toContain(`Community reserve → kitchen ${reserve}`)
})

it('shows spoilage in a closure only for what the engine recorded', () => {
  const { room, r } = resolved('marketClosure', () => 'sell')
  const market = renderToStaticMarkup(<SharedBoard room={room} revealStep={C.revealStage.market} />)
  expect(total(r, (l) => l.companyRotten)).toBeGreaterThan(0)
  expect(market).toContain(`spoiled ${total(r, (l) => l.companyRotten)}`)
  const share = resolved('marketClosure', () => 'share', 'A')
  const diverted = renderToStaticMarkup(<SharedBoard room={share.room} revealStep={C.revealStage.market} />)
  expect(total(share.r, (l) => l.companyRotten)).toBe(0)
  expect(rotten(diverted)).toBe(visual(total(share.r, (l) => l.spoilage)))
})
