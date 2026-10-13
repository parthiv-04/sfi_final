import { expect, it } from 'vitest'
import { applyAction, newRoom, projectRoom } from './hostModel'
import { advanceCouncil, createGame } from '../round2/engine'
import { ROUND2_CONFIG as C } from '../round2/config'
import { destroyedPlants, runBot, spawnSchedule } from '../round2/minigame'
import type { RoomModel, ActionType } from './protocol'
function grow(offline = false) {
  const model = newRoom('SEED','host','automatic',3)
  model.offline=offline; model.game=advanceCouncil(createGame(['A','B','C'],()=>0.4,{seat:'automatic'})); model.learning={kind:'grow',index:0}
  model.participants=Object.fromEntries(model.game.players.map((p,i)=>[`u${i}`,{uid:`u${i}`,name:p.name,seatId:p.id as `p${number}`,spectator:false,lastSeen:0}]))
  return model
}
let id=0
function act(model:RoomModel,uid:string,type:ActionType,payload:unknown={},now=0) {
  return applyAction(model,uid,{id:String(++id),actorUid:uid,revision:model.revision,round:model.game?.round,seatRevision:model.seatRevisions[uid]??0,type,payload},()=>0.4,now)
}
it('uses the same schedule seed per room and round and never changes the harvest',()=>{
  expect(spawnSchedule(123,'hand')).toEqual(spawnSchedule(123,'hand'))
  expect(destroyedPlants(runBot(123,'hand',true))).toBe(0)
  expect(destroyedPlants(runBot(123,'hand',false))).toBeGreaterThan(0)
  let m=grow(true); m=act(m,'host','learningNext',m.learning).model
  const before=m.game!.players[0].harvest
  const result=act(m,'u0','pest',{destroyed:C.minigame.plants})
  expect(result.receipt.accepted).toBe(true); m=result.model
  expect(m.game!.players[0].harvest).toBe(before)
  expect(act(m,'u0','pest',{destroyed:0}).receipt.accepted).toBe(false)
  expect(act(m,'u1','pest',{destroyed:99}).receipt.accepted).toBe(false)
  expect(projectRoom(m).publicRoom.pestSeed).toBe(projectRoom(m).publicRoom.pestSeed)
  m=act(m,'u1','pest',{destroyed:0}).model; m=act(m,'u2','pest',{destroyed:0}).model
  expect(m.learning.kind).toBe(null); expect(m.planningEndsAt).toBe(null)
})
it('host timeout closes the 10-second Grow for missing phones without crop loss and opens planning',()=>{
  let m=grow();m=act(m,'host','learningNext',m.learning,100).model
  const harvests=m.game!.players.map(p=>p.harvest)
  expect(m.pestEndsAt).toBe(10100)
  expect(act(m,'host','growFinish',{},10099).receipt.accepted).toBe(false)
  expect(act(m,'u0','growFinish',{},10100).receipt.accepted).toBe(false)
  m=act(m,'host','growFinish',{},10100).model
  expect(m.learning.kind).toBe(null);expect(m.pestDone).toHaveLength(3)
  expect(m.game!.players.map(p=>p.harvest)).toEqual(harvests)
  expect(m.planningEndsAt).toBe(70100)
})
it('lets only the host skip Grow for everyone before time runs out',()=>{
  let m=grow();m=act(m,'host','learningNext',m.learning,100).model
  m=act(m,'u0','pest',{destroyed:2},200).model
  expect(act(m,'u1','growSkip',{},300).receipt.accepted).toBe(false)
  const skipped=act(m,'host','growSkip',{},300)
  expect(skipped.receipt.accepted).toBe(true);m=skipped.model
  expect(m.learning.kind).toBe(null);expect(m.pestDone).toHaveLength(3);expect(m.planningEndsAt).toBe(300+C.planningSeconds*C.millisecondsPerSecond)
})
it('does not skip planning from Grow and clears Grow when the host ends early',()=>{
 const m=grow();expect(act(m,'host','skipTimer').receipt.accepted).toBe(false)
 const ended=act(m,'host','end').model
 expect(ended.learning.kind).toBe(null);expect(ended.pestEndsAt).toBe(null);expect(ended.game!.phase).toBe('debrief')
})
