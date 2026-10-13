// Card-based balance report, driving the real pure engine without changing config.
import { coordinate } from './strategies.mjs'
import assert from 'node:assert/strict'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { createServer } from 'vite'
const before = await readFile('src/round2/config.ts', 'utf8')
const vite = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: 'custom', cacheDir: 'node_modules/.vite-simulations', optimizeDeps: {noDiscovery:true,include:[]} })
const rng = (seed) => () => { seed = (seed + 0x6D2B79F5) >>> 0; let n = Math.imul(seed ^ seed >>> 15, seed | 1); n ^= n + Math.imul(n ^ n >>> 7, n | 61); return ((n ^ n >>> 14) >>> 0) / 2 ** 32 }
const q = (n) => Math.round(n * 100) / 100
try {
  const E = await vite.ssrLoadModule('/src/round2/engine.ts')
  const { ROUND2_CONFIG: C } = await vite.ssrLoadModule('/src/round2/config.ts')
  const tables = ['neverPromise', 'coordinated', 'sellPromise', 'sharePromise', 'random']
  function play(n, seed, table, policy = 'none') {
    const taps = rng(seed + 100000) // Independent decision stream: same event deck for every strategy.
    let state = E.createGame(Array.from({ length: n }, (_, i) => `Farm ${i + 1}`), rng(seed), { seat: 'automatic', policy })
    const seats = Array.from({ length: n }, (_, i) => table === 'selfish' ? 'selfish' : table === 'coordinated' ? 'cooperative' : table !== 'mixed' ? table : i % C.shareDivisor === 0 ? 'selfish' : 'cooperative')
    const assignments = Object.fromEntries(state.players.map((p, i) => [p.id, seats[(i + seed - 1) % n]]))
    while (!['gameOver', 'debrief'].includes(state.phase)) {
      state = E.advanceCouncil(state)
      const coordinated = table === 'coordinated' ? coordinate(E,C,state) : null
      for (const p of state.players) {
        const cooperative = assignments[p.id] === 'cooperative'
        const kind = E.currentEvent(state).kind
        let card = !cooperative ? 'sell' : kind === 'warning' && state.round < C.rounds ? 'store' : E.isCrisis(state) && E.warehouseUnits(state, p.id) > 0 ? 'release' : 'share'
        let promise = cooperative || assignments[p.id] === 'sellPromise' || assignments[p.id] === 'sharePromise'
        if (assignments[p.id] === 'sharePromise') card = 'share'
        if (['random', 'neverPromise'].includes(assignments[p.id])) {
          const choices = E.allowedCards(state,p)
          card = choices[Math.floor(taps() * choices.length)]
          promise = assignments[p.id] !== 'neverPromise' && taps() < 0.5
        }
        if(coordinated) ({card,promise}=coordinated[p.id])
        if(!E.allowedCards(state,p).includes(card)) card='sell'
        if(!E.canPromise(state,p)) promise=false
        state = E.updateDecision(state, p.id, { card, promise: promise && state.round < C.rounds })
      }
      state = E.finishDecisions(state)
      assert.ok(state.council.budget >= 0)
      for (const line of state.resolution.lines) {
        assert.ok(line.transportUsed <= line.transportCapacity + 0.001)
        assert.equal(q(line.harvest), q(line.contractUnits + line.marketUnits + line.hubUnits - line.warehouseReleased - line.reserveReleased + line.stored + line.spoilage + line.companyUnits - line.companyRotten))
      }
      if (state.phase === 'gameOver') break
      state = E.advanceRound(state)
    }
    return { n, seed, table, lost: state.phase === 'gameOver', endingRound: state.round, security: state.citySecurity, waste: state.totalWaste, reserveUsed: state.rules.warehouseStartingUnits - state.reserve, hub: state.totalHubUnits, goalCount: state.players.filter((p) => E.personalGoalPassed(state, p)).length, farmers: state.players.map((p) => ({ id: p.id, strategy: assignments[p.id], cash: p.cash, goal: p.goal, won: E.personalGoalPassed(state, p) })), scores: E.rankPlayers(state), history: state.history }
  }
  const seeds = Array.from({ length: 200 }, (_, i) => i + 1)
  const mean = (values) => q(values.reduce((s, v) => s + v, 0) / values.length)
  const policies = ['none','A','B','C']
  const rows = []
  for (const n of [3, 5, 8]) for (const table of tables) for (const policy of policies) {
    const batch = seeds.map((seed) => play(n, seed, table, policy))
    assert.deepEqual(batch[0], play(n, seeds[0], table, policy))
    const farmers = batch.flatMap((game) => game.farmers)
    rows.push({ farmers: n, table, policy, games: seeds.length, cityLosses: batch.filter((g) => g.lost).length, lossPercent: q(batch.filter((g) => g.lost).length / seeds.length * C.quantityPrecision), averageCash: mean(farmers.map((p) => p.cash)), selfishCash: farmers.some((p) => p.strategy === 'selfish') ? mean(farmers.filter((p) => p.strategy === 'selfish').map((p) => p.cash)) : null, cooperativeCash: farmers.some((p) => p.strategy === 'cooperative') ? mean(farmers.filter((p) => p.strategy === 'cooperative').map((p) => p.cash)) : null, winners: batch.reduce((s, g) => s + g.goalCount, 0), farmerRuns: n * seeds.length, averageGoalWinners: mean(batch.map((g) => g.goalCount)), farmerGoalWinPercent: q(farmers.filter(p=>p.won).length/farmers.length*100), averageWaste: mean(batch.map((g) => g.waste)), averageFinalSecurity: mean(batch.map((g) => g.security)) })
  }
  const noneRows = rows.filter(r=>r.policy==='none')
  const targets = [3, 5, 8].map((n) => ({ farmers: n, coordinatedBestCity: (()=>{const own=noneRows.find(r=>r.farmers===n&&r.table==='coordinated').lossPercent;return noneRows.filter(r=>r.farmers===n).every(r=>r.lossPercent>=own)})(), neverPromiseLossAtLeast90: noneRows.find((r) => r.farmers === n && r.table === 'neverPromise').lossPercent >= 90, shareGoalsUnder50: noneRows.find(r=>r.farmers===n&&r.table==='sharePromise').farmerGoalWinPercent < 50, coordinatedMostFarmerWinners: (()=>{const own=noneRows.find(r=>r.farmers===n&&r.table==='coordinated').farmerGoalWinPercent;return noneRows.filter(r=>r.farmers===n&&r.table!=='coordinated').every(r=>r.farmerGoalWinPercent<own)})(), noStrategyWins100: noneRows.filter((r) => r.farmers === n).every((r) => r.cityLosses > 0), randomLoss50to70: (() => { const rate = noneRows.find((r) => r.farmers === n && r.table === 'random').lossPercent; return rate >= 50 && rate <= 70 })(), sellPromiseLossAtLeast60: noneRows.find((r) => r.farmers === n && r.table === 'sellPromise').lossPercent >= 60, coordinatedLossUnder15: noneRows.find((r) => r.farmers === n && r.table === 'coordinated').lossPercent < 15 }))
  const policyTargets = [3,5,8].flatMap(n=>['A','B','C'].map(policy=>{
    const rate = (policy,table)=>rows.find(r=>r.farmers===n&&r.policy===policy&&r.table===table).lossPercent
    return {farmers:n,policy,randomLossAtLeast30:rate(policy,'random')>=30,randomImproves:rate(policy,'random')<rate('none','random'),coordinatedImproves:rate(policy,'coordinated')<rate('none','coordinated')}
  }))
  assert.equal(await readFile('src/round2/config.ts', 'utf8'), before)
  const report = { methodology: { seeds, rng: 'Mulberry32', runs: '200 seeds for five strategies at 3, 5 and 8 farmers: 12000 games total under None, A, B and C. Pest game skipped to isolate distribution.', neverPromise: 'Uniform random currently available card, without promises; role restrictions still apply.', sellPromise: 'Always Sell and promise each round except the last.', sharePromise: 'Always Share and promise when role restrictions permit; otherwise Sell (contract gift is once per game).' , random: 'Uniform random tap among currently available cards, with independent 50% contract toggle; no promises on the last round. Separate seeded decision stream preserves event comparability.', cooperative: 'Coordinate current known need: choose low-opportunity-cost Share/Release routes until need is covered, sell surplus, store a surplus farm on warnings when its cash goal is met; Mae Tha members promise for the next round. Does not inspect future events.', council: 'Automatic Council in every table: emergency-buy reserve to cover projected unmet need first, then pay for submitted hub deliveries; never override a farmer’s card. Transport and budget constrain actual delivery.', cash: 'Actual end-of-game cash, including early collective losses; only surviving farmers meeting their cash goal win.', waste: 'Spoiled harvest plus decay of farmer-owned stock; shared reserve never decays.' }, config: C, rows, targets, policyTargets }
  await mkdir('reports', { recursive: true })
  await writeFile(process.argv[2] ?? 'reports/blind-play.json', JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify({ rows, targets, policyTargets }, null, 2))
  for(const target of [...targets,...policyTargets]) for(const [key,value] of Object.entries(target)) if(typeof value === 'boolean') assert.ok(value, `Balance target failed: ${target.farmers} farmers / ${target.policy ?? 'None'} / ${key}`)
} finally { await vite.close() }
