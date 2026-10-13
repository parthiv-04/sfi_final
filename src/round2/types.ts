import type { scaledRules } from './config'
export type EventKind = 'normal' | 'festival' | 'flood' | 'marketClosure' | 'warning'
export type Phase = 'council' | 'planning' | 'resolution' | 'debrief' | 'gameOver'
export interface EventCard { kind: EventKind; label: string; price: number; capacity: number; forecastHits?: boolean }
export interface Contract { quantity: number; dueRound: number }
export type PolicyScenario = 'none' | 'A' | 'B' | 'C'
export interface DecisionRecord { round: number; choices: Record<string, Decision>; pests: Record<string, number>; council: CouncilPlan }
export interface PolicyMetrics { shortageRounds: number; finalSecurity: number; contractCash: number; contractDebt: number; maeThaProfit: number; waste: number }
export interface PolicyComparison { policy: PolicyScenario; baseline: PolicyMetrics; actual: PolicyMetrics; fewerShortageRounds: number; rounds: number }
export type FarmerRole = 'contract' | 'maeTha'
export interface Player { role: FarmerRole; companyDebt: number; id: string; name: string; cash: number; goal: number; harvest: number; contracts: Contract[]; waste: number }
export interface TurnPlan { marketUnits: number; hubUnits: number; storeUnits: number; warehouseRelease: number; reserveRelease: number; contractQuantity: number }
export interface WarehouseLot { ownerId: string; units: number; depositedRound: number }
export type CouncilPolicy = 'none' | 'prePosition' | 'procurement' | 'extraTrucks' | 'automatic'
export interface CouncilPlan { policy: CouncilPolicy; quantity: number; farmerId: string; reserveRelease: number }
export interface CouncilState { name: string; seat: 'player' | 'automatic'; budget: number; spent: number; explanation: string; plan: CouncilPlan }
export interface ResolutionLine { companyUnits: number; companySold: number; companyRotten: number; certificateCost: number; playerId: string; harvest: number; contractUnits: number; contractShortfall: number; marketUnits: number; hubUnits: number; warehouseReleased: number; reserveReleased: number; stored: number; spoilage: number; decay: number; storageCost: number; revenue: number; transportUsed: number; transportCapacity: number }
export interface Resolution { round: number; event: EventCard; lines: ResolutionLine[]; councilReserveReleased: number; contractsDelivered: number; hubDelivered: number; cityDelivered: number; cityNeed: number; crisisHubNeed: number; crisisHubShortfall: number; shortfall: number; securityBefore: number; securityAfter: number; councilSpent: number; waste: number }
export interface PlayerScore { playerId: string; name: string; cash: number; goal: number; won: boolean; rank: number }
export interface GameState { policy: PolicyScenario; decisionHistory: DecisionRecord[]; pestResults: Record<string, number>; mixedRoles: boolean; rules: ReturnType<typeof scaledRules>; history: Resolution[]; endedEarly: boolean; round: number; phase: Phase; players: Player[]; plans: Record<string, TurnPlan>; decisions: Record<string, Decision>; ready: string[]; activePlayerIndex: number; events: EventCard[]; warehouse: WarehouseLot[]; reserve: number; council: CouncilState; citySecurity: number; totalHubUnits: number; totalContractsDelivered: number; crisisWarehouseUnits: number; totalWaste: number; resolution: Resolution | null }

export type PlanCard = 'sell' | 'share' | 'store' | 'release'
export interface Decision { card: PlanCard; promise: boolean }
/** Exact effect of one option this round. Market cash assumes every offered unit sells; marketUnits says how many that is. */
export interface OptionOutcome { cash: number; households: number; marketUnits: number; hubUnits: number; stored: number; released: number; fees: number; hubPlanned: number; unmoved: number; nextRound?: { cash: number; households: number; crisisCash: number; crisisHouseholds: number } }
export interface DecisionPreview { cashMin: number; cashMax: number; households: number; moves: number; stored: number; limited: boolean }
