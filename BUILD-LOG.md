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
