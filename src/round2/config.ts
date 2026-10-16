// Food is counted in whole crates (4 per original unit) and money in whole dollars; fixed dollar amounts scale with it.
export const ROUND2_CONFIG = {
  playerCount: 5,
  policies: {
    A: { closureHubFraction: 0.2, closureHospitalFraction: 0.5 },
    B: { certificateCost: 0, soilRecoveryFraction: 0.75, organicBuyerCapPerFarmer: 4.4 },
    C: { startingReserveBonusPerFarmer: 0.8, reserveGrowthPerRound: 4 },
  },
  contractFarmerFraction: 0.4,
  companyHarvest: 10,
  companyAdvance: 5,
  companyPrice: 3,
  councilContribution: 4,
  soilRecoveryFraction: 0.5,
  organicCertificateCost: 8,
  organicPricePremium: 1,
  organicBuyerCapPerFarmer: 3.2, // organic shoppers per farmer before price walk-offs
  hubPrices: { normal: 1, festival: 1, warning: 1, flood: 2, marketClosure: 2 },
  minigame: {
    durationSec: 10, plants: 5, fieldWidthPx: 320, fieldHeightPx: 300, plantBandPx: 44,
    spray: { spawnIntervalSec: 1.6, fallSpeedPx: 90, sprayRadiusPx: 70 },
    hand: { spawnIntervalSec: 1, fallSpeedPx: 120, hitboxPx: 48 },
  },
  minPlayers: 3,
  maxPlayers: 8,
  scaling: { cityNeed: 4, crisisNeed: 6, startingSecurity: 8.4, maximumSecurity: 11.2, reserve: 5, councilBudget: 28 },
  marketShares: { normal: 4.8, festival: 8, flood: 3.2, marketClosure: 0, warning: 4.8 },
  rounds: 5,
  startingCash: 72,
  personalGoalBonus: 32,
  harvestPerFarm: 8,
  shareDivisor: 1.25,
  // Share and storage decay round in lots of this many crates (one original unit), as before the crate rescale.
  roundingLot: 4,
  floodHarvestFraction: 0.5,
  farmTransport: 12,
  floodTransportFraction: 0.5,
  maxContractUnits: 4,
  contractPrice: 3,
  crisisContractArrivalFraction: 0.5,
  warehouseStartingUnits: 24,
  warehouseCostPerUnit: 1,
  warehouseDecayFraction: 0.25,
  hubPrice: 2,
  councilStartingBudget: 120,
  policyMaxUnits: 16,
  prePositionPrice: 1,
  procurementPrice: 3,
  extraTruckCapacity: 16,
  extraTruckCost: 24,
  cityStartingSecurity: 34,
  cityMaxSecurity: 46,
  cityNeed: 20,
  cityCrisisNeed: 32,
  cityRecovery: 3.4,
  lowSecurityFraction: 0.25,
  cityLossPerShortUnit: 1,
  // Shoppers react to price (milestone 11). Walk-offs are whole shoppers; each would have bought one crate.
  shoppers: {
    normalPrice: 4, // the everyday market price; dearer weeks lose shoppers
    walkOffsPerDollarPerFarmer: 0.8, // per $1 above normal, this many shoppers per farmer say "Why is it so high?" and leave
    organicWalkOffsPerFarmer: 0.8, // the organic premium turns this many organic shoppers per farmer away every open-market week
  },
  // Feedback loops (milestone 10).
  loops: {
    lowSecurityFraction: 0.4, // security below 40% of max at the end of a round...
    lowSecurityPriceRise: 1, // ...raises next round's market price by $1...
    crisisShareFraction: 0.5, // at least half the farms Share or Release in a crisis...
    trustBudgetPerFarmer: 4, // ...adds $1 per farmer to next round's Council budget.
  },
  eventForecastAccuracy: 0.6,
  planningSeconds: 60,
  quantityPrecision: 100,
  routeInputStep: 1,
  timerTickMs: 250,
  millisecondsPerSecond: 1000,
  revealStepMs: 2000,
  revealSteps: 7,
  revealCardMs: 5000,
  revealStage: { event: 0, market: 1, contract: 2, warehouse: 3, hub: 4, households: 5, security: 6 },
  meterAnimationMs: 700,
  eventCopies: { normal: 3, festival: 1, flood: 1, marketClosure: 1, warning: 2 },
  events: {
    normal: { label: 'Normal week', price: 4, capacity: 24 },
    festival: { label: 'Festival', price: 6, capacity: 40 },
    flood: { label: 'Flood', price: 5, capacity: 16 },
    marketClosure: { label: 'Market closure', price: 0, capacity: 0 },
    warning: { label: 'Forecast: flood likely next round (not certain)', price: 4, capacity: 24 },
  },
} as const

/** City food security as a whole-number % of people with access to food. */
export const accessPercent = (security: number, max: number) => Math.round(security / max * 100)
/** Round a total up to whole lots of crates, matching the original whole-unit rounding. */
export const roundUpToLot = (crates: number) => ROUND2_CONFIG.roundingLot * Math.ceil(crates / ROUND2_CONFIG.roundingLot - 1e-9)
export function scaledRules(n: number, singlePlayer = false) {
  const minimum = singlePlayer ? 1 : ROUND2_CONFIG.minPlayers
  if (!Number.isInteger(n) || n < minimum || n > ROUND2_CONFIG.maxPlayers) throw new Error(`Choose ${minimum}–${ROUND2_CONFIG.maxPlayers} farmers.`)
  const m = ROUND2_CONFIG.scaling
  return { playerCount: n, cityNeed: n * m.cityNeed, cityCrisisNeed: roundUpToLot(n * m.crisisNeed), cityStartingSecurity: Math.round(n * m.startingSecurity * ROUND2_CONFIG.quantityPrecision) / ROUND2_CONFIG.quantityPrecision, cityMaxSecurity: Math.round(n * m.maximumSecurity * ROUND2_CONFIG.quantityPrecision) / ROUND2_CONFIG.quantityPrecision, warehouseStartingUnits: roundUpToLot(n * m.reserve), councilStartingBudget: n * m.councilBudget }
}
