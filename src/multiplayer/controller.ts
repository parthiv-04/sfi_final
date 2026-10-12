import { randomId } from './ids'
import { ROUND2_CONFIG } from '../round2/config'
import { NETWORK_CONFIG } from './config'
import { applyAction, newRoom, projectRoom } from './hostModel'
import type { ClientAction, RealtimeService, RoomModel } from './protocol'

export function roomCode(random = Math.random): string {
  return Array.from({ length: NETWORK_CONFIG.roomCodeLength }, () => NETWORK_CONFIG.alphabet[Math.floor(random() * NETWORK_CONFIG.alphabet.length)]).join('')
}
export class HostController {
  private queue: Promise<void> = Promise.resolve()
  private unsubscribe: (() => void) | null = null
  constructor(private service: RealtimeService, public model: RoomModel, private onChange: (model: RoomModel) => void, private onError: (error: Error) => void, private random = Math.random, private now = Date.now) {}
  static async create(service: RealtimeService, councilMode: RoomModel['councilMode'], onChange: (model: RoomModel) => void, onError: (error: Error) => void, farmerCount: number = ROUND2_CONFIG.playerCount): Promise<HostController> {
    for (let attempt = 0; attempt < NETWORK_CONFIG.roomAttempts; attempt += 1) {
      // Use crypto-generated room codes in browsers; engine randomness remains injectable.
      const bytes = crypto.getRandomValues(new Uint32Array(NETWORK_CONFIG.roomCodeLength))
      let index = 0
      const code = roomCode(() => bytes[index++] / (2 ** 32))
      const model = newRoom(code, service.uid, councilMode, farmerCount)
      try {
        await service.createRoom(model, projectRoom(model))
        return new HostController(service, model, onChange, onError)
      } catch (error) {
        if (!(error instanceof Error) || !/taken|permission.denied/i.test(error.message)) throw error
      }
    }
    throw new Error('Could not find a free room code. Try again.')
  }
  listen(): void {
    this.unsubscribe?.()
    this.unsubscribe = this.service.watchActions(this.model.code, (sender, action) => { void this.dispatch(sender, action).catch(this.onError) }, this.onError)
  }
  stop(): void { this.unsubscribe?.(); this.unsubscribe = null }
  async drain(): Promise<void> { await this.queue }
  dispatch(sender: string, action: ClientAction): Promise<void> {
    const work = this.queue.then(async () => {
      const currentAction = sender === this.service.uid ? { ...action, revision: this.model.revision, round: this.model.game?.round, seatRevision: this.model.seatRevisions[sender] ?? 0 } : action
      const outcome = applyAction(this.model, sender, currentAction, this.random, this.now())
      await this.service.publish(this.model.code, { ...projectRoom(outcome.model, { uid: sender, value: outcome.receipt }), expectedRevision: this.model.revision })
      this.model = outcome.model
      this.onChange(this.model)
    })
    this.queue = work.catch(() => {})
    return work
  }
  async hostAction(type: ClientAction['type'], payload: unknown = {}): Promise<void> {
    const id = randomId()
    await this.dispatch(this.service.uid, { id, actorUid: this.service.uid, revision: this.model.revision, round: this.model.game?.round, seatRevision: this.model.seatRevisions?.[this.service.uid] ?? 0, type, payload })
    const receipt = this.model.handled[`${this.service.uid}:${id}`]
    if (!receipt.accepted) throw new Error(receipt.message)
  }
}
