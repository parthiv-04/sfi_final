import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newRoom, projectRoom } from './hostModel'
import { randomId } from './ids'

const sdk = vi.hoisted(() => ({
  get: vi.fn(), onValue: vi.fn(), transaction: vi.fn(),
}))
vi.mock('firebase/app', () => ({ getApps: () => [], initializeApp: () => ({}) }))
vi.mock('firebase/auth', () => ({ browserLocalPersistence: {}, initializeAuth: () => ({ currentUser: { uid: 'host' }, authStateReady: async () => {} }), setPersistence: async () => {}, signInAnonymously: async () => ({ user: { uid: 'host' } }) }))
vi.mock('firebase/database', () => ({
  getDatabase: () => ({}), ref: (_db: unknown, path: string) => ({ path }),
  get: sdk.get, onValue: sdk.onValue, runTransaction: sdk.transaction,
  onChildAdded: () => () => {}, onChildRemoved: () => () => {}, onDisconnect: () => ({ set: async () => {} }),
  serverTimestamp: () => 0, set: async () => {}, update: async () => {},
}))

beforeEach(() => {
  vi.resetModules()
  for (const key of ['API_KEY', 'AUTH_DOMAIN', 'DATABASE_URL', 'PROJECT_ID', 'APP_ID']) vi.stubEnv(`VITE_FIREBASE_${key}`, 'test-configuration')
  vi.stubGlobal('window', { setTimeout, clearTimeout, setInterval, clearInterval })
  const storage = new Map<string, string>()
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) })
  sdk.get.mockReset().mockImplementation(async ({ path }: { path: string }) => {
    if (path.startsWith('.info/')) throw new Error('Invalid token in path')
    return { val: () => null, exists: () => false }
  })
  sdk.onValue.mockReset().mockImplementation(({ path }: { path: string }, callback: (snapshot: { val: () => unknown }) => void) => {
    let active = true
    queueMicrotask(() => { if (active) callback({ val: () => path === '.info/connected' ? true : 25 }) })
    return () => { active = false }
  })
  sdk.transaction.mockReset().mockImplementation(async (_ref: unknown, change: (current: unknown) => unknown) => ({ committed: !!change(null) }))
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('Firebase initialization', () => {
  it('listens to metadata rather than sending .info paths to get(), then creates a room', async () => {
    const { connectFirebase } = await import('./firebase')
    const service = await connectFirebase()
    const model = newRoom('ABCD', service.uid, 'automatic')
    await service.createRoom(model, projectRoom(model))
    expect(sdk.get).not.toHaveBeenCalled()
    expect(sdk.onValue.mock.calls.some(([reference]) => reference.path === '.info/serverTimeOffset')).toBe(true)
    expect(sdk.transaction).toHaveBeenCalledWith(expect.objectContaining({ path: 'rooms/ABCD' }), expect.any(Function))
  })
  it('starts host presence when lease transactions begin with an empty local cache', async () => {
    const { connectFirebase } = await import('./firebase')
    const service = await connectFirebase()
    const onError = vi.fn()
    const stop = await service.startHostPresence('ABCD', onError)
    stop()
    expect(onError).not.toHaveBeenCalled()
    expect(sdk.transaction.mock.calls.some(([reference]) => reference.path === 'rooms/ABCD')).toBe(true)
  })
  it('publishes after resume even when the room transaction has an empty initial cache', async () => {
    const { connectFirebase } = await import('./firebase')
    const service = await connectFirebase()
    const model = newRoom('ABCD', service.uid, 'automatic')
    await expect(service.publish('ABCD', projectRoom(model))).resolves.toBeUndefined()
  })
  it('still rejects a genuinely different host with a fresh lease', async () => {
    const { connectFirebase } = await import('./firebase')
    const service = await connectFirebase()
    sdk.transaction.mockImplementation(async (_ref: unknown, change: (current: unknown) => unknown) => ({ committed: !!change({ hostUid: service.uid, lease: { clientId: 'other-tab', expiresAt: Date.now() + 60000 }, presence: { 'other-tab': { online: true } } }) }))
    await expect(service.startHostPresence('ABCD', vi.fn())).rejects.toThrow('active host tab')
  })
  it('generates safe IDs when LAN HTTP does not provide randomUUID', () => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => { bytes.fill(7); return bytes } })
    expect(randomId()).toMatch(/^[a-f0-9]{32}$/)
  })
  it('issues a new session ID even when a duplicate tab copied sessionStorage', async () => {
    const copied = 'copied-host-id'
    vi.stubGlobal('sessionStorage', { getItem: () => copied, setItem: vi.fn() })
    const first = await (await import('./firebase')).connectFirebase()
    vi.resetModules()
    const second = await (await import('./firebase')).connectFirebase()
    expect(first.clientId).not.toBe(copied)
    expect(second.clientId).not.toBe(first.clientId)
  })
  it('can take over a disconnected host without waiting for its lease timeout', async () => {
    const { connectFirebase } = await import('./firebase')
    const service = await connectFirebase()
    const model = newRoom('ABCD', service.uid, 'automatic')
    sdk.get.mockResolvedValue({ val: () => JSON.stringify(model) })
    sdk.transaction.mockImplementation(async (_reference, change) => ({ committed: !!change({ hostUid: service.uid, lease: { clientId: 'closed-tab', expiresAt: Date.now() + 60000 }, presence: { 'closed-tab': { online: false } } }) }))
    expect(await service.resumeHost('ABCD')).toEqual(model)
  })
  it('rejects stale publications and a previous host after another tab owns the lease', async () => {
    const { connectFirebase } = await import('./firebase')
    const service = await connectFirebase()
    const model = newRoom('ABCD', service.uid, 'automatic')
    sdk.transaction.mockImplementation(async (_reference, change) => ({ committed: !!change({ hostUid: service.uid, lease: { clientId: service.clientId, expiresAt: Date.now() + 60000 }, checkpoint: JSON.stringify({ ...model, revision: 8 }) }) }))
    await expect(service.publish('ABCD', { ...projectRoom(model), expectedRevision: 0 })).rejects.toThrow('lease')
    sdk.transaction.mockImplementation(async (_reference, change) => ({ committed: !!change({ hostUid: service.uid, lease: { clientId: 'new-owner', expiresAt: Date.now() + 60000 }, checkpoint: JSON.stringify(model) }) }))
    await expect(service.publish('ABCD', { ...projectRoom(model), expectedRevision: 0 })).rejects.toThrow('lease')
  })
})
