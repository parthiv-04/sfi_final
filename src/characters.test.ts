import { describe, expect, it } from 'vitest'
import { COMPOSITE_NOTE, destiny, PROFILES, type DestinyInput } from './characters'
import { advanceCouncil, createGame, finishDecisions } from './round2/engine'
import { makeRng } from './round2/rng'

const base = (patch: Partial<DestinyInput>): DestinyInput => ({ role: 'contract', profile: 0, cash: 90, goal: 104, debt: 0, certificatePaid: 0, soilLost: 0, cityLostRound: null, rounds: [], ...patch })
const r = (round: number, kind: string, debtAfter: number | undefined, fed = 0) => ({ round, kind, debtAfter, fed })

describe('character profiles', () => {
  it('has six fictional composite profiles per role with age, family and a starting situation', () => {
    for (const role of ['contract', 'maeTha'] as const) {
      expect(PROFILES[role]).toHaveLength(6)
      expect(new Set(PROFILES[role].map((p) => p.name)).size).toBe(6)
      for (const p of PROFILES[role]) { expect(p.age).toBeGreaterThan(0); expect(p.family).toBeTruthy(); expect(p.situation(5)).toBeTruthy() }
    }
    expect(PROFILES.contract[0].situation(5)).toContain('owes the company 5 crates')
    expect(PROFILES.maeTha.every((p) => /year converting to organic/.test(p.situation(0)))).toBe(true)
    expect(COMPOSITE_NOTE).toMatch(/fictional composite/i)
  })
  it('deals distinct profiles within each role, deterministically', () => {
    const roles = ['contract', 'contract', 'maeTha', 'maeTha', 'maeTha'] as const
    const a = createGame(roles.map((_, i) => `F${i}`), makeRng(4), { roles: [...roles] }), b = createGame(roles.map((_, i) => `F${i}`), makeRng(4), { roles: [...roles] })
    expect(a.players.map((p) => p.profile)).toEqual(b.players.map((p) => p.profile))
    for (const role of ['contract', 'maeTha']) { const dealt = a.players.filter((p) => p.role === role).map((p) => p.profile); expect(new Set(dealt).size).toBe(dealt.length) }
  })
  it('records each contract farmer’s debt after every round', () => {
    const state = finishDecisions(advanceCouncil(createGame(['A', 'B', 'C'], makeRng(2), { seat: 'automatic', roles: ['contract', 'maeTha', 'maeTha'] })))
    expect(state.resolution!.lines[0].debtAfter).toBe(state.players[0].companyDebt)
    expect(state.resolution!.lines[1].debtAfter).toBeUndefined()
  })
})

describe('destinies', () => {
  it('chooses a contract ending from the city result, debt history and cash', () => {
    expect(destiny(base({ cityLostRound: 3, debt: 5 }))).toMatch(/went hungry in round 3/)
    expect(destiny(base({ debt: 5, rounds: [r(1, 'normal', 0), r(2, 'flood', 5)] }))).toMatch(/debt grew after the flood in round 2/)
    expect(destiny(base({ rounds: [r(1, 'flood', 5), r(2, 'normal', 0)] }))).toMatch(/paid off the company in round 2/)
    expect(destiny(base({ cash: 110, rounds: [r(1, 'normal', 0)] }))).toMatch(/reached the cash goal with \$110/)
    expect(destiny(base({ rounds: [r(1, 'normal', 0)] }))).toMatch(/short of the \$104 goal/)
    expect(destiny(base({ debt: 5, rounds: [r(1, 'normal', 0)] }))).toMatch(/still owes the company 5 crates/)
  })
  it('chooses a Mae Tha ending from the city result, cash and households fed', () => {
    const mae = (patch: Partial<DestinyInput>) => destiny(base({ role: 'maeTha', certificatePaid: 40, soilLost: 4, ...patch }))
    expect(mae({ cityLostRound: 4 })).toMatch(/went hungry in round 4/)
    expect(mae({ cash: 120, rounds: [r(1, 'normal', undefined, 6)] })).toMatch(/Organic paid off/)
    expect(mae({ cash: 120 })).toMatch(/fed no households/)
    expect(mae({ rounds: [r(1, 'normal', undefined, 6)] })).toMatch(/fed 6 households.*certificate alone cost \$40/)
    expect(mae({})).toMatch(/paid \$40 for the organic certificate and lost 4 crates/)
  })
})
