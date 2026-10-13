import type { FarmerRole, PolicyMetrics } from '../round2/types'

export interface RunSummary { metrics: PolicyMetrics; fed: number; rounds: number; roles: FarmerRole[] }
/** Two single-screen runs side by side: the run before a rewind and the run after it. */
export function RewindComparison({ before, after, from }: { before: RunSummary; after: RunSummary; from: number }) {
  const has = (role: FarmerRole) => after.roles.includes(role)
  const rows: [string, (r: RunSummary) => number, boolean][] = [['Shortage rounds', (r) => r.metrics.shortageRounds, true], ['People with access to food at the end (%)', (r) => r.metrics.finalSecurity, true], ['Households fed', (r) => r.fed, true], ['Average company-farmer cash ($)', (r) => r.metrics.contractCash, has('contract')], ['Average company debt (crates)', (r) => r.metrics.contractDebt, has('contract')], ['Average Mae Tha profit ($)', (r) => r.metrics.maeThaProfit, has('maeTha')], ['Food wasted (crates)', (r) => r.metrics.waste, true], ['Rounds played', (r) => r.rounds, true]]
  return <section className="workspace policy-comparison rewind-comparison"><h2>Two runs, same events</h2><div className="table-scroll"><table><thead><tr><th>Measure</th><th>Before rewind</th><th>Rewound to round {from}</th></tr></thead><tbody>{rows.filter(([, , shown]) => shown).map(([label, pick]) => <tr key={label}><th>{label}</th><td>{Math.round(pick(before))}</td><td>{Math.round(pick(after))}</td></tr>)}</tbody></table></div></section>
}
