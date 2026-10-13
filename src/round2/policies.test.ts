import { expect, it } from 'vitest'
import { ROUND2_CONFIG as C } from './config'
import { advanceCouncil, advanceRound, applyPestLoss, canPromise, comparePolicy, createGame, finishDecisions, allowedCards, policyMetrics, updateDecision } from './engine'
import { makeRng } from './rng'
import type { PolicyScenario } from './types'
const names=['Company','Mae Tha 1','Mae Tha 2']
const setup=(policy:PolicyScenario)=>createGame(names,makeRng(11),{seat:'automatic',policy,roles:['contract','maeTha','maeTha']})
it('A opens limited school promises and repeated kitchen shares for company farmers',()=>{
 const s=advanceCouncil(setup('A')),p=s.players[0];p.communityGiftUsed=true
 expect(canPromise(s,p)).toBe(true);expect(allowedCards(s,p)).toContain('share')
 expect(updateDecision(s,p.id,{card:'share',promise:true}).plans[p.id].contractQuantity).toBe(C.policies.A.maxCompanySchoolPromise)
 const n=advanceCouncil(setup('none'));n.players[0].communityGiftUsed=true
 expect(canPromise(n,n.players[0])).toBe(false);expect(allowedCards(n,n.players[0])).not.toContain('share')
})
it('A sends company produce through crisis channels instead of counting it as rotten',()=>{
 const resolve=(policy:PolicyScenario)=>{const s=setup(policy);s.events[0]={kind:'marketClosure',...C.events.marketClosure};return finishDecisions(advanceCouncil(s))}
 const a=resolve('A'),none=resolve('none');expect(a.resolution!.lines[0].companyRotten).toBe(0)
 expect(none.resolution!.lines[0].companyRotten).toBe(C.companyAdvance)
 expect(a.resolution!.lines[0].hubUnits).toBeGreaterThan(0)
 expect(a.totalWaste).toBeLessThan(none.totalWaste)
})
it('B removes certification, recovers 75% harvest and expands pooled organic demand',()=>{
 const b=setup('B'),none=setup('none')
 expect(b.players[1].harvest).toBe(C.harvestPerFarm*C.policies.B.soilRecoveryFraction)
 expect(none.players[1].harvest).toBe(C.harvestPerFarm*C.soilRecoveryFraction)
 const r=finishDecisions(advanceCouncil(b));expect(r.resolution!.lines[1].certificateCost).toBe(0)
 expect(C.policies.B.organicBuyerCapPerFarmer).toBeGreaterThan(C.organicBuyerCapPerFarmer)
})
it('C grows reserve each round and releases it automatically even with a human Council and no budget',()=>{
 const s=setup('C');s.council.seat='player';s.council.budget=0;s.events[0]={kind:'flood',...C.events.flood}
 expect(s.reserve).toBe(s.rules.warehouseStartingUnits+s.players.length*C.policies.C.startingReserveBonusPerFarmer)
 const start=s.reserve;let r=advanceCouncil(s);r=finishDecisions(r);r=advanceCouncil(r)
 expect(r.resolution!.councilReserveReleased).toBeGreaterThan(0);expect(r.reserve).toBeLessThan(start);expect(r.council.budget).toBe(0)
 const after=r.reserve;r=advanceRound(r);expect(r.reserve).toBe(after+C.policies.C.reserveGrowthPerRound)
})
it('replays None with identical roles, recorded choices and crop losses without mutation',()=>{
 let s=setup('none');s.events=s.events.map(e=>({...e,kind:'normal',...C.events.normal}))
 while(s.phase!=='debrief' && s.phase!=='gameOver'){
   s=advanceCouncil(s);s=applyPestLoss(s,'p1',1)
   for(const p of s.players)s=updateDecision(s,p.id,{card:'sell',promise:canPromise(s,p)&&s.round<C.rounds})
   s=advanceRound(finishDecisions(s))
 }
 const original=structuredClone(s),comparison=comparePolicy(s)
 expect(comparison.actual).toEqual(policyMetrics(s));expect(comparison.baseline).toEqual(comparison.actual)
 expect(comparison.fewerShortageRounds).toBe(0);expect(s).toEqual(original)
})
it('compares policy-only choices by legal fallback and keeps the cohort unchanged',()=>{
 let s=advanceCouncil(setup('A'))
 for(const p of s.players)s=updateDecision(s,p.id,{card:'share',promise:true})
 s=finishDecisions(s);const original=structuredClone(s)
 expect(()=>comparePolicy(s)).not.toThrow();expect(s).toEqual(original)
})
