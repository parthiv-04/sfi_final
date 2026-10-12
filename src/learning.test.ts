import { expect, it } from 'vitest'
import { DEBRIEF_QUESTIONS, FACTS, pickRoundFact } from './learning'
import { advanceCouncil, createGame, finishDecisions } from './round2/engine'
import { makeRng } from './round2/rng'
it('merges twelve attributed facts and at most ten distinct debrief questions',()=>{
 expect(FACTS).toHaveLength(12);expect(new Set(FACTS.map(f=>f.id)).size).toBe(12)
 expect(FACTS.every(f=>!!f.source)).toBe(true)
 expect(DEBRIEF_QUESTIONS.length).toBeLessThanOrEqual(10)
 expect(new Set(DEBRIEF_QUESTIONS.map(q=>q[1])).size).toBe(DEBRIEF_QUESTIONS.length)
})
it('matches facts to disruptions and never repeats a card within a game',()=>{
 const s=finishDecisions(advanceCouncil(createGame(['A','B','C'],makeRng(1),{seat:'automatic'})))
 const r={...s.resolution!,event:{...s.resolution!.event,kind:'flood' as const}}
 const first=pickRoundFact(r,[])!;expect(first.id).toBe('fact-1')
 const used:string[]=[]
 for(let i=0;i<FACTS.length;i++){const fact=pickRoundFact(r,used)!;expect(used).not.toContain(fact.id);used.push(fact.id)}
 expect(pickRoundFact(r,used)).toBe(null)
})
