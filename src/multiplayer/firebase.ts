import { randomId } from './ids'
import { getApps, initializeApp } from 'firebase/app'
import { browserLocalPersistence, initializeAuth, signInAnonymously } from 'firebase/auth'
import { get, getDatabase, onChildAdded, onChildRemoved, onDisconnect, onValue, ref, runTransaction, serverTimestamp, set, update } from 'firebase/database'
import { NETWORK_CONFIG } from './config'
import type { ActionReceipt, ClientAction, Presence, PrivateView, Publication, PublicRoom, RealtimeService, RoomModel } from './protocol'

const options = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}
export const firebaseConfigured = Object.values(options).every((value) => typeof value === 'string' && value.trim().length > 0)
let servicePromise: Promise<RealtimeService> | null = null
export function connectFirebase(): Promise<RealtimeService> {
  if (!servicePromise) servicePromise = initialize().catch((error) => { servicePromise = null; throw error })
  return servicePromise
}
const parse = <T,>(value: unknown): T | null => typeof value === 'string' ? JSON.parse(value) as T : null
async function initialize(): Promise<RealtimeService> {
  if (!firebaseConfigured) throw new Error('Multiplayer is not configured. Add the VITE_FIREBASE_* values from .env.example, or use offline single-screen mode.')
  const app = getApps().find((entry) => entry.name === 'food-resilience') ?? initializeApp(options, 'food-resilience')
  // Initialize with one persistence store. Migrating stores after getAuth()
  // can sign another open tab out during persistence synchronization.
  const auth = initializeAuth(app, { persistence: browserLocalPersistence })
  await auth.authStateReady()
  const user = auth.currentUser ?? (await signInAnonymously(auth)).user
  const db = getDatabase(app)
  let online = false
  onValue(ref(db, '.info/connected'), (snapshot) => { online = snapshot.val() === true })
  await new Promise<void>((resolve, reject) => {
    let stop = () => {}
    const timer = window.setTimeout(() => { stop(); reject(new Error('Could not connect to Firebase. Check the project configuration, database URL and Anonymous Authentication.')) }, NETWORK_CONFIG.actionTimeoutMs)
    stop = onValue(ref(db, '.info/connected'), (snapshot) => { if (snapshot.val() === true) { window.clearTimeout(timer); stop(); resolve() } }, (error) => { window.clearTimeout(timer); stop(); reject(error) })
  })
  // .info values are local SDK metadata; get() sends an invalid server path.
  const offset = await new Promise<number>((resolve, reject) => {
    onValue(ref(db, '.info/serverTimeOffset'), (snapshot) => resolve(Number(snapshot.val()) || 0), reject, { onlyOnce: true })
  })
  const now = () => Date.now() + offset
  // Duplicated tabs inherit sessionStorage. Issue a fresh ID for this page
  // instance instead of trusting the copied value; keep it for this tab's session.
  const tabId = randomId()
  sessionStorage.setItem('frm-client-id', tabId)
  const roomRef = (code: string, path = '') => ref(db, `rooms/${code}${path ? `/${path}` : ''}`)
  const validCode = (code: string) => { if (!/^[A-Z]{4}$/.test(code)) throw new Error('Enter a four-letter room code.') }
  const assertOnline = () => { if (!online) throw new Error('You are disconnected. Reconnect before sending a choice.') }
  const lease = () => ({ clientId: tabId, expiresAt: now() + NETWORK_CONFIG.hostTimeoutMs })
  const claim = async (code: string) => {
    const result = await runTransaction(roomRef(code), (current) => {
      current ??= { hostUid: user.uid }
      if (current.hostUid !== user.uid) return
      const owner = current.lease?.clientId
      const active = current.lease?.expiresAt > now() && current.presence?.[owner]?.online !== false
      if (owner && owner !== tabId && active) return
      current.lease = lease()
      return current
    })
    if (!result.committed) throw new Error('This room already has an active host tab. Close it or wait for it to disconnect.')
  }
  const wire = (publication: Publication) => ({
    checkpoint: JSON.stringify(publication.model), public: JSON.stringify(publication.publicRoom),
    views: Object.fromEntries(Object.entries(publication.privateViews).map(([uid, view]) => [uid, JSON.stringify(view)])),
  })
  const service: RealtimeService = {
    uid: user.uid, clientId: tabId,
    async createRoom(model, publication) {
      validCode(model.code)
      assertOnline()
      const result = await runTransaction(roomRef(model.code), (current) => current ? undefined : { hostUid: user.uid, lease: lease(), ...wire(publication) })
      if (!result.committed) throw new Error('Room code taken.')
    },
    async resumeHost(code) {
      validCode(code)
      assertOnline()
      const model = parse<RoomModel>((await get(roomRef(code, 'checkpoint'))).val())
      if (!model || model.hostUid !== user.uid) throw new Error('This browser does not own that host room.')
      if (model.version !== NETWORK_CONFIG.roomVersion) throw new Error('This room uses the previous rules. Create a new room.')
      await claim(code)
      const latest = parse<RoomModel>((await get(roomRef(code, 'checkpoint'))).val())
      if (!latest || latest.version !== NETWORK_CONFIG.roomVersion) throw new Error('This room uses the previous rules. Create a new room.')
      return latest
    },
    async publish(code, publication) {
      assertOnline()
      const result = await runTransaction(roomRef(code), (current) => {
        // Firebase may first call with an empty local cache. Propose a value so
        // the server can retry with authoritative data before ownership checks.
        current ??= { hostUid: user.uid, lease: lease() }
        if (!current || current.hostUid !== user.uid || current.lease?.clientId !== tabId || current.lease.expiresAt < now()) return
        if (publication.expectedRevision !== undefined && current.checkpoint && parse<RoomModel>(current.checkpoint)?.revision !== publication.expectedRevision) return
        Object.assign(current, wire(publication))
        current.lease = lease()
        if (publication.receipt) {
          const { uid, value } = publication.receipt
          current.receipts ??= {}
          current.receipts[uid] ??= {}
          current.receipts[uid][value.actionId] = value
          if (current.actions?.[uid]) delete current.actions[uid][value.actionId]
        }
        return current
      })
      if (!result.committed) throw new Error('Host lease expired or moved to another tab. Resume the room before continuing.')
    },
    watchActions(code, callback, onError) {
      const children = new Map<string, () => void>()
      const added = onChildAdded(roomRef(code, 'actions'), (sender) => {
        const uid = sender.key!
        children.get(uid)?.()
        children.set(uid, onChildAdded(roomRef(code, `actions/${uid}`), (snapshot) => {
          const data = snapshot.val()
          let payload: unknown = null
          let round: number | undefined
          let seatRevision: number | undefined
          try {
            const packet = JSON.parse(data.payload)
            if (packet && Object.hasOwn(packet, 'choices')) {
              payload = packet.choices; round = packet.round; seatRevision = packet.seatRevision
            } else payload = packet // Older join packets remain readable.
          } catch { /* validation returns a rejection */ }
          callback(uid, { id: snapshot.key!, actorUid: data.actorUid, revision: data.revision, round, seatRevision, type: data.type, payload })
        }, onError))
      }, onError)
      const removed = onChildRemoved(roomRef(code, 'actions'), (snapshot) => { children.get(snapshot.key!)?.(); children.delete(snapshot.key!) }, onError)
      return () => { added(); removed(); children.forEach((stop) => stop()) }
    },
    watchPublic(code, callback, onError) { validCode(code); return onValue(roomRef(code, 'public'), (snapshot) => { try { callback(parse<PublicRoom>(snapshot.val())) } catch { onError(new Error('Invalid public room data.')) } }, onError) },
    watchPrivate(code, callback, onError) { return onValue(roomRef(code, `views/${user.uid}`), (snapshot) => { try { callback(parse<PrivateView>(snapshot.val())) } catch { onError(new Error('Invalid seat data.')) } }, onError) },
    watchPresence(code, callback, onError) {
      let stopPresence: (() => void) | null = null
      const stopLease = onValue(roomRef(code, 'lease'), (snapshot) => {
        stopPresence?.()
        const value = snapshot.val()
        if (!value?.clientId) { callback(null); return }
        stopPresence = onValue(roomRef(code, `presence/${value.clientId}`), (presence) => {
          const data = presence.val() as Presence | null
          callback(data ? { ...data, lastSeen: data.lastSeen - offset } : null)
        }, onError)
      }, onError)
      return () => { stopLease(); stopPresence?.() }
    },
    watchConnection(callback) { return onValue(ref(db, '.info/connected'), (snapshot) => callback(snapshot.val() === true)) },
    watchReceipts(code, callback, onError) { return onChildAdded(roomRef(code, `receipts/${user.uid}`), (snapshot) => callback(snapshot.val() as ActionReceipt), onError) },
    async sendAction(code, action) {
      assertOnline()
      validCode(code)
      if (action.actorUid !== user.uid) throw new Error('Cannot send another player’s action.')
      const actionRef = roomRef(code, `actions/${user.uid}/${action.id}`)
      if ((await get(actionRef)).exists()) return
      // Keep round/seat versions inside the existing payload field so deployed
      // database rules need no schema migration.
      await set(actionRef, { id: action.id, actorUid: action.actorUid, revision: action.revision, type: action.type, payload: JSON.stringify({ round: action.round ?? null, seatRevision: action.seatRevision ?? null, choices: action.payload }) })
    },
    async startHostPresence(code, onError) {
      await claim(code)
      const presenceRef = roomRef(code, `presence/${tabId}`)
      const markOnline = async () => {
        const renewed = await runTransaction(roomRef(code, 'lease'), (current) => !current || current.clientId === tabId ? lease() : undefined)
        if (!renewed.committed) throw new Error('Another host tab owns this room.')
        await onDisconnect(presenceRef).set({ online: false, lastSeen: serverTimestamp(), clientId: tabId })
        await set(presenceRef, { online: true, lastSeen: serverTimestamp(), clientId: tabId })
      }
      await markOnline()
      const reconnect = onValue(ref(db, '.info/connected'), (snapshot) => { if (snapshot.val() === true) void markOnline().catch(onError) })
      const interval = window.setInterval(() => {
        if (!online) return
        void runTransaction(roomRef(code, 'lease'), (current) => !current || current.clientId === tabId ? lease() : undefined).then((result) => {
          if (!result.committed) throw new Error('Another host tab owns this room.')
          return update(presenceRef, { online: true, lastSeen: serverTimestamp(), clientId: tabId })
        }).catch(onError)
      }, NETWORK_CONFIG.heartbeatMs)
      return () => { reconnect(); window.clearInterval(interval); void set(presenceRef, { online: false, lastSeen: serverTimestamp(), clientId: tabId }).catch(onError) }
    },
  }
  return service
}
