export const ROUND2_CONFIG = {
  playerCount: 5,
  policies: {
    A: { closureHubFraction: 0.2, closureHospitalFraction: 0.5 },
    B: { certificateCost: 0, soilRecoveryFraction: 0.75, organicBuyerCapPerFarmer: 0.9 },
    C: { startingReserveBonusPerFarmer: 0.2, reserveGrowthPerRound: 1 },
  },
  contractFarmerFraction: 0.4,
  companyHarvest: 2.5,
  companyAdvance: 1.25,
  companyPrice: 3,
  soilRecoveryFraction: 0.5,
  organicCertificateCost: 2,
  organicPricePremium: 1,
  organicBuyerCapPerFarmer: 0.6,
  hubPrices: { normal: 1, festival: 1, warning: 1, flood: 2, marketClosure: 2 },
  minigame: {
    durationSec: 10, plants: 5, fieldWidthPx: 320, fieldHeightPx: 300, plantBandPx: 44,
    spray: { spawnIntervalSec: 1.6, fallSpeedPx: 90, sprayRadiusPx: 70 },
    hand: { spawnIntervalSec: 1, fallSpeedPx: 120, hitboxPx: 48 },
  },
  minPlayers: 3,
  maxPlayers: 8,
  scaling: { cityNeed: 1, crisisNeed: 1.5, startingSecurity: 2.1, maximumSecurity: 2.8, reserve: 1.25, councilBudget: 7 },
  marketShares: { normal: 1.2, festival: 2, flood: 0.8, marketClosure: 0, warning: 1.2 },
  rounds: 5,
  startingCash: 18,
  personalGoalBonus: 8,
  harvestPerFarm: 2,
  shareDivisor: 1.25,
  floodHarvestFraction: 0.5,
  farmTransport: 3,
  floodTransportFraction: 0.5,
  maxContractUnits: 1,
  contractPrice: 3,
  crisisContractArrivalFraction: 0.5,
  warehouseStartingUnits: 6,
  warehouseCostPerUnit: 1,
  warehouseDecayFraction: 0.25,
  hubPrice: 2,
  councilStartingBudget: 30,
  policyMaxUnits: 4,
  prePositionPrice: 1,
  procurementPrice: 3,
  extraTruckCapacity: 4,
  extraTruckCost: 6,
  cityStartingSecurity: 8.5,
  cityMaxSecurity: 11.5,
  cityNeed: 5,
  cityCrisisNeed: 8,
  cityRecovery: 0.85,
  lowSecurityFraction: 0.25,
  cityLossPerShortUnit: 1,
  // Feedback loops (milestone 10).
  loops: {
    lowSecurityFraction: 0.4, // security below 40% of max at the end of a round...
    lowSecurityPriceRise: 1, // ...raises next round's market price by $1...
    buyersLostPerDollarPerFarmer: 0.2, // ...and each $1 above normal costs this many market buyers per farmer.
    crisisShareFraction: 0.5, // at least half the farms Share or Release in a crisis...
    trustBudgetPerFarmer: 1, // ...adds $1 per farmer to next round's Council budget.
  },
  eventForecastAccuracy: 0.6,
  planningSeconds: 60,
  quantityPrecision: 100,
  routeInputStep: 0.5,
  timerTickMs: 250,
  millisecondsPerSecond: 1000,
  revealStepMs: 2000,
  revealSteps: 7,
  revealStage: { event: 0, market: 1, contract: 2, warehouse: 3, hub: 4, households: 5, security: 6 },
  meterAnimationMs: 700,
  eventCopies: { normal: 3, festival: 1, flood: 1, marketClosure: 1, warning: 2 },
  events: {
    normal: { label: 'Normal week', price: 4, capacity: 6 },
    festival: { label: 'Festival', price: 6, capacity: 10 },
    flood: { label: 'Flood', price: 5, capacity: 4 },
    marketClosure: { label: 'Market closure', price: 0, capacity: 0 },
    warning: { label: 'Forecast: flood likely next round (not certain)', price: 4, capacity: 6 },
  },
} as const

export function scaledRules(n: number, singlePlayer = false) {
  const minimum = singlePlayer ? 1 : ROUND2_CONFIG.minPlayers
  if (!Number.isInteger(n) || n < minimum || n > ROUND2_CONFIG.maxPlayers) throw new Error(`Choose ${minimum}–${ROUND2_CONFIG.maxPlayers} farmers.`)
  const m = ROUND2_CONFIG.scaling
  return { playerCount: n, cityNeed: n * m.cityNeed, cityCrisisNeed: Math.ceil(n * m.crisisNeed), cityStartingSecurity: Math.round(n * m.startingSecurity * ROUND2_CONFIG.quantityPrecision) / ROUND2_CONFIG.quantityPrecision, cityMaxSecurity: Math.round(n * m.maximumSecurity * ROUND2_CONFIG.quantityPrecision) / ROUND2_CONFIG.quantityPrecision, warehouseStartingUnits: Math.ceil(n * m.reserve), councilStartingBudget: n * m.councilBudget }
}
