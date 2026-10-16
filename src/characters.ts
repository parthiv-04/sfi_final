// Fictional composite farmers. Every detail comes from the facts in learning.ts (agribusiness advances,
// no say over crop or price, Mae Tha's debt-escape founding, mixed crops, the three-year organic
// conversion, off-size vegetables, the COVID income loss). No real person is described.
import type { FarmerRole } from './round2/types'

export interface Profile { name: string; age: number; family: string; shirt: string; situation: (debt: number) => string }
export const PROFILES: Record<FarmerRole, Profile[]> = {
  contract: [
    { name: 'Somchai', age: 45, family: 'married, 2 kids', shirt: '#4aa3df', situation: (d) => `Grows maize with seeds and fertiliser the company advanced; owes the company ${d} crates.` },
    { name: 'Malee', age: 38, family: 'single mother, 1 kid', shirt: '#3b7fc4', situation: (d) => `Has no say over her crop or its price; owes the company ${d} crates.` },
    { name: 'Prasert', age: 52, family: 'married, 3 grown kids', shirt: '#2f6fa8', situation: (d) => `Grows one crop the way the contract requires; owes the company ${d} crates.` },
    { name: 'Ratana', age: 29, family: 'lives with her parents', shirt: '#5bb4e8', situation: (d) => `Signed her first contract after losing income during COVID; owes the company ${d} crates.` },
    { name: 'Wichai', age: 61, family: 'grandfather of 4', shirt: '#2a5d8f', situation: (d) => `Sells his whole harvest back at the fixed price; owes the company ${d} crates.` },
    { name: 'Kanya', age: 34, family: 'married, 2 kids', shirt: '#6cc0f0', situation: (d) => `Repays the company’s advance with produce first; owes the company ${d} crates.` },
  ],
  maeTha: [
    { name: 'Boonmee', age: 57, family: 'married, 2 kids', shirt: '#5cb85c', situation: () => 'Joined Mae Tha to get out of debt; 1st year converting to organic.' },
    { name: 'Sunee', age: 41, family: '3 kids', shirt: '#4a9d4a', situation: () => 'Grows mixed vegetables to keep pests down; 2nd year converting to organic.' },
    { name: 'Anan', age: 33, family: 'married', shirt: '#6cc46c', situation: () => 'Turns off-size vegetables into products; 3rd year converting to organic.' },
    { name: 'Pim', age: 26, family: 'lives with her grandmother', shirt: '#3f8f3f', situation: () => 'Helps the cooperative decide which of 100 crops to grow; 1st year converting to organic.' },
    { name: 'Chai', age: 48, family: 'married, 1 kid', shirt: '#7ad07a', situation: () => 'Left a chemical monoculture behind; 2nd year converting to organic.' },
    { name: 'Nok', age: 39, family: 'single mother, 2 kids', shirt: '#56a856', situation: () => 'Pays for the organic certificate every round; 3rd year converting to organic.' },
  ],
}
export const COMPOSITE_NOTE = 'Fictional composite based on our fieldwork facts.'
export function profileFor(role: FarmerRole, index: number | undefined, name?: string): Profile {
  const profile = PROFILES[role][(index ?? 0) % PROFILES[role].length]
  return name?.trim() ? { ...profile, name: name.trim() } : profile
}

export interface DestinyInput {
  role: FarmerRole; profile?: number; name?: string; cash: number; goal: number; debt: number; certificatePaid: number; soilLost: number
  cityLostRound: number | null // round the city went hungry, or null if it survived
  rounds: { round: number; kind: string; debtAfter?: number; fed: number }[]
}
/** One-paragraph ending picked from 5–6 templates per role, using final cash, debt and the city result. */
export function destiny(d: DestinyInput): string {
  const name = profileFor(d.role, d.profile, d.name).name
  const fed = d.rounds.reduce((s, r) => s + r.fed, 0)
  if (d.role === 'contract') {
    // Each round's advance is normally repaid that round; a debt that carries over is the trap.
    const carried = d.rounds.findIndex((r) => (r.debtAfter ?? 0) > 0)
    const paidOff = carried >= 0 ? d.rounds.slice(carried).find((r) => r.debtAfter === 0) : undefined
    const flood = d.rounds.find((r) => r.kind === 'flood' && (r.debtAfter ?? 0) > 0)
    if (d.cityLostRound !== null) return `The city went hungry in round ${d.cityLostRound}. ${name} kept selling to the company and finished with $${d.cash}, still owing ${d.debt} crates, but nobody wins when the city goes hungry.`
    if (flood && d.debt > 0) return `${name}’s debt grew after the flood in round ${flood.round}: half a harvest could not cover the company’s advance. ${name} ended with $${d.cash} and owes ${d.debt} crates going into next season.`
    if (paidOff) return `${name} fell behind, then paid off the company in round ${paidOff.round}, ending with $${d.cash}. Next season the company advances seeds again, and the debt starts over.`
    if (d.debt === 0 && d.cash >= d.goal) return `${name} repaid every advance with produce and reached the cash goal with $${d.cash}. The fixed price paid on time, but next season starts with a new debt.`
    if (d.debt === 0) return `${name} repaid every advance with produce but ended with $${d.cash}, short of the $${d.goal} goal. The fixed price never left much over.`
    return `${name} still owes the company ${d.debt} crates. With $${d.cash}, signing next season’s contract is the only way to get seeds.`
  }
  if (d.cityLostRound !== null) return `The city went hungry in round ${d.cityLostRound}. ${name}’s organic farm survived with $${d.cash}, but nobody wins when the city goes hungry.`
  if (d.cash >= d.goal && fed > 0) return `${name}’s soil recovered and the cooperative’s buyers came through: $${d.cash}, and ${fed} households fed along the way. Organic paid off.`
  if (d.cash >= d.goal) return `${name} reached the cash goal with $${d.cash} by selling organic produce, but fed no households directly this season.`
  if (fed > 0) return `${name} fed ${fed} households through the community hub but ended with $${d.cash}, short of the $${d.goal} goal. The certificate alone cost $${d.certificatePaid} this season.`
  return `${name} paid $${d.certificatePaid} for the organic certificate and lost ${d.soilLost} crates to soil recovery. With $${d.cash}, the conversion has not paid off yet.`
}
