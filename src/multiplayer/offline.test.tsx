import { expect, it, vi } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { applyAction, newRoom, projectRoom } from './hostModel'
import { canPromise, allowedCards, isCrisis } from '../round2/engine'
import { makeRng } from '../round2/rng'
import { SharedBoard } from './SharedBoard'
import { PhoneFarm } from './PhoneControls'
import { DEBRIEF_QUESTIONS } from '../learning'
import type { ActionType, RoomModel } from './protocol'
import type { FarmerRole } from '../round2/types'
it.each(['maeTha', 'contract'] as FarmerRole[])('starts a one-farmer offline game with the selected %s role', (role) => {
 expect(() => newRoom('SOLO', 'host', 'automatic', 1)).toThrow()
 let m = newRoom('SOLO', 'host', 'automatic', 1, true), serial = 0
 m.offline = true
 const act = (uid: string, type: ActionType, payload: unknown = {}) => {
  const result = applyAction(m, uid, { id: String(++serial), actorUid: uid, revision: m.revision, round: m.game?.round, seatRevision: m.seatRevisions[uid] ?? 0, type, payload }, () => 0.5, 1000)
  expect(result.receipt.accepted, result.receipt.message).toBe(true)
  m = result.model
 }
 act('farmer', 'join', { name: 'Solo Farmer' })
 act('farmer', 'claimSeat', { seatId: 'p1' })
 act('host', 'start', { roles: [role] })
 expect(m.game?.players).toHaveLength(1)
 expect(m.game?.players[0]).toMatchObject({ name: 'Solo Farmer', role })
 expect(projectRoom(m).publicRoom.rules.playerCount).toBe(1)
})
it('plays all five rounds offline with five farms and automatic Council, renders and accepts anonymous debrief',()=>{
 const random=makeRng(1),consoleErrors=vi.spyOn(console,'error'),storage=new Map<string,string>()
 vi.stubGlobal('sessionStorage',{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)})
 let m=newRoom('SOLO','host','automatic',5),serial=0;m.offline=true
 const act=(uid:string,type:ActionType,payload:unknown={})=>{
  const r=applyAction(m,uid,{id:String(++serial),actorUid:uid,revision:m.revision,round:m.game?.round,seatRevision:m.seatRevisions[uid]??0,type,payload},random,1000)
  expect(r.receipt.accepted,r.receipt.message).toBe(true);m=r.model
 }
 for(let i=1;i<=5;i++){act(`u${i}`,'join',{name:`Farm ${i}`});act(`u${i}`,'claimSeat',{seatId:`p${i}`});act(`u${i}`,'chooseRole',{role:i<=2?'contract':'maeTha'})}
 act('host','start')
 while(m.game!.phase!=='debrief' && m.game!.phase!=='gameOver'){
  while(m.learning.kind){
   if(m.learning.kind==='grow'&&m.learning.index===1) for(let i=1;i<=5;i++)act(`u${i}`,'pest',{destroyed:0})
   else act('host','learningSkip',{...m.learning})
  }
  for(const p of m.game!.players){
   const pub=projectRoom(m);expect(renderToStaticMarkup(<SharedBoard room={pub.publicRoom}/>)).not.toContain('Disconnected')
   expect(()=>renderToStaticMarkup(<PhoneFarm room={pub.publicRoom} view={pub.privateViews[`u${p.id.slice(1)}`]} disabled={false} onSave={()=>{}}/>)).not.toThrow()
   const card=p.role==='maeTha'?'share':'sell'
   act(`u${p.id.slice(1)}`,'plan',{choice:{card,promise:canPromise(m.game!,p)&&m.game!.round<5}})
  }
  if(m.game!.phase==='resolution')act('host','nextRound')
 }
 expect(m.game!.phase).toBe('debrief');expect(m.game!.history).toHaveLength(5)
 expect(m.usedFacts).toHaveLength(5);expect(new Set(m.usedFacts).size).toBe(5)
 expect(projectRoom(m).publicRoom.comparison!.fewerShortageRounds).toBe(0)
 act('host','question',{index:DEBRIEF_QUESTIONS.length});act('u1','reflection',{answer:'Emergency routes matter'})
 expect(projectRoom(m).publicRoom.wordWall).toEqual(['Emergency routes matter'])
 expect(consoleErrors).not.toHaveBeenCalled();consoleErrors.mockRestore();vi.unstubAllGlobals()
})
