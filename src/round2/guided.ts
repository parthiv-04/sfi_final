import { ROUND2_CONFIG as C } from './config'
import type { EventCard, EventKind } from './types'

/** A teaching scenario: earn and prepare first, then face disruptions together. */
export function guidedEvents(farmers: number): EventCard[] {
  return (['normal', 'festival', 'warning', 'flood', 'marketClosure'] as EventKind[]).map((kind) => ({ kind, ...C.events[kind], capacity: Math.ceil(farmers * C.marketShares[kind]), ...(kind === 'warning' ? { forecastHits: true } : {}) }))
}
