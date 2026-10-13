// Host only. Engine calls never enter the phone dependency path.
import { pickRoundFact, CONTEXT_CARDS, DEBRIEF_QUESTIONS } from '../learning'
import { ROUND2_CONFIG as C, scaledRules } from '../round2/config'
import { baseEvents, comparePolicy, allowedCards, optionOutcome, promiseOutcome, hubPrice, organicBuyersLeft, applyPestLoss, advanceCouncil, advanceRound, availableHarvest, contractsDue, createGame, currentEvent, finishPlanning, finishDecisions, previewDecision, updateDecision, rankPlayers, transportCapacity, updateCouncilPlan, updatePlan, validatePlan, warehouseUnits } from '../round2/engine'
import type { CouncilPlan, Decision, FarmerRole, PlanCard, TurnPlan } from '../round2/types'
import { NETWORK_CONFIG } from './config'
import { farmSeats } from './protocol'
import type { ActionReceipt, ClientAction, PrivateView, Publication, PublicRoom, RoomModel, SeatId } from './protocol'
const clone = <T,>(value: T): T => structuredClone(value)
const object = (value: unknown): Record<string, unknown> => { if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid action payload.'); return value as Record<string, unknown> }
const keys = (value: Record<string, unknown>, allowed: string[]) => { if (Object.keys(value).some((key) => !allowed.includes(key))) throw new Error('Unexpected action field.') }
const number = (value: unknown) => { if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('A finite number is required.'); return value }
const text = (value: unknown) => { if (typeof value !== 'string') throw new Error('Text is required.'); return value }
function parseChoice(value: unknown): Decision { const p = object(value); keys(p, ['card', 'promise']); if (!['sell', 'share', 'store', 'release'].includes(text(p.card)) || typeof p.promise !== 'boolean') throw new Error('Tap a plan card and choose the contract toggle.'); return { card: p.card as PlanCard, promise: p.promise } }
function parseCouncil(value: unknown): CouncilPlan { const p = object(value); keys(p, ['policy', 'quantity', 'farmerId', 'reserveRelease']); return { policy: text(p.policy) as CouncilPlan['policy'], quantity: number(p.quantity), farmerId: text(p.farmerId), reserveRelease: number(p.reserveRelease) } }
export function newRoom(code: string, hostUid: string, councilMode: RoomModel['councilMode'], farmerCount: number = C.playerCount, singlePlayer = false): RoomModel { return { policy: 'none', usedFacts: [], roundFact: null, factRound: 0, skipPest: false, pestSeed: Array.from(code).reduce((s,c)=>Math.imul(s,31)+c.charCodeAt(0),0) >>> 0, pestEndsAt: null, pestDone: [], discussionIndex: -1, reflections: {}, offline: false, learning: { kind: null, index: 0 }, learningReady: {}, runId: 0, version: NETWORK_CONFIG.roomVersion, farmerCount: scaledRules(farmerCount, singlePlayer).playerCount, code, hostUid, councilMode, revision: 0, participants: {}, game: null, handled: {}, seatRevisions: {}, planningEndsAt: null, savedSeats: [], paused: false, remainingMs: 0, ended: false } }
export function applyAction(model: RoomModel, senderUid: string, action: ClientAction, random = Math.random, now = 0): { model: RoomModel; receipt: ActionReceipt } {
  const key = `${senderUid}:${action.id}`
  if (model.handled[key]) return { model: clone(model), receipt: clone(model.handled[key]) }
  const next = clone(model)
  let accepted = false, message = 'Choices saved.'
  try {
    if (model.version !== NETWORK_CONFIG.roomVersion) throw new Error('This room uses the previous rules. Create a new room.')
    if (senderUid !== action.actorUid) throw new Error('Action identity does not match this connection.')
    if (!Number.isInteger(action.revision) || action.revision > model.revision) throw new Error('Invalid action revision.')
    if (JSON.stringify(action.payload).length > NETWORK_CONFIG.maxPayloadLength) throw new Error('Action payload is too large.')
    if (['plan', 'pest', 'reflection'].includes(action.type)) {
      if (action.round !== model.game?.round || action.seatRevision !== (model.seatRevisions[senderUid] ?? 0)) throw new Error('Your choices changed. Review and try again.')
    } else if (!['join', 'heartbeat', 'learningNext', 'learningSkip'].includes(action.type) && action.revision !== model.revision) throw new Error('The board changed. Review and try again.')
    const p = object(action.payload), participant = next.participants[senderUid]
    if (action.type === 'settings') {
      if (senderUid !== next.hostUid || next.game) throw new Error('Choose settings before starting.')
      keys(p, ['skipPest','policy']); if(p.policy !== undefined) { if(!['none','A','B','C'].includes(text(p.policy))) throw new Error('Choose a policy.');next.policy=p.policy as RoomModel['policy'] } if (typeof p.skipPest !== 'boolean') throw new Error('Choose skip pest game.'); next.skipPest = p.skipPest
    } else if (action.type === 'pest' || action.type === 'growFinish' || action.type === 'growSkip') {
      if (!next.game || next.paused || next.learning.kind !== 'grow' || next.learning.index !== 1) throw new Error('Grow is closed.')
      if (action.type === 'pest') {
        keys(p, ['destroyed']); const seat = participant?.seatId
        if (!seat || seat === 'council' || next.pestDone.includes(seat)) throw new Error('Crop result already saved or no farm seat.')
        next.game = applyPestLoss(next.game, seat, number(p.destroyed)); next.pestDone.push(seat)
      } else {
        if (senderUid !== next.hostUid) throw new Error('Only the host can end Grow for everyone.')
        if (action.type === 'growFinish' && (next.pestEndsAt === null || now < next.pestEndsAt)) throw new Error('Grow time has not ended.')
        for (const farmer of next.game.players) if (!next.pestDone.includes(farmer.id)) { next.game = applyPestLoss(next.game, farmer.id, 0); next.pestDone.push(farmer.id) }
      }
      if (next.pestDone.length === next.farmerCount) { next.learning = { kind: null, index: 0 }; next.pestEndsAt = null; next.planningEndsAt = next.offline ? null : now + C.planningSeconds * C.millisecondsPerSecond }
    } else if (action.type === 'question' || action.type === 'replay') {
      if (senderUid !== next.hostUid) throw new Error('Ask the host to control the group discussion or replay.')
      if (!next.game || !['debrief', 'gameOver'].includes(next.game.phase)) throw new Error('Finish the game before opening the discussion or replaying.')
      if (action.type === 'question') { const index = number(p.index); if (!Number.isInteger(index) || index < -1 || index > DEBRIEF_QUESTIONS.length) throw new Error('Choose one of the discussion questions.'); next.discussionIndex = index }
      else {
        if (typeof p.sameEvents !== 'boolean') throw new Error('Choose same events or new events.')
        const previous = next.game
        // Players keep the roles they chose for the replay.
        const singlePlayer = previous.players.length === 1
        next.game = createGame(previous.players.map((farmer) => farmer.name), random, { name: previous.council.name, seat: next.councilMode, policy: next.policy, roles: previous.players.map((farmer) => farmer.role), singlePlayer })
        if (p.sameEvents) next.game.events = baseEvents(previous.events)
        next.game = advanceCouncil(next.game); next.learning = { kind: 'howto', index: 0 }; next.savedSeats = []; next.pestDone = []; next.pestEndsAt = null; next.planningEndsAt = null; next.runId++; next.usedFacts=[];next.roundFact=null;next.factRound=0; next.discussionIndex = -1; next.reflections = {}; next.paused = false; next.ended = false
      }
    } else if (action.type === 'reflection') {
      if (!next.game || !['debrief', 'gameOver'].includes(next.game.phase) || next.discussionIndex !== DEBRIEF_QUESTIONS.length) throw new Error('Wait until the group reaches One thing I’ll remember.')
      if (!participant?.seatId || participant.seatId === 'council' || participant.spectator) throw new Error('Only farmers can add an anonymous answer.')
      keys(p, ['answer']); const answer = text(p.answer).trim()
      if (!answer || answer.length > NETWORK_CONFIG.maxReflectionLength) throw new Error(`Write 1–${NETWORK_CONFIG.maxReflectionLength} characters, then Submit.`)
      next.reflections[senderUid] = answer; message = 'Your answer was added anonymously.'
    } else if (['pause', 'resume', 'skipTimer', 'kick', 'replace', 'end'].includes(action.type)) {
      if (senderUid !== next.hostUid) throw new Error('Only the host can use facilitator controls.')
      if (action.type === 'pause') { next.paused = true; next.remainingMs = Math.max(0, (next.pestEndsAt ?? next.planningEndsAt ?? now) - now); next.planningEndsAt = null; next.pestEndsAt = null }
      if (action.type === 'resume') { next.paused = false; if (next.learning.kind === 'grow' && next.learning.index === 1) next.pestEndsAt = now + next.remainingMs; else if (next.game?.phase === 'planning') next.planningEndsAt = now + next.remainingMs }
      if (action.type === 'skipTimer' && next.learning.kind) throw new Error('Finish Grow and the shared cards before skipping planning.')
      if (action.type === 'skipTimer' && next.game?.phase === 'planning') { next.game = finishDecisions(next.game); next.planningEndsAt = null }
      if (action.type === 'end' && next.game) { next.ended = true; next.learning={kind:null,index:0};next.pestEndsAt=null; next.game.endedEarly = true; next.game.phase = 'debrief'; next.planningEndsAt = null }
      if (action.type === 'kick' || action.type === 'replace') {
        const uid = text(p.uid), old = next.participants[uid]
        if (!old || now - old.lastSeen <= NETWORK_CONFIG.hostTimeoutMs) throw new Error('Wait until this player disconnects before replacing them.')
        const seat = old.seatId ?? old.vacatedSeat ?? null; old.vacatedSeat = seat; old.seatId = null; old.spectator = true
        if (action.type === 'replace') { const replacement = next.participants[text(p.replacementUid)]; if (!replacement || replacement.seatId) throw new Error('Ask the replacement phone to join as a spectator first.'); replacement.seatId = seat; replacement.spectator = false; old.vacatedSeat = null; const farm = next.game?.players.find((farmer) => farmer.id === seat); if (farm) farm.name = replacement.name }
      }
    } else if (action.type === 'learningNext' || action.type === 'learningSkip') {
      if (senderUid !== next.hostUid && !participant?.seatId) throw new Error('Join a playing seat to continue the shared cards.')
      if (p.kind !== next.learning.kind || p.index !== next.learning.index) throw new Error('The shared card changed. Follow the card now on screen.')
      // Players vote; the card only moves on once every connected seat is ready. The host can advance for everyone.
      const seated = Object.values(next.participants).filter((person) => person.seatId && now - person.lastSeen <= NETWORK_CONFIG.hostTimeoutMs)
      const votes = next.learningReady ?? {}
      let type = action.type, advance = true
      if (senderUid !== next.hostUid && !next.offline) {
        if (next.learning.kind === 'grow' && next.learning.index === 1) throw new Error('Wait for farmers to protect their crops.')
        votes[senderUid] = action.type === 'learningSkip' ? 'skip' : 'next'; next.learningReady = votes
        const waiting = seated.filter((person) => !votes[person.uid]).length
        if (waiting > 0) { advance = false; message = `Ready. Waiting for ${waiting} more player${waiting === 1 ? '' : 's'}.` }
        else type = seated.every((person) => votes[person.uid] === 'skip') ? 'learningSkip' : 'learningNext'
      }
      if (advance) {
        if (next.learning.kind === 'howto') next.learning = { kind: 'context', index: 0 }
        else if (next.learning.kind === 'context' && type !== 'learningSkip' && next.learning.index < CONTEXT_CARDS.length - 1) next.learning.index++
        else if (next.learning.kind === 'context') next.learning = { kind: 'event', index: 0 }
        else if (next.learning.kind === 'event') next.learning = { kind: 'grow', index: 0 }
        else if (next.learning.kind === 'grow' && next.learning.index === 0) {
          if (next.skipPest) { next.learning = { kind: null, index: 0 }; next.planningEndsAt = next.offline ? null : now + C.planningSeconds * C.millisecondsPerSecond }
          else { next.learning.index = 1; next.pestDone = []; next.pestEndsAt = next.offline ? null : now + C.minigame.durationSec * C.millisecondsPerSecond }
        } else if (next.learning.kind === 'grow') throw new Error('Wait for farmers to protect their crops.')
      }
    } else if (action.type === 'heartbeat') {
      if (participant) participant.lastSeen = now
    } else if (action.type === 'join') {
      if (senderUid === next.hostUid) throw new Error('The host oversees the game. Use another phone to play.')
      keys(p, ['name']); const name = text(p.name).trim()
      if (!name || name.length > NETWORK_CONFIG.maxNameLength) throw new Error('Enter a short name.')
      if (!participant) next.participants[senderUid] = { uid: senderUid, name, seatId: null, spectator: !!next.game, lastSeen: now }
    } else if (action.type === 'claimSeat') {
      keys(p, ['seatId']); if (!participant) throw new Error('Join first.')
      if (next.game) throw new Error('Late joiners can spectate only.')
      const seat = text(p.seatId) as SeatId
      if (![...farmSeats(next.farmerCount), ...(next.councilMode === 'player' ? ['council'] : [])].includes(seat)) throw new Error('Unknown seat.')
      if (Object.values(next.participants).some((entry) => entry.uid !== senderUid && entry.seatId === seat)) throw new Error('That seat is already taken.')
      participant.seatId = seat; participant.spectator = false
      if (seat === 'council') participant.role = null
    } else if (action.type === 'chooseRole') {
      keys(p, ['role']); if (!participant) throw new Error('Join first.')
      if (next.game) throw new Error('Roles are fixed once the game starts.')
      if (!participant.seatId || participant.seatId === 'council') throw new Error('Pick a farm seat before choosing a role.')
      if (!['contract', 'maeTha'].includes(text(p.role))) throw new Error('Choose Company-contract or Mae Tha organic.')
      participant.role = p.role as FarmerRole
    } else if (action.type === 'start') {
      keys(p, ['farmerCount', 'roles']); if (senderUid !== next.hostUid) throw new Error('Only the host can start.')
      if (next.game) throw new Error('Already started.')
      const joined = farmSeats(next.farmerCount).map((seat) => Object.values(next.participants).find((entry) => entry.seatId === seat)).filter((entry) => !!entry)
      const count = p.farmerCount === undefined ? next.farmerCount : number(p.farmerCount)
      const singlePlayer = next.offline && count === 1
      scaledRules(count, singlePlayer)
      let soloRoles: FarmerRole[] | undefined
      if (p.roles !== undefined) {
        if (!singlePlayer || !Array.isArray(p.roles) || p.roles.length !== count || p.roles.some((role) => role !== 'contract' && role !== 'maeTha')) throw new Error('Choose a farmer role for single-player mode.')
        soloRoles = p.roles as FarmerRole[]
      }
      if (count > next.farmerCount || joined.length < count) throw new Error(`Wait for ${count} farmers, or start with the number already joined.`)
      const council = Object.values(next.participants).find((entry) => entry.seatId === 'council')
      if (next.councilMode === 'player' && !council) throw new Error('Ask one phone to take the Council seat.')
      const occupants = joined.slice(0, count)
      // Single player sends its role with Start; group games use the roles chosen in the lobby.
      if (!soloRoles && occupants.some((entry) => !entry.role)) throw new Error('Every farmer must choose a role before starting.')
      const roles = soloRoles ?? occupants.map((entry) => entry.role!)
      if (!singlePlayer && (!roles.includes('contract') || !roles.includes('maeTha'))) throw new Error('Start needs at least one company-contract farmer and one Mae Tha organic farmer.')
      for (const entry of joined) { const index = occupants.indexOf(entry); entry.seatId = index >= 0 ? farmSeats(count)[index] : null; entry.spectator = index < 0 }
      next.farmerCount = count
      next.game = createGame(occupants.map((entry) => entry!.name), random, { name: council?.name ?? 'Automatic Council', seat: next.councilMode, policy: next.policy, roles, singlePlayer })
      next.game = advanceCouncil(next.game); next.learning = { kind: 'howto', index: 0 }; next.planningEndsAt = null
    } else {
      if (!next.game) throw new Error('The game has not started.')
      const game = next.game
      if (next.paused) throw new Error('The host paused the game. Wait for Resume.')
      if (['gameOver', 'debrief'].includes(game.phase)) throw new Error('The game is over.')
      if (action.type === 'resolve' || action.type === 'nextRound') {
        keys(p, []); if (senderUid !== next.hostUid) throw new Error('Only the host can advance.')
        if (action.type === 'resolve') {
          if (game.phase !== 'planning' || next.planningEndsAt === null || now < next.planningEndsAt) throw new Error('Planning time has not ended.')
          next.game = finishDecisions(game); next.planningEndsAt = null
        } else {
          if (game.phase !== 'resolution') throw new Error('The round is not resolved.')
          next.game = advanceRound(game); next.savedSeats = []; next.pestDone = []; next.pestEndsAt = null; if (next.game.phase === 'council') { next.game = advanceCouncil(next.game); next.learning = { kind: 'event', index: 0 }; next.planningEndsAt = null }
        }
      } else {
        if (!participant?.seatId || participant.spectator) throw new Error('Spectators cannot send choices.')
        const seat = participant.seatId
        if (action.type === 'council') {
          keys(p, ['plan']); if (seat !== 'council' || game.phase !== 'council') throw new Error('Only the Council can pick the policy.')
          next.game = advanceCouncil(updateCouncilPlan(game, parseCouncil(p.plan)))
          next.planningEndsAt = null
        } else if (action.type === 'plan') {
          keys(p, ['choice']); if (seat === 'council' || game.phase !== 'planning') throw new Error('Planning is closed.')
          if (!next.offline && (next.planningEndsAt === null || now >= next.planningEndsAt)) throw new Error('Planning time has ended.')
          if (next.learning.kind || next.savedSeats.includes(seat)) throw new Error('Follow the shared card first, or wait for the next round after submitting.')
          next.game = updateDecision(game, seat, parseChoice(p.choice))
          next.savedSeats.push(seat)
          if (next.savedSeats.length === next.farmerCount) { next.game = finishDecisions(next.game); next.planningEndsAt = null }
        } else throw new Error('Unknown action.')
      }
    }
    if (JSON.stringify(next.learning) !== JSON.stringify(model.learning)) next.learningReady = {}
    if(next.game?.resolution && next.factRound !== next.game.round) { next.roundFact = pickRoundFact(next.game.resolution,next.usedFacts); if(next.roundFact) next.usedFacts.push(next.roundFact.id); next.factRound=next.game.round }
    accepted = true; next.revision++; if (action.type !== 'heartbeat') next.seatRevisions[senderUid] = (next.seatRevisions[senderUid] ?? 0) + 1
  } catch (error) { message = error instanceof Error ? error.message : 'Invalid action.' }
  const result = accepted ? next : clone(model)
  const receipt = { actionId: action.id, accepted, message, revision: result.revision }
  result.handled[key] = receipt
  return { model: result, receipt }
}
export function projectRoom(model: RoomModel, receipt?: Publication['receipt'], now = Date.now()): Publication {
  const game = model.game
  const event = game ? currentEvent(game) : null
  const publicRoom: PublicRoom = { policy: model.policy, comparison: game && !game.endedEarly && ['debrief','gameOver'].includes(game.phase) ? comparePolicy(game) : null, roundFact: model.roundFact, offline: model.offline, skipPest: model.skipPest, pestSeed: (model.pestSeed + (game?.round ?? 0)) >>> 0, pestEndsAt: model.pestEndsAt, pestDone: model.pestDone, learningReady: Object.keys(model.learningReady ?? {}), discussionIndex: model.discussionIndex, wordWall: model.discussionIndex === DEBRIEF_QUESTIONS.length ? Object.values(model.reflections) : [], endedEarly: game?.endedEarly ?? false, farmers: game?.players.map((p) => ({ id: p.id, name: p.name, role: p.role, cash: p.cash, goal: p.goal, submitted: model.savedSeats.includes(p.id), connected: Object.values(model.participants).some((person) => person.seatId === p.id && now - person.lastSeen <= NETWORK_CONFIG.hostTimeoutMs) })) ?? [], history: game?.history.map((r) => ({ ...clone(r), event: { kind: r.event.kind, label: r.event.label, price: r.event.price, capacity: r.event.capacity, surcharge: r.event.surcharge, buyersLost: r.event.buyersLost } })) ?? [], learning: model.learning, runId: model.runId, step: model.learning.kind === 'grow' ? 'Grow' : model.learning.kind ? 'Event' : game?.phase === 'planning' ? 'Decide' : game?.phase === 'council' ? 'Council' : 'Reveal', previewFed: game?.resolution ? game.resolution.cityDelivered : game ? model.savedSeats.reduce((sum, id) => sum + previewDecision(game, id, game.decisions[id]).households, 0) : 0, rules: game?.rules ?? scaledRules(model.farmerCount), code: model.code, revision: model.revision, started: !!game, seats: [...farmSeats(model.farmerCount), ...(model.councilMode === 'player' ? ['council' as const] : [])].map((seat) => { const entry = Object.values(model.participants).find((p) => p.seatId === seat); return { id: seat, name: entry?.name ?? (seat === 'council' ? 'Food Council' : `Farm ${seat.slice(1)}`), taken: !!entry, connected: !!entry && now - entry.lastSeen <= NETWORK_CONFIG.hostTimeoutMs, role: entry?.role ?? null } }), round: game?.round ?? 0, phase: game?.phase ?? 'lobby', event: event ? { kind: event.kind, label: event.label, price: event.price, capacity: event.capacity, surcharge: event.surcharge, buyersLost: event.buyersLost } : null, security: game?.citySecurity ?? scaledRules(model.farmerCount).cityStartingSecurity, warehouseUnits: game ? warehouseUnits(game) : 0, reserve: game?.reserve ?? scaledRules(model.farmerCount).warehouseStartingUnits, councilBudget: game?.council.budget ?? scaledRules(model.farmerCount).councilStartingBudget, totalHubUnits: game?.totalHubUnits ?? 0, totalContractsDelivered: game?.totalContractsDelivered ?? 0, crisisWarehouseUnits: game?.crisisWarehouseUnits ?? 0, waste: game?.totalWaste ?? 0, planningEndsAt: model.planningEndsAt, savedSeats: model.savedSeats, paused: model.paused, councilMode: model.councilMode, councilExplanation: game?.council.explanation ?? '', result: game?.resolution ? { ...clone(game.resolution), event: { kind: game.resolution.event.kind, label: game.resolution.event.label, price: game.resolution.event.price, capacity: game.resolution.event.capacity, surcharge: game.resolution.event.surcharge, buyersLost: game.resolution.event.buyersLost } } : null, scores: game ? rankPlayers(game) : [] }
  const privateViews: Record<string, PrivateView> = {}
  for (const participant of Object.values(model.participants)) {
    const farmer = game?.players.find((p) => p.id === participant.seatId)
    privateViews[participant.uid] = { reflection: model.reflections[participant.uid] ?? null, revision: model.revision, seatRevision: model.seatRevisions[participant.uid] ?? 0, participant, player: farmer ?? null, plan: farmer ? game!.plans[farmer.id] : null, choice: farmer ? game!.decisions[farmer.id] : null, previews: farmer ? Object.fromEntries(allowedCards(game!,farmer).map((card) => [card, previewDecision(game!, farmer.id, { card, promise: game!.decisions[farmer.id].promise })])) : {}, options: farmer && game!.phase === 'planning' ? Object.fromEntries(allowedCards(game!,farmer).map((card) => [card, optionOutcome(game!, farmer.id, card)])) : {}, promise: farmer && game!.phase === 'planning' ? promiseOutcome(game!, farmer) : null, hubPrice: game ? hubPrice(game) : 0, organicBuyers: game?.phase === 'planning' ? organicBuyersLeft(game) : 0, crisisHubPrice: C.hubPrices.flood, capacity: game ? transportCapacity(game) : C.farmTransport, available: farmer ? availableHarvest(game!, farmer) : 0, due: farmer ? contractsDue(game!, farmer) : 0, ownStock: farmer ? warehouseUnits(game!, farmer.id) : 0, reserveFree: game ? Math.max(0, game.reserve - game.council.plan.reserveRelease - model.savedSeats.filter((id) => id !== farmer?.id).reduce((s, id) => s + game.plans[id].reserveRelease, 0)) : C.warehouseStartingUnits, canPlan: !model.paused && !model.learning.kind && !model.savedSeats.includes(farmer?.id ?? '') && game?.phase === 'planning' && !!farmer, canCouncil: !model.paused && game?.phase === 'council' && participant.seatId === 'council', council: participant.seatId === 'council' ? game?.council ?? null : null, procurementTargets: participant.seatId === 'council' ? game?.players.map((p) => ({ id: p.id, name: p.name, units: availableHarvest(game, p) })) ?? [] : [] }
  }
  return { model, publicRoom, privateViews, receipt }
}
