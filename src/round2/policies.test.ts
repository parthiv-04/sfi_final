import { expect, it } from 'vitest'
import { ROUND2_CONFIG as C } from './config'
import { baseEvents, advanceCouncil, advanceRound, applyPestLoss, canPromise, comparePolicy, createGame, finishDecisions, allowedCards, policyMetrics, replayUnderNone, updateDecision } from './engine'
import { makeRng } from './rng'
import type { PolicyScenario } from './types'
const names=['Company','Mae Tha 1','Mae Tha 2']
const setup=(policy:PolicyScenario)=>createGame(names,makeRng(11),{seat:'automatic',policy,roles:['contract','maeTha','maeTha']})
it('company farmers can only sell to the company under every policy',()=>{
 for(const policy of ['none','A','B','C'] as const){
  const s=advanceCouncil(setup(policy)),p=s.players[0]
  expect(allowedCards(s,p)).toEqual(['sell']);expect(canPromise(s,p)).toBe(false)
  expect(()=>updateDecision(s,p.id,{card:'share',promise:false})).toThrow()
 }
})
it('A sends company produce through crisis channels instead of counting it as rotten',()=>{
 const resolve=(policy:PolicyScenario)=>{const s=setup(policy);s.events[0]={kind:'marketClosure',...C.events.marketClosure};return finishDecisions(advanceCouncil(s))}
 const a=resolve('A'),none=resolve('none');expect(a.resolution!.lines[0].companyRotten).toBe(0)
 expect(none.resolution!.lines[0].companyRotten).toBe(C.companyHarvest)
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
 expect(s.reserve).toBe(s.rules.warehouseStartingUnits+Math.round(s.players.length*C.policies.C.startingReserveBonusPerFarmer))
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
it('compares a Policy A game against None and keeps the cohort unchanged',()=>{
 let s=advanceCouncil(setup('A'))
 for(const p of s.players)s=updateDecision(s,p.id,{card:p.role==='contract'?'sell':'share',promise:canPromise(s,p)})
 s=finishDecisions(s);const original=structuredClone(s)
 expect(()=>comparePolicy(s)).not.toThrow();expect(s).toEqual(original)
})
it('puts both a flood and a market closure in every five-round deck, with forecasts still consistent',()=>{
 for(const n of [3,5,8]) for(let seed=1;seed<=500;seed++){
  const played=createGame(Array.from({length:n},(_,i)=>`F${i}`),makeRng(seed),{seat:'automatic'}).events.slice(0,C.rounds)
  expect(played.some(e=>e.kind==='flood')).toBe(true);expect(played.some(e=>e.kind==='marketClosure')).toBe(true)
  for(let i=0;i<C.rounds-1;i++) if(played[i].kind==='warning') expect(played[i+1].kind==='flood').toBe(played[i].forecastHits)
 }
})
it('replays the policy comparison on the identical event sequence',()=>{
 let s=setup('C')
 while(s.phase!=='debrief' && s.phase!=='gameOver'){
  s=advanceCouncil(s)
  for(const p of s.players)s=updateDecision(s,p.id,{card:p.role==='contract'?'sell':'share',promise:canPromise(s,p)&&s.round<C.rounds})
  s=finishDecisions(s);if(s.phase==='gameOver')break;s=advanceRound(s)
 }
 const baseline=replayUnderNone(s)
 expect(baseEvents(baseline.events)).toEqual(baseEvents(s.events))
 expect(baseline.history.map(r=>r.event.kind)).toEqual(s.history.map(r=>r.event.kind).slice(0,baseline.history.length))
})
