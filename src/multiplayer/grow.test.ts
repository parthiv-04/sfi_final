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
it('uses the same schedule seed per room and round and caps crop loss',()=>{
  expect(spawnSchedule(123,'hand')).toEqual(spawnSchedule(123,'hand'))
  expect(destroyedPlants(runBot(123,'hand',true))).toBe(0)
  expect(destroyedPlants(runBot(123,'hand',false))).toBeGreaterThan(0)
  let m=grow(true); m=act(m,'host','learningNext',m.learning).model
  const before=m.game!.players[0].harvest
  const result=act(m,'u0','pest',{destroyed:C.minigame.plants})
  expect(result.receipt.accepted).toBe(true); m=result.model
  expect(m.game!.players[0].harvest).toBe(before-C.pestMaxLoss)
  expect(act(m,'u0','pest',{destroyed:0}).receipt.accepted).toBe(false)
  expect(act(m,'u1','pest',{destroyed:99}).receipt.accepted).toBe(false)
  expect(projectRoom(m).publicRoom.pestSeed).toBe(projectRoom(m).publicRoom.pestSeed)
  m=act(m,'u1','pest',{destroyed:0}).model; m=act(m,'u2','pest',{destroyed:0}).model
  expect(m.learning.kind).toBe(null); expect(m.planningEndsAt).toBe(null)
})
it('host timeout closes Grow with bounded loss for missing phones and opens planning',()=>{
  let m=grow();m=act(m,'host','learningNext',m.learning,100).model
  expect(m.pestEndsAt).toBe(15100)
  expect(act(m,'host','growFinish',{},15099).receipt.accepted).toBe(false)
  expect(act(m,'u0','growFinish',{},15100).receipt.accepted).toBe(false)
  m=act(m,'host','growFinish',{},15100).model
  expect(m.learning.kind).toBe(null);expect(m.pestDone).toHaveLength(3)
  expect(m.planningEndsAt).toBe(75100)
})
