import { RoleScene } from './scenes'
import { PestGame } from './PestGame'
import type { PrivateView, PublicRoom } from '../multiplayer/protocol'
export function GrowFarm({ view, room, onDone, disabled = false }: { view: PrivateView; room: PublicRoom; onDone: (destroyed: number) => void; disabled?: boolean }) {
  if (!view.player || room.pestDone.includes(view.player.id)) return <p>Waiting for the other farms.</p>
  return <section className="workspace"><h2>{view.player.name} · Protect crops</h2><RoleScene contract={view.player.role === 'contract'} debt={view.player.companyDebt} recovery={room.round === 1 && view.player.role === 'maeTha'} /><PestGame paused={disabled} mode={view.player.role === 'contract' ? 'spray' : 'hand'} seed={room.pestSeed} showHelp={false} onDone={onDone} /></section>
}
