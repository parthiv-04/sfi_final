# Build log

Updated request includes organic economics and policy scenarios (step 8). Reference copied from Downloads; original is untouched.

## 1 — Balance

Existing requested contract changes were already present. Tuned starting security to 1.5 per farmer and reserve to ceil(0.4 per farmer); maximum security remains 2 per farmer. 200 identical Mulberry32 event seeds per strategy/count; automatic Council. Never-promise uses random available cards with promises disabled.

| Farmers | Strategy | Before city loss | After city loss |
|---|---|---:|---:|
| 3 | neverPromise | 100% | 100% |
| 3 | coordinated | 4.5% | 4% |
| 3 | sellPromise | 25.5% | 62.5% |
| 3 | sharePromise | 6% | 7% |
| 3 | random | 50.5% | 68% |
| 5 | neverPromise | 100% | 100% |
| 5 | coordinated | 0% | 1% |
| 5 | sellPromise | 4% | 62.5% |
| 5 | sharePromise | 0% | 1.5% |
| 5 | random | 25% | 64.5% |
| 8 | neverPromise | 100% | 100% |
| 8 | coordinated | 1.5% | 3% |
| 8 | sellPromise | 7% | 67% |
| 8 | sharePromise | 5% | 6% |
| 8 | random | 38% | 68% |

All milestone 1 targets pass at every size. Baseline: 87 tests and build passed; milestone checks recorded with commit. Dependency install could not reach registry, so reused the matching local node_modules from the sibling game.

## 2 — Pixel art system
Ported sprite grids/SVG renderer, Stage/Backdrop/Pixel/Crate/Coin/CountUp and ink/paper/Courier/button/animation styles. Removed external font loading. Responsive pixel styles cover launcher, host, phone and single-screen; no engine changes. `npm test`: 87 passed; `npm run build`: passed.

## 3 — Pixel reveal
Adapted reference truck/crate, flood, closure and household animation patterns to the real Resolution type. Seven original two-second reveal steps and Skip retained, with exact small labels; reduced motion jumps to completion. Household display scales to crisis need at 8 farmers. `npm test`: 87 passed; `npm run build`: passed.

## 4 — Pest Grow step
Ported deterministic mini-game/rng with 15-second play, loss capped at 1 unit in config, room-code seed + round, concurrent phones and sequential offline turns. Added pre-game Skip pest game, host countdown, duplicate/invalid-result rejection and host timeout for missing phones. Chose no timed help overlay so all players share the 15-second window. `npm test`: 89 passed; `npm run build`: passed.
