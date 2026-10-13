import type { InfoCard } from '../learning'
import type { FarmerRole, PolicyScenario, PolicyComparison, CouncilPlan, Decision, DecisionPreview, PlanCard, GameState, Player, PlayerScore, Resolution, TurnPlan } from '../round2/types'
import { ROUND2_CONFIG as C } from '../round2/config'
export type FarmSeat = `p${number}`
export const farmSeats = (n: number): FarmSeat[] => Array.from({ length: n }, (_, i) => `p${i + 1}` as FarmSeat)
export const FARM_SEATS = farmSeats(C.maxPlayers)
export type SeatId = FarmSeat | 'council'
export type ActionType = 'join' | 'claimSeat' | 'start' | 'plan' | 'council' | 'resolve' | 'nextRound' | 'pause' | 'resume' | 'skipTimer' | 'kick' | 'replace' | 'end' | 'heartbeat' | 'learningNext' | 'learningSkip' | 'question' | 'reflection' | 'replay' | 'settings' | 'pest' | 'growFinish' | 'growSkip' | 'chooseRole'
export interface ClientAction { id: string; actorUid: string; revision: number; round?: number; seatRevision?: number; type: ActionType; payload: unknown }
export interface ActionReceipt { actionId: string; accepted: boolean; message: string; revision: number }
export interface Participant { uid: string; name: string; seatId: SeatId | null; spectator: boolean; lastSeen: number; vacatedSeat?: SeatId | null; role?: FarmerRole | null }
export interface LearningState { kind: 'howto' | 'context' | 'event' | 'grow' | null; index: number }
export interface RoomModel { policy: PolicyScenario; usedFacts: string[]; roundFact: InfoCard | null; factRound: number; skipPest: boolean; pestSeed: number; pestEndsAt: number | null; pestDone: string[]; discussionIndex: number; reflections: Record<string, string>; offline: boolean; learning: LearningState; runId: number; version: number; farmerCount: number; code: string; hostUid: string; councilMode: 'player' | 'automatic'; revision: number; participants: Record<string, Participant>; game: GameState | null; handled: Record<string, ActionReceipt>; seatRevisions: Record<string, number>; planningEndsAt: number | null; savedSeats: string[]; paused: boolean; remainingMs: number; ended: boolean }
export interface PublicSeat { id: SeatId; name: string; taken: boolean; connected: boolean; role: FarmerRole | null }
export interface PublicFarmer { id: string; name: string; cash: number; goal: number; submitted: boolean; connected: boolean }
export interface PublicRoom { policy: PolicyScenario; comparison: PolicyComparison | null; roundFact: InfoCard | null; offline: boolean; skipPest: boolean; pestSeed: number; pestEndsAt: number | null; pestDone: string[]; discussionIndex: number; wordWall: string[]; farmers: PublicFarmer[]; history: Resolution[]; endedEarly: boolean; learning: LearningState; runId: number; step: string; previewFed: number; rules: GameState['rules']; code: string; revision: number; started: boolean; seats: PublicSeat[]; round: number; phase: GameState['phase'] | 'lobby'; event: Omit<GameState['events'][number], 'forecastHits'> | null; security: number; warehouseUnits: number; reserve: number; councilBudget: number; totalHubUnits: number; totalContractsDelivered: number; crisisWarehouseUnits: number; waste: number; planningEndsAt: number | null; savedSeats: string[]; paused: boolean; councilMode: RoomModel['councilMode']; councilExplanation: string; result: Resolution | null; scores: PlayerScore[] }
export interface PrivateView { reflection: string | null; revision: number; seatRevision: number; participant: Participant; player: Player | null; plan: TurnPlan | null; choice: Decision | null; previews: Partial<Record<PlanCard, DecisionPreview>>; capacity: number; available: number; due: number; ownStock: number; reserveFree: number; canPlan: boolean; canCouncil: boolean; council: GameState['council'] | null; procurementTargets: { id: string; name: string; units: number }[] }
export interface Publication { expectedRevision?: number; model: RoomModel; publicRoom: PublicRoom; privateViews: Record<string, PrivateView>; receipt?: { uid: string; value: ActionReceipt } }
export interface Presence { online: boolean; lastSeen: number; clientId: string }
export interface RealtimeService {
  readonly uid: string; readonly clientId: string
  createRoom(model: RoomModel, publication: Publication): Promise<void>
  resumeHost(code: string): Promise<RoomModel>
  publish(code: string, publication: Publication): Promise<void>
  watchActions(code: string, callback: (senderUid: string, action: ClientAction) => void, onError: (error: Error) => void): () => void
  watchPublic(code: string, callback: (room: PublicRoom | null) => void, onError: (error: Error) => void): () => void
  watchPrivate(code: string, callback: (view: PrivateView | null) => void, onError: (error: Error) => void): () => void
  watchPresence(code: string, callback: (presence: Presence | null) => void, onError: (error: Error) => void): () => void
  watchConnection(callback: (online: boolean) => void): () => void
  watchReceipts(code: string, callback: (receipt: ActionReceipt) => void, onError: (error: Error) => void): () => void
  sendAction(code: string, action: ClientAction): Promise<void>
  startHostPresence(code: string, onError: (error: Error) => void): Promise<() => void>
}
export type CouncilDraft = CouncilPlan
