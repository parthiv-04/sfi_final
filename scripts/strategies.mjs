// Coordinated decisions use only the current public event, cash, roads and stock.
export function coordinate(E, C, state) {
  const decisions = Object.fromEntries(state.players.map(p=>[p.id,{card:'sell',promise:p.role !== 'contract' && state.round<C.rounds}]))
  let fed=state.players.reduce((s,p)=>s+E.contractArrivals(state,p),0)
  const need=E.isCrisis(state)?state.rules.cityCrisisNeed:state.rules.cityNeed
  const candidates=state.players.flatMap(p=>E.allowedCards(state,p).filter(card=>card==='share'||card==='release').map(card=>{
    const plan=E.allocateDecision(state,p.id,{...decisions[p.id],card})
    const delta=plan.hubUnits+plan.warehouseRelease
    const sell=E.allocateDecision(state,p.id,decisions[p.id])
    const cost=(sell.marketUnits-plan.marketUnits)*E.marketPrice(state,p)-delta*E.hubPrice(state)
    return {id:p.id,card,delta,cost:cost+(p.role === 'contract' && !E.isCrisis(state) ? 10 : 0),spare:p.cash-p.goal}
  })).filter(x=>x.delta>0).sort((a,b)=>a.cost/a.delta-b.cost/b.delta || b.spare-a.spare || a.id.localeCompare(b.id))
  const picked=new Set()
  for(const c of candidates) if(fed<need && !picked.has(c.id)) {decisions[c.id].card=c.card;fed+=c.delta;picked.add(c.id)}
  // Prepare a single surplus farm when the forecast warns; do not take food away from today's households.
  if(E.currentEvent(state).kind==='warning' && state.round<C.rounds) {
    const saver=state.players.filter(p=>!picked.has(p.id)&&E.allowedCards(state,p).includes('store')&&p.cash>=p.goal).sort((a,b)=>b.cash-a.cash)[0]
    if(saver) decisions[saver.id].card='store'
  }
  return decisions
}
