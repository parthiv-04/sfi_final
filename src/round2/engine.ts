import { ROUND2_CONFIG as C, scaledRules } from './config'
import type { CouncilPlan, Decision, DecisionPreview, EventCard, EventKind, GameState, Player, PlayerScore, ResolutionLine, TurnPlan, FarmerRole, PolicyScenario, PolicyMetrics, PolicyComparison } from './types'
const clone = <T,>(value: T): T => structuredClone(value)
const q = (value: number) => Math.round(value * C.quantityPrecision) / C.quantityPrecision
export const hubPrice = (state: GameState) => state.mixedRoles ? C.hubPrices[currentEvent(state).kind] : C.hubPrice
export const companyDue = (state: GameState, player: Player) => player.role === 'contract' ? q(Math.min(player.companyDebt, Math.max(0, player.harvest - contractsDue(state, player)), Math.max(0, transportCapacity(state) - Math.min(player.harvest, contractsDue(state, player))))) : 0
export const certificateCost = (state: GameState) => state.policy === 'B' ? C.policies.B.certificateCost : C.organicCertificateCost
export const organicCap = (state: GameState) => state.players.length * (state.policy === 'B' ? C.policies.B.organicBuyerCapPerFarmer : C.organicBuyerCapPerFarmer)
// Company farmers have one route: everything after debt repayment is sold to the company.
export const canPromise = (_state: GameState, player: Player) => player.role !== 'contract'
export const marketPrice = (state: GameState, player: Player) => player.role === 'contract' ? C.companyPrice : currentEvent(state).price + (state.mixedRoles && player.role === 'maeTha' && currentEvent(state).price > 0 ? C.organicPricePremium : 0)
export const allowedCards = (state: GameState, player: Player) => (['sell', 'share', 'store', 'release'] as const).filter(card => (player.role !== 'contract' || card === 'sell') && (card !== 'release' || warehouseUnits(state, player.id) > 0))
const affordable = (budget: number, price: number) => Math.floor((budget / price + Number.EPSILON) * C.quantityPrecision) / C.quantityPrecision
export const emptyPlan = (): TurnPlan => ({ marketUnits: C.harvestPerFarm, hubUnits: 0, storeUnits: 0, warehouseRelease: 0, reserveRelease: 0, contractQuantity: 0 })
export const emptyCouncilPlan = (farmerId: string): CouncilPlan => ({ policy: 'none', quantity: 0, farmerId, reserveRelease: 0 })
export const currentEvent = (state: GameState) => state.events[state.round - 1]
export const isCrisis = (state: GameState) => ['flood', 'marketClosure'].includes(currentEvent(state).kind)
export const warehouseUnits = (state: GameState, ownerId?: string) => q(state.warehouse.filter((lot) => !ownerId || lot.ownerId === ownerId).reduce((sum, lot) => sum + lot.units, 0))
export const contractsDue = (state: GameState, player: Player) => q(player.contracts.filter((contract) => contract.dueRound === state.round).reduce((sum, contract) => sum + contract.quantity, 0))
export const contractArrivals = (state: GameState, player: Player) => q(Math.min(player.harvest, contractsDue(state, player), transportCapacity(state)) * (isCrisis(state) ? C.crisisContractArrivalFraction : 1))
export const transportCapacity = (state: GameState) => q((C.farmTransport + (state.council.plan.policy === 'extraTrucks' ? C.extraTruckCapacity : 0)) * (currentEvent(state).kind === 'flood' ? C.floodTransportFraction : 1))
export const nextHarvest = (state: GameState) => C.harvestPerFarm * (currentEvent(state).kind === 'flood' ? C.floodHarvestFraction : 1)
export const procurementReserved = (state: GameState, player: Player) => state.council.plan.policy === 'procurement' && state.council.plan.farmerId === player.id ? Math.min(state.council.plan.quantity, Math.max(0, player.harvest - contractsDue(state, player) - companyDue(state, player)), Math.max(0, transportCapacity(state) - Math.min(player.harvest, contractsDue(state, player)) - companyDue(state,player))) : 0
export const availableHarvest = (state: GameState, player: Player) => q(Math.max(0, player.harvest - contractsDue(state, player) - companyDue(state, player) - procurementReserved(state, player)))
export const defaultPlan = (state: GameState, player: Player): TurnPlan => ({ ...emptyPlan(), marketUnits: Math.min(availableHarvest(state, player), Math.max(0, transportCapacity(state) - Math.min(player.harvest, contractsDue(state, player)) - companyDue(state, player) - procurementReserved(state, player))) })
function deck(random: () => number, n: number): EventCard[] {
  const cards = (Object.keys(C.eventCopies) as EventKind[]).flatMap((kind) => Array.from({ length: C.eventCopies[kind] }, (): EventCard => ({ kind, ...C.events[kind], capacity: Math.ceil(n * C.marketShares[kind]) })))
  for (let i = cards.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [cards[i], cards[j]] = [cards[j], cards[i]] }
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].kind !== 'warning') continue
    cards[i].forecastHits = random() < C.eventForecastAccuracy
    if (i + 1 < cards.length) {
      if (cards[i].forecastHits) cards[i + 1] = { kind: 'flood', ...C.events.flood, capacity: Math.ceil(n * C.marketShares.flood) }
      else if (cards[i + 1].kind === 'flood') cards[i + 1] = { kind: 'normal', ...C.events.normal, capacity: Math.ceil(n * C.marketShares.normal) }
    }
  }
  return cards
}
export function createGame(names: string[], random = Math.random, council: { name?: string; seat?: 'player' | 'automatic'; mixedRoles?: boolean; policy?: PolicyScenario; roles?: FarmerRole[]; singlePlayer?: boolean } = {}): GameState {
  const rules = scaledRules(names.length, council.singlePlayer)
  const events = deck(random, names.length)
  const roleOrder = names.map((_,i)=>i).sort(()=>0)
  for(let i=roleOrder.length-1;i>0;i--) {const j=Math.floor(random()*(i+1)); [roleOrder[i],roleOrder[j]]=[roleOrder[j],roleOrder[i]]}
  const contractSeats = new Set(roleOrder.slice(0,Math.round(names.length*C.contractFarmerFraction)))
  const policy = council.policy ?? 'none'
  if(!['none','A','B','C'].includes(policy)) throw new Error('Choose None, A, B or C.')
  const roleFor = (i: number): FarmerRole => council.roles?.[i] ?? (contractSeats.has(i) ? 'contract' : 'maeTha')
  const mixedRoles = council.mixedRoles ?? true
  if (mixedRoles && !council.singlePlayer && !(['contract', 'maeTha'] as const).every((role) => names.some((_, i) => roleFor(i) === role))) throw new Error('Choose at least one company contract farmer and one Mae Tha organic farmer.')
  const state: GameState = { policy, decisionHistory: [], pestResults: {}, mixedRoles, rules, history: [], endedEarly: false, round: 1, phase: 'council', players: names.map((name, i) => ({ role: mixedRoles && roleFor(i) === 'contract' ? 'contract' : 'maeTha', companyDebt: mixedRoles && roleFor(i) === 'contract' ? C.companyAdvance : 0, id: `p${i + 1}`, name: name.trim() || `Farmer ${i + 1}`, cash: C.startingCash, goal: C.startingCash + C.personalGoalBonus, harvest: mixedRoles ? roleFor(i) === 'contract' ? C.companyHarvest : C.harvestPerFarm*(policy === 'B' ? C.policies.B.soilRecoveryFraction : C.soilRecoveryFraction) : C.harvestPerFarm, contracts: [], waste: 0 })), plans: {}, decisions: {}, ready: [], activePlayerIndex: 0, events, warehouse: [], reserve: q(rules.warehouseStartingUnits + (policy === 'C' ? names.length*C.policies.C.startingReserveBonusPerFarmer : 0)), council: { name: council.name?.trim() || 'Food Council', seat: council.seat ?? 'player', budget: rules.councilStartingBudget, spent: 0, explanation: '', plan: emptyCouncilPlan('p1') }, citySecurity: rules.cityStartingSecurity, totalHubUnits: 0, totalContractsDelivered: 0, crisisWarehouseUnits: 0, totalWaste: 0, resolution: null }
  state.plans = Object.fromEntries(state.players.map((p) => [p.id, defaultPlan(state, p)]))
  state.decisions = Object.fromEntries(state.players.map((p) => [p.id, { card: 'sell', promise: false }]))
  return state
}
function quantity(value: number): void {
  if (!Number.isFinite(value) || value < 0 || q(value) !== value) throw new Error('Use non-negative quantities with at most two decimals.')
}
export function updateCouncilPlan(state: GameState, patch: Partial<CouncilPlan>): GameState {
  const next = clone(state)
  if (next.phase === 'council') next.council.plan = { ...next.council.plan, ...patch }
  return next
}
export function advanceCouncil(state: GameState): GameState {
  const next = clone(state)
  if (next.phase !== 'council') return next
  const p = next.council.plan
  if (!['none', 'prePosition', 'procurement', 'extraTrucks', 'automatic'].includes(p.policy)) throw new Error('Unknown Council action.')
  quantity(p.quantity); quantity(p.reserveRelease)
  if (p.quantity > C.policyMaxUnits || p.reserveRelease > next.reserve) throw new Error('Council quantity exceeds available stock or policy limit.')
  if (p.policy === 'procurement' && !next.players.some((farmer) => farmer.id === p.farmerId)) throw new Error('Choose a farmer for emergency buying.')
  const cost = p.policy === 'extraTrucks' ? C.extraTruckCost : p.policy === 'procurement' ? p.quantity * C.procurementPrice : p.policy === 'prePosition' ? p.quantity * C.prePositionPrice : 0
  if (cost > next.council.budget) throw new Error('The Council cannot afford this action.')
  next.phase = 'planning'
  if (next.ready.length === next.players.length) {
    next.plans = Object.fromEntries(next.players.map((farmer) => [farmer.id, allocateDecision(next, farmer.id, next.decisions[farmer.id])]))
    return resolveCurrentRound(next)
  }
  next.plans = Object.fromEntries(next.players.map((farmer) => [farmer.id, defaultPlan(next, farmer)]))
  return next
}
export function validatePlan(state: GameState, playerId: string, plan: TurnPlan): void {
  const player = state.players.find((farmer) => farmer.id === playerId)
  if (!player) throw new Error('Unknown farmer.')
  Object.values(plan).forEach(quantity)
  if (player.role === 'contract' && (plan.storeUnits || plan.warehouseRelease || plan.reserveRelease || plan.contractQuantity || plan.hubUnits)) throw new Error('Company farmers can only sell to the company.')
  if (plan.contractQuantity > C.maxContractUnits || (state.round === C.rounds && plan.contractQuantity > 0)) throw new Error('Contract limit exceeded or no next round remains. Switch off the promise toggle.')
  if (q(plan.marketUnits + plan.hubUnits + plan.storeUnits) > availableHarvest(state, player)) throw new Error(`You sent ${q(plan.marketUnits + plan.hubUnits + plan.storeUnits)} units but have ${availableHarvest(state, player)} harvest units. Remove ${q(plan.marketUnits + plan.hubUnits + plan.storeUnits - availableHarvest(state, player))}.`)
  if (plan.warehouseRelease > warehouseUnits(state, player.id)) throw new Error('You cannot release more than your stored food.')
  const reserved = state.ready.reduce((sum, id) => sum + (id !== player.id ? state.plans[id].reserveRelease : 0), state.council.plan.reserveRelease)
  if (q(reserved + plan.reserveRelease) > state.reserve) throw new Error('Mae Tha reserve is already allocated.')
  const moved = Math.min(player.harvest, contractsDue(state, player), transportCapacity(state)) + companyDue(state, player) + procurementReserved(state, player) + plan.marketUnits + plan.hubUnits + plan.storeUnits + plan.warehouseRelease + plan.reserveRelease
  if (q(moved) > transportCapacity(state)) throw new Error(`Your routes exceed transport capacity by ${q(moved - transportCapacity(state))}. Remove that amount or ask the Council for trucks.`)
}
export function updatePlan(state: GameState, playerId: string, patch: Partial<TurnPlan>): GameState {
  const next = clone(state)
  if (next.phase !== 'planning' || next.ready.includes(playerId) || !next.players.some((p) => p.id === playerId)) return next
  next.plans[playerId] = { ...next.plans[playerId], ...patch }
  return next
}
// One submit, no confirming/lock pass. Any phone can submit; activePlayerIndex serves pass-and-play only.
export function advancePlanning(state: GameState, playerId = state.players[state.activePlayerIndex]?.id): GameState {
  const next = clone(state)
  if (next.phase !== 'planning' || next.ready.includes(playerId)) return next
  validatePlan(next, playerId, next.plans[playerId])
  next.ready.push(playerId)
  if (next.ready.length === next.players.length) return resolveCurrentRound(next)
  next.activePlayerIndex = next.players.findIndex((p) => !next.ready.includes(p.id))
  return next
}
export function finishPlanning(state: GameState): GameState {
  let next = clone(state)
  if (next.phase !== 'planning') return next
  for (const player of next.players) if (!next.ready.includes(player.id)) {
    // Only host-accepted drafts count at timeout. Untouched farms use the visible market default.
    const draft = next.plans[player.id]
    try { validatePlan(next, player.id, draft) } catch { next.plans[player.id] = defaultPlan(next, player) }
    next = advancePlanning(next, player.id)
  }
  return next
}
export function resolveCurrentRound(state: GameState): GameState {
  if (state.phase !== 'planning' || state.resolution) return clone(state)
  const next = state.council.seat === 'automatic' ? automaticCouncil(state) : clone(state)
  const event = currentEvent(next)
  const capacity = transportCapacity(next)
  const before = next.citySecurity
  const budgetBefore = next.council.budget
  const policy = next.council.plan
  const reserveHold = policy.policy === 'automatic' ? policy.reserveRelease * C.procurementPrice : 0
  const prePositionHold = policy.policy === 'prePosition' ? Math.min(policy.quantity, next.players.reduce((sum, p) => sum + next.plans[p.id].storeUnits, 0)) * C.prePositionPrice : 0
  const left = Object.fromEntries(next.players.map((p) => [p.id, capacity]))
  const food = Object.fromEntries(next.players.map((p) => [p.id, p.harvest]))
  const lines = Object.fromEntries(next.players.map((p): [string, ResolutionLine] => [p.id, { playerId: p.id, harvest: p.harvest, contractUnits: 0, contractShortfall: 0, companyUnits: 0, companySold: 0, companyRotten: 0, certificateCost: next.mixedRoles && p.role === 'maeTha' ? certificateCost(next) : 0, marketUnits: 0, hubUnits: 0, warehouseReleased: 0, reserveReleased: 0, stored: 0, spoilage: 0, decay: 0, storageCost: 0, revenue: 0, transportUsed: 0, transportCapacity: capacity }]))
  const spend = (amount: number) => { const paid = q(Math.min(amount, next.council.budget)); next.council.budget = q(next.council.budget - paid); next.council.spent = q(next.council.spent + paid); return paid }
  const move = (id: string, amount: number) => { left[id] = q(left[id] - amount) }
  if (policy.policy === 'extraTrucks') spend(C.extraTruckCost)
  for (const p of next.players) {
    const due = contractsDue(next, p)
    const attempted = q(Math.min(due, food[p.id], left[p.id]))
    const sent = contractArrivals(next, p)
    // The promised consignment uses transport even when disrupted food fails to arrive.
    lines[p.id].spoilage = q(attempted - sent)
    lines[p.id].contractUnits = sent; lines[p.id].contractShortfall = q(due - sent)
    lines[p.id].revenue += sent * C.contractPrice
    food[p.id] = q(food[p.id] - attempted); move(p.id, attempted)
    p.contracts = p.contracts.filter((c) => c.dueRound !== next.round)
    if (next.plans[p.id].contractQuantity) p.contracts.push({ quantity: next.plans[p.id].contractQuantity, dueRound: next.round + 1 })
  }
  for (const p of next.players) if (p.role === 'contract') {
    const repaid = q(Math.min(p.companyDebt, food[p.id], left[p.id]))
    p.companyDebt = q(p.companyDebt - repaid); food[p.id] = q(food[p.id] - repaid); move(p.id, repaid)
    // The company buys the rest at a fixed price, and still pays when a closure rots it.
    const sold = q(Math.min(next.plans[p.id].marketUnits, food[p.id], left[p.id]))
    lines[p.id].companySold = sold; lines[p.id].revenue += sold * C.companyPrice
    food[p.id] = q(food[p.id] - sold); move(p.id, sold)
    const taken = q(repaid + sold)
    lines[p.id].companyUnits = taken
    if (event.kind === 'marketClosure') {
      if (next.policy === 'A') {
        const arrived=q(taken*C.policies.A.closureHubFraction), school=q(arrived*C.policies.A.closureHospitalFraction)
        lines[p.id].contractUnits=q(lines[p.id].contractUnits+school);lines[p.id].hubUnits=q(lines[p.id].hubUnits+arrived-school);lines[p.id].companyUnits=q(taken-arrived)
      }
      else {lines[p.id].companyRotten = taken; lines[p.id].spoilage = q(lines[p.id].spoilage + taken)}
    }
  }
  if (policy.policy === 'procurement') {
    const id = policy.farmerId
    const bought = q(Math.min(policy.quantity, food[id], left[id], affordable(next.council.budget, C.procurementPrice)))
    lines[id].hubUnits += bought; lines[id].revenue += spend(bought * C.procurementPrice)
    food[id] = q(food[id] - bought); move(id, bought)
  }
  for (const p of next.players) {
    const plan = next.plans[p.id], line = lines[p.id]
    const reserve = q(Math.min(plan.reserveRelease, next.reserve, left[p.id]))
    next.reserve = q(next.reserve - reserve); line.reserveReleased = reserve; line.hubUnits += reserve; move(p.id, reserve)
    let release = q(Math.min(plan.warehouseRelease, left[p.id], affordable(Math.max(0, next.council.budget - prePositionHold - reserveHold), hubPrice(next))))
    for (const lot of next.warehouse.filter((lot) => lot.ownerId === p.id)) {
      const sent = q(Math.min(lot.units, release)); lot.units = q(lot.units - sent); release = q(release - sent)
      line.warehouseReleased += sent; line.hubUnits += sent; line.revenue += spend(sent * hubPrice(next)); move(p.id, sent)
    }
    const hub = q(Math.min(plan.hubUnits, food[p.id], left[p.id], affordable(Math.max(0, next.council.budget - prePositionHold - reserveHold), hubPrice(next))))
    line.hubUnits += hub; line.revenue += spend(hub * hubPrice(next)); food[p.id] = q(food[p.id] - hub); move(p.id, hub)
  }
  // Equal-price market offers share scarce demand in hundredths, with a rotating remainder priority.
  const offers = next.players.map((p) => ({ id: p.id, units: p.role === 'contract' ? 0 : Math.round(Math.min(next.plans[p.id].marketUnits, food[p.id], left[p.id]) * C.quantityPrecision) }))
  let marketLeft = Math.round(Math.max(0,event.capacity - Object.values(lines).reduce((s,l)=>s+l.companyUnits-l.companyRotten,0)) * C.quantityPrecision)
  let organicLeft = next.mixedRoles ? Math.round(organicCap(next)*C.quantityPrecision) : Infinity
  const ordered = [...offers.slice((next.round - 1) % offers.length), ...offers.slice(0, (next.round - 1) % offers.length)]
  while (marketLeft > 0 && ordered.some((offer) => offer.units > 0 && (next.players.find(p=>p.id===offer.id)!.role !== 'maeTha' || organicLeft > 0))) {
    for (const offer of ordered) if (offer.units > 0 && marketLeft > 0 && (next.players.find(p=>p.id===offer.id)!.role !== 'maeTha' || organicLeft > 0)) { if(next.players.find(p=>p.id===offer.id)!.role === 'maeTha') organicLeft--; offer.units--; marketLeft--; lines[offer.id].marketUnits = q(lines[offer.id].marketUnits + 1 / C.quantityPrecision) }
  }
  let support = policy.policy === 'prePosition' ? policy.quantity : 0
  for (const p of next.players) {
    const plan = next.plans[p.id], line = lines[p.id]
    food[p.id] = q(food[p.id] - line.marketUnits); move(p.id, line.marketUnits); line.revenue += line.marketUnits * marketPrice(next,p)
    const stored = q(Math.min(plan.storeUnits, food[p.id], left[p.id]))
    if (stored) next.warehouse.push({ ownerId: p.id, units: stored, depositedRound: next.round })
    line.stored = stored; food[p.id] = q(food[p.id] - stored); move(p.id, stored)
    const supported = Math.min(support, stored, affordable(next.council.budget, C.prePositionPrice))
    line.revenue += spend(supported * C.prePositionPrice); support = q(support - supported)
  }
  let councilReserveReleased = 0
  let reserveWanted = Math.min(next.reserve, policy.reserveRelease + (next.policy === 'C' && isCrisis(next) ? next.reserve : 0))
  for (const p of next.players) {
    const sent = q(Math.min(reserveWanted, left[p.id])); reserveWanted = q(reserveWanted - sent); next.reserve = q(next.reserve - sent); move(p.id, sent); councilReserveReleased = q(councilReserveReleased + sent)
  }
  if (policy.policy === 'automatic') {
    spend(Math.min(councilReserveReleased, policy.reserveRelease) * C.procurementPrice)
    next.council.explanation = `Bought ${councilReserveReleased} reserve units because planned food fell short${isCrisis(next) ? '; funded hub deliveries during the crisis' : '; kept the rest of the budget for disruptions'}.`
  }
  // Donated reserve is separate: never decays, never incurs farmer fees, never pays farmer cash.
  for (const lot of next.warehouse) lines[lot.ownerId].storageCost += lot.units * C.warehouseCostPerUnit
  let decay = Math.floor(warehouseUnits(next) * C.warehouseDecayFraction)
  for (const lot of next.warehouse) { const lost = Math.min(lot.units, decay); lot.units = q(lot.units - lost); decay = q(decay - lost); lines[lot.ownerId].decay = q(lines[lot.ownerId].decay + lost) }
  next.warehouse = next.warehouse.filter((lot) => lot.units > 0)
  for (const p of next.players) {
    const line = lines[p.id]; line.spoilage = q(line.spoilage + food[p.id]); line.transportUsed = q(capacity - left[p.id]); line.storageCost = q(line.storageCost); line.revenue = q(line.revenue)
    p.cash = q(p.cash + line.revenue - line.storageCost - line.certificateCost); p.waste = q(p.waste + line.spoilage + line.decay); next.totalWaste = q(next.totalWaste + line.spoilage + line.decay)
    if (isCrisis(next)) next.crisisWarehouseUnits = q(next.crisisWarehouseUnits + line.warehouseReleased + line.reserveReleased)
  }
  if (isCrisis(next)) next.crisisWarehouseUnits = q(next.crisisWarehouseUnits + councilReserveReleased)
  const contractsDelivered = q(Object.values(lines).reduce((s, line) => s + line.contractUnits, 0))
  const hubDelivered = q(Object.values(lines).reduce((s, line) => s + line.hubUnits, councilReserveReleased))
  const cityNeed = isCrisis(next) ? next.rules.cityCrisisNeed : next.rules.cityNeed
  const baseGap = Math.max(0, next.rules.cityNeed - Math.min(next.rules.cityNeed, contractsDelivered))
  const crisisHubNeed = cityNeed - next.rules.cityNeed
  const crisisHubShortfall = q(Math.max(0, crisisHubNeed - Math.max(0, hubDelivered - baseGap)))
  const shortfall = q(Math.max(0, baseGap - hubDelivered) + crisisHubShortfall)
  next.citySecurity = q(Math.max(0, Math.min(next.rules.cityMaxSecurity, before + (shortfall ? -shortfall * C.cityLossPerShortUnit : C.cityRecovery))))
  next.totalHubUnits = q(next.totalHubUnits + hubDelivered); next.totalContractsDelivered = q(next.totalContractsDelivered + contractsDelivered)
  next.resolution = { round: next.round, event: clone(event), lines: next.players.map((p) => lines[p.id]), councilReserveReleased, contractsDelivered, hubDelivered, cityDelivered: q(contractsDelivered + hubDelivered), cityNeed, crisisHubNeed, crisisHubShortfall, shortfall, securityBefore: before, securityAfter: next.citySecurity, councilSpent: q(budgetBefore - next.council.budget), waste: q(Object.values(lines).reduce((s, line) => s + line.spoilage + line.decay, 0)) }
  if (policy.policy === 'automatic') next.council.explanation = councilReserveReleased > 0 ? `Bought ${councilReserveReleased} reserve units because planned food fell short; ${isCrisis(next) ? 'funded the crisis hub with the remaining budget' : 'kept the rest for later'}.` : shortfall > 0 ? 'Need remains unmet: the remaining reserve, roads or budget could not cover the gap.' : `Planned food met need; kept the reserve${isCrisis(next) ? ' and funded crisis hub deliveries' : ' for later'}.`
  next.decisionHistory.push({ round: next.round, choices: clone(next.decisions), pests: clone(next.pestResults), council: clone(state.council.plan) })
  next.history.push(clone(next.resolution))
  next.phase = next.citySecurity === 0 ? 'gameOver' : 'resolution'
  return next
}
export function advanceRound(state: GameState): GameState {
  const next = clone(state)
  if (next.phase !== 'resolution') return next
  if (next.round === C.rounds) { next.phase = 'debrief'; return next }
  const harvest = nextHarvest(next)
  next.round++; next.pestResults = {}; if(next.policy === 'C') next.reserve=q(next.reserve+C.policies.C.reserveGrowthPerRound); next.phase = 'council'; next.ready = []; next.activePlayerIndex = 0; next.resolution = null
  next.players.forEach((p) => { p.harvest = next.mixedRoles && p.role === 'contract' ? C.companyHarvest*(harvest/C.harvestPerFarm) : harvest; if(p.role === 'contract') p.companyDebt=q(p.companyDebt+C.companyAdvance) })
  next.council.plan = emptyCouncilPlan(next.players[0].id)
  next.council.explanation = ''
  next.plans = Object.fromEntries(next.players.map((p) => [p.id, defaultPlan(next, p)]))
  next.decisions = Object.fromEntries(next.players.map((p) => [p.id, { card: 'sell', promise: false }]))
  return next
}
export function rankPlayers(state: GameState): PlayerScore[] {
  if (state.phase !== 'debrief' || state.endedEarly) return []
  const scores = state.players.map((p) => ({ playerId: p.id, name: p.name, cash: p.cash, goal: p.goal, won: personalGoalPassed(state, p), rank: 0 })).sort((a, b) => b.cash - a.cash)
  scores.forEach((score, i) => { score.rank = i > 0 && score.cash === scores[i - 1].cash ? scores[i - 1].rank : i + 1 })
  return scores
}

export function automaticCouncil(state: GameState): GameState {
  const next = clone(state)
  const contracts = next.players.reduce((sum, p) => sum + contractArrivals(next, p), 0)
  const offers = next.players.reduce((sum, p) => sum + next.plans[p.id].hubUnits + next.plans[p.id].warehouseRelease, 0)
  const companyArrival = next.policy === 'A' && currentEvent(next).kind === 'marketClosure' ? next.players.reduce((sum,p)=>sum+q((companyDue(next,p)+(p.role === 'contract' ? next.plans[p.id].marketUnits : 0))*C.policies.A.closureHubFraction),0) : 0
  const expected = contracts + companyArrival + Math.min(offers, affordable(next.council.budget, hubPrice(next)))
  const need = isCrisis(next) ? next.rules.cityCrisisNeed : next.rules.cityNeed
  next.council.plan = { policy: 'automatic', quantity: 0, farmerId: next.players[0].id, reserveRelease: Math.min(next.reserve, Math.max(0, need - expected), affordable(next.council.budget, C.procurementPrice)) }
  return next
}

export function allocateDecision(state: GameState, playerId: string, choice: Decision): TurnPlan {
  const p = state.players.find((farmer) => farmer.id === playerId)
  if (!p) throw new Error('Choose your farm seat before submitting.')
  if (!['sell', 'share', 'store', 'release'].includes(choice.card) || typeof choice.promise !== 'boolean') throw new Error('Tap one plan card and choose whether to promise a contract.')
  if (!allowedCards(state,p).includes(choice.card)) throw new Error('Choose a card available for your role.')
  if (!canPromise(state,p) && choice.promise) throw new Error('Only Mae Tha members promise school contracts.')
  if (choice.card === 'release' && warehouseUnits(state, playerId) === 0) throw new Error('You have no stored food. Choose Sell, Share or Store.')
  const free = availableHarvest(state, p)
  let left = Math.max(0, transportCapacity(state) - Math.min(p.harvest, contractsDue(state, p), transportCapacity(state)) - companyDue(state,p) - procurementReserved(state, p))
  const plan: TurnPlan = { marketUnits: 0, hubUnits: 0, storeUnits: 0, warehouseRelease: 0, reserveRelease: 0, contractQuantity: choice.promise && state.round < C.rounds ? C.maxContractUnits : 0 }
  if (choice.card === 'share') { plan.hubUnits = Math.min(free, Math.ceil(free / C.shareDivisor), left); left -= plan.hubUnits; plan.marketUnits = Math.min(Math.max(0, free - plan.hubUnits), left) }
  if (choice.card === 'store') plan.storeUnits = Math.min(free, left)
  if (choice.card === 'sell') plan.marketUnits = Math.min(free, left)
  if (choice.card === 'release') { plan.warehouseRelease = Math.min(warehouseUnits(state, p.id), left); left -= plan.warehouseRelease; plan.marketUnits = Math.min(free, left) }
  return Object.fromEntries(Object.entries(plan).map(([key, value]) => [key, q(value)])) as unknown as TurnPlan
}
export function updateDecision(state: GameState, playerId: string, choice: Decision): GameState {
  const next = clone(state)
  if (next.phase !== 'planning') return next
  const plan = allocateDecision(next, playerId, choice)
  validatePlan(next, playerId, plan)
  next.decisions[playerId] = clone(choice); next.plans[playerId] = plan
  return next
}
export function previewDecision(state: GameState, playerId: string, choice: Decision): DecisionPreview {
  const plan = allocateDecision(state, playerId, choice)
  const p = state.players.find((p) => p.id === playerId)!
  const contract = contractArrivals(state, p)
  const attemptedContract = Math.min(p.harvest, contractsDue(state, p), transportCapacity(state))
  const stockLeft = Math.max(0, warehouseUnits(state, p.id) - plan.warehouseRelease) + plan.storeUnits
  const costs = stockLeft * C.warehouseCostPerUnit + (state.mixedRoles && p.role === 'maeTha' ? certificateCost(state) : 0)
  const paidHub = Math.min(plan.hubUnits + plan.warehouseRelease, affordable(state.council.budget, hubPrice(state)))
  const moves = q(attemptedContract + plan.marketUnits + plan.hubUnits + plan.storeUnits + plan.warehouseRelease)
  const companySale = p.role === 'contract' ? plan.marketUnits * C.companyPrice : 0
  return { cashMin: q(contract * C.contractPrice + companySale - costs), cashMax: q(contract * C.contractPrice + plan.marketUnits * marketPrice(state,p) + paidHub * hubPrice(state) - costs), households: q(contract + paidHub), moves, stored: plan.storeUnits, limited: plan.marketUnits + plan.hubUnits + plan.storeUnits < availableHarvest(state, p) || (choice.card === 'release' && plan.warehouseRelease < warehouseUnits(state, p.id)) }
}
export function finishDecisions(state: GameState): GameState {
  const next = clone(state)
  if (next.phase !== 'planning') return next
  for (const p of next.players) next.plans[p.id] = allocateDecision(next, p.id, next.decisions[p.id])
  next.ready = next.players.map((p) => p.id)
  if (next.council.seat === 'player') { next.phase = 'council'; return next }
  return resolveCurrentRound(next)
}

export const personalGoalPassed = (state: GameState, player: Player): boolean => state.phase === 'debrief' && !state.endedEarly && state.citySecurity > 0 && player.cash >= player.goal

export function applyPestLoss(state: GameState, playerId: string, destroyed: number): GameState {
  if (!Number.isInteger(destroyed) || destroyed < 0 || destroyed > C.minigame.plants) throw new Error('Invalid crop loss.')
  const next = clone(state), p = next.players.find(p => p.id === playerId)
  if (!p || next.phase !== 'planning' || next.pestResults[playerId] !== undefined) throw new Error('Grow is closed.')
  next.pestResults[playerId] = destroyed
  // Crop protection is recorded for the round but never changes the harvest.
  return next
}

export function policyMetrics(state: GameState): PolicyMetrics {
  const companies = state.players.filter(p=>p.role==='contract'), members = state.players.filter(p=>p.role==='maeTha')
  const average = (values: number[]) => values.length ? q(values.reduce((s,v)=>s+v,0)/values.length) : 0
  return { shortageRounds: state.history.filter(r=>r.shortfall>0).length, finalSecurity: state.citySecurity, contractCash: average(companies.map(p=>p.cash)), contractDebt: average(companies.map(p=>p.companyDebt)), maeThaProfit: average(members.map(p=>p.cash-C.startingCash)), waste: state.totalWaste }
}
// Replay actual event deck, roles, crop results and choices; no UI or new randomness.
// Choices exclusive to policy A become Sell/no-promise under None.
export function comparePolicy(state: GameState): PolicyComparison {
  let baseline = createGame(state.players.map(p=>p.name),()=>0,{seat:state.council.seat,mixedRoles:state.mixedRoles,policy:'none',roles:state.players.map(p=>p.role),singlePlayer:state.players.length===1})
  baseline.events=clone(state.events)
  for (const record of state.decisionHistory) {
    if (baseline.phase==='gameOver' || baseline.phase==='debrief') break
    baseline=advanceCouncil(baseline)
    for(const [id,destroyed] of Object.entries(record.pests)) baseline=applyPestLoss(baseline,id,destroyed)
    for(const p of baseline.players) {
      const saved=record.choices[p.id] ?? {card:'sell',promise:false}
      const choice: Decision={card:allowedCards(baseline,p).includes(saved.card)?saved.card:'sell',promise:saved.promise&&canPromise(baseline,p)}
      baseline=updateDecision(baseline,p.id,choice)
    }
    baseline=finishDecisions(baseline)
    if(baseline.phase==='council') {
      const plan=clone(record.council);plan.reserveRelease=Math.min(plan.reserveRelease,baseline.reserve)
      const cost=plan.policy==='extraTrucks'?C.extraTruckCost:plan.policy==='procurement'?plan.quantity*C.procurementPrice:plan.policy==='prePosition'?plan.quantity*C.prePositionPrice:0
      baseline=advanceCouncil(updateCouncilPlan(baseline,cost<=baseline.council.budget?plan:emptyCouncilPlan(baseline.players[0].id)))
    }
    baseline=advanceRound(baseline)
  }
  const actual=policyMetrics(state), none=policyMetrics(baseline)
  return {policy:state.policy,baseline:none,actual,fewerShortageRounds:none.shortageRounds-actual.shortageRounds,rounds:state.decisionHistory.length}
}
