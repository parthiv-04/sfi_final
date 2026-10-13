// Single-screen rewind: keep the room as it stood at the start of each round of the current run.
import type { RoomModel } from './multiplayer/protocol'
export type Snapshots = Record<number, RoomModel>
/** Record `next` if it starts a round not yet saved in this run; a new run starts a fresh set. */
export function recordSnapshot(saved: Snapshots, next: RoomModel): Snapshots {
  const round = next.game?.round
  if (!round) return saved
  const sameRun = Object.values(saved)[0]?.runId === next.runId
  if (sameRun && saved[round]) return saved
  return { ...(sameRun ? saved : {}), [round]: structuredClone(next) }
}
/** Restore the start of `round`, dropping later snapshots so the new run records its own. */
export function rewindTo(saved: Snapshots, round: number): { model: RoomModel; saved: Snapshots } {
  if (!saved[round]) throw new Error('That round has no saved start.')
  return { model: structuredClone(saved[round]), saved: Object.fromEntries(Object.entries(saved).filter(([r]) => Number(r) <= round)) }
}
