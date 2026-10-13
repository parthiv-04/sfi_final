import { expect, it } from 'vitest'
import { ROUND2_CONFIG as C } from './config'
import { advanceCouncil, advanceRound, allowedCards, createGame, finishDecisions, updateDecision } from './engine'
import { makeRng } from './rng'
function roleGame(kind: 'normal'|'flood'|'marketClosure' = 'normal') {const s=createGame(['A','B','C','D','E'],makeRng(10),{seat:'automatic'}); s.events[0]={kind,...C.events[kind]};return advanceCouncil(s)}
it('deals reproducible mixed roles and halves first-round Mae Tha harvest',()=>{
 const a=roleGame(),b=roleGame();expect(a).toEqual(b)
 expect(a.players.filter(p=>p.role==='contract')).toHaveLength(Math.round(a.players.length*C.contractFarmerFraction))
 expect(a.players.find(p=>p.role==='maeTha')!.harvest).toBe(C.harvestPerFarm*C.soilRecoveryFraction)
 expect(a.players.find(p=>p.role==='contract')!.harvest).toBe(C.companyHarvest)
})
it('carries unpaid company debt after flood and advances inputs again',()=>{
 let s=roleGame('flood');const p=s.players.find(p=>p.role==='contract')!;p.harvest=0
 s=finishDecisions(s);expect(s.players.find(x=>x.id===p.id)!.companyDebt).toBe(C.companyAdvance)
 s=advanceRound(s);expect(s.players.find(x=>x.id===p.id)!.companyDebt).toBe(C.companyAdvance*2)
})
it('takes company produce against debt during closure and counts its rot as waste',()=>{
 const s=roleGame('marketClosure'),p=s.players.find(p=>p.role==='contract')!,r=finishDecisions(s)
 const line=r.resolution!.lines.find(l=>l.playerId===p.id)!
 expect(line.companyUnits).toBe(C.companyAdvance);expect(line.companyRotten).toBe(line.companyUnits)
 expect(line.marketUnits).toBe(0);expect(line.spoilage).toBe(p.harvest);expect(r.players.find(x=>x.id===p.id)!.companyDebt).toBe(0)
})
it('restricts company cards, promises and one-off community gift in the engine',()=>{
 let s=roleGame();const p=s.players.find(p=>p.role==='contract')!
 expect(allowedCards(s,p)).toEqual(['sell','share'])
 expect(()=>updateDecision(s,p.id,{card:'store',promise:false})).toThrow()
 expect(()=>updateDecision(s,p.id,{card:'sell',promise:true})).toThrow()
 s=updateDecision(s,p.id,{card:'share',promise:false});s=finishDecisions(s);s=advanceCouncil(advanceRound(s))
 expect(allowedCards(s,s.players.find(x=>x.id===p.id)!)).toEqual(['sell'])
})
it('charges Mae Tha certificate cost, caps organic demand and pays a premium',()=>{
 const s=roleGame(),r=finishDecisions(s),members=r.players.filter(p=>p.role==='maeTha')
 const lines=r.resolution!.lines.filter(l=>members.some(p=>p.id===l.playerId))
 expect(lines.reduce((sum,l)=>sum+l.marketUnits,0)).toBeLessThanOrEqual(s.players.length*C.organicBuyerCapPerFarmer)
 for(const l of lines){expect(l.certificateCost).toBe(C.organicCertificateCost);expect(l.revenue).toBeCloseTo(l.marketUnits*(C.events.normal.price+C.organicPricePremium));expect(r.players.find(p=>p.id===l.playerId)!.cash).toBeCloseTo(C.startingCash+l.revenue-l.certificateCost)}
})
it('does not over-allocate fractional harvest after pest loss',()=>{
 const s=roleGame(),p=s.players.find(p=>p.role==='maeTha')!;p.harvest=0.4
 expect(()=>updateDecision(s,p.id,{card:'share',promise:false})).not.toThrow()
})
it('reserves Council buying after company debt and within flood road capacity',()=>{
 let s=roleGame('flood');s.council.seat='player';s.phase='council'
 const p=s.players.find(p=>p.role==='contract')!
 s=advanceCouncil({...s,council:{...s.council,plan:{policy:'procurement',quantity:1,farmerId:p.id,reserveRelease:0}}})
 s=finishDecisions(s);s=advanceCouncil(s)
 const line=s.resolution!.lines.find(l=>l.playerId===p.id)!
 expect(line.companyUnits).toBe(C.companyAdvance);expect(line.hubUnits).toBe(0.25);expect(line.transportUsed).toBe(line.transportCapacity)
})
