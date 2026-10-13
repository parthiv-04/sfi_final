import { COMPOSITE_NOTE, destiny, profileFor } from '../characters'
import { Sprite } from '../ui/Sprite'
import type { Player } from '../round2/types'
import type { PublicRoom } from './protocol'

/** "Meet your farmer": portrait, name, age, family and starting situation. */
export function CharacterCard({ player }: { player: Player }) {
  const p = profileFor(player.role, player.profile)
  return <article className="character-card"><div className="character-portrait"><Sprite name="farmer" scale={5} shirt={p.shirt} /></div><div><h2>{p.name}, {p.age}</h2><p>{p.family}</p><p><strong>{p.situation(player.companyDebt)}</strong></p><small>{COMPOSITE_NOTE}</small></div></article>
}
/** End-of-game destiny for one farmer, from final cash, debt and the city result. */
export function DestinyCard({ room, player }: { room: PublicRoom; player: Player }) {
  const lost = room.phase === 'gameOver' ? room.history[room.history.length - 1]?.round ?? null : null
  const text = destiny({
    role: player.role, profile: player.profile, cash: player.cash, goal: player.goal, debt: player.companyDebt, certificatePaid: player.certificatePaid ?? 0, soilLost: player.soilLost ?? 0, cityLostRound: lost,
    rounds: room.history.map((r) => { const line = r.lines.find((l) => l.playerId === player.id); return { round: r.round, kind: r.event.kind, debtAfter: line?.debtAfter, fed: line ? line.contractUnits + line.hubUnits : 0 } }),
  })
  const p = profileFor(player.role, player.profile)
  return <section className="workspace destiny-card"><div className="character-portrait"><Sprite name="farmer" scale={4} shirt={p.shirt} /></div><div><p className="eyebrow">Destiny · {p.name}</p><p>{text}</p><small>{COMPOSITE_NOTE}</small></div></section>
}
