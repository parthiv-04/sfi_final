// Causal loops in the game, drawn as simple arrows to match the group's CLD.
import { ROUND2_CONFIG as C } from '../round2/config'
import type { Resolution } from '../round2/types'

interface Loop { title: string; kind: 'R' | 'B'; nodes: string[]; signs: ('+' | '−')[]; fired: (r: Resolution) => boolean; note: string }
export const LOOPS: Loop[] = [
  { title: 'Low security raises prices', kind: 'R', nodes: ['City food security', 'Market price', 'Shoppers who can afford food'], signs: ['−', '−', '+'], fired: (r) => r.loops?.lowSecurityNext, note: `Security below ${C.loops.lowSecurityFraction * 100}% of max adds $${C.loops.lowSecurityPriceRise} to next round’s price.` },
  { title: 'Sharing builds trust', kind: 'R', nodes: ['Sharing in a crisis', 'Community trust', 'Council budget', 'Food reaching the hub'], signs: ['+', '+', '+', '+'], fired: (r) => r.loops?.trustBudgetNext > 0, note: `Half the farms sharing in a crisis adds $${C.loops.trustBudgetPerFarmer} per farmer to the Council budget.` },
  { title: 'Preparing for floods', kind: 'B', nodes: ['City food security', 'Urgency to prepare', 'Storing before a flood', 'Food during the flood'], signs: ['−', '+', '+', '+'], fired: (r) => r.loops?.unpreparedFlood, note: 'No one storing before a forecast flood leaves less food when roads close.' },
]
function wrap(text: string) { const words = text.split(' '); const half = Math.ceil(words.length / 2); return words.length > 1 ? [words.slice(0, half).join(' '), words.slice(half).join(' ')] : [text] }
function LoopDiagram({ loop }: { loop: Loop }) {
  const size = 340, r = 110, c = size / 2, n = loop.nodes.length
  const at = (i: number, radius = r) => { const a = -Math.PI / 2 + (i / n) * 2 * Math.PI; return [c + radius * Math.cos(a), c + radius * Math.sin(a)] }
  return <svg viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${loop.title}: ${loop.nodes.map((node, i) => `${node} ${loop.signs[i]}→`).join(' ')} back to ${loop.nodes[0]}`} className="loop-diagram">
    <defs><marker id="arrowhead" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker></defs>
    {loop.nodes.map((_, i) => {
      const a0 = -Math.PI / 2 + ((i + 0.28) / n) * 2 * Math.PI, a1 = -Math.PI / 2 + ((i + 0.72) / n) * 2 * Math.PI
      const [x0, y0] = [c + r * Math.cos(a0), c + r * Math.sin(a0)], [x1, y1] = [c + r * Math.cos(a1), c + r * Math.sin(a1)], [mx, my] = at(i + 0.5, r + 16)
      return <g key={i}><path d={`M${x0} ${y0} A${r} ${r} 0 0 1 ${x1} ${y1}`} fill="none" stroke="currentColor" strokeWidth="2.5" markerEnd="url(#arrowhead)" /><text x={mx} y={my + 5} textAnchor="middle" className="loop-sign">{loop.signs[i]}</text></g>
    })}
    {loop.nodes.map((node, i) => { const [x, y] = at(i); const lines = wrap(node); return <text key={node} x={x} y={y - (lines.length - 1) * 7 + 4} textAnchor="middle" className="loop-node">{lines.map((line, k) => <tspan key={k} x={x} dy={k ? 14 : 0}>{line}</tspan>)}</text> })}
    <text x={c} y={c + 10} textAnchor="middle" className="loop-kind">{loop.kind}</text>
  </svg>
}
export function LoopsPage({ history }: { history: Resolution[] }) {
  return <section className="workspace loops-page"><h2>Loops in this game</h2><p>R loops reinforce a change; B loops push back against it.</p><div className="loop-grid">{LOOPS.map((loop) => { const rounds = history.filter(loop.fired).map((r) => r.round); return <article key={loop.title}><h3>{loop.title}</h3><LoopDiagram loop={loop} /><p className="loop-fired">{rounds.length ? `Happened in round${rounds.length > 1 ? 's' : ''} ${rounds.join(', ')}.` : 'Did not happen this game.'}</p><details className="why"><summary>Why?</summary><p>{loop.note}</p></details></article> })}</div></section>
}
