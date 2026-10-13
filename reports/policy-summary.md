# Final balance and policy report

200 seeded games per strategy, table size and policy; 12,000 games. Each cell is **city loss rate / average farmer cash**. Pest game skipped (it never changes the harvest). Events use the same seeds across policies; decisions obey role restrictions: company farmers can only Sell to the company at $3/unit.

| Farmers | Strategy | None | A | B | C |
|---|---|---:|---:|---:|---:|
| 3 | random | 63% / $23.15 | 60% / $23.18 | 57.5% / $29.58 | 53.5% / $22.27 |
| 3 | sellPromise | 60% / $30.92 | 57.5% / $31.03 | 60% / $37.27 | 39.5% / $31.94 |
| 3 | sharePromise | 7% / $24.83 | 6% / $24.97 | 6% / $32.06 | 3.5% / $24.77 |
| 3 | neverPromise | 94.5% / $20.69 | 92% / $20.64 | 92% / $26.66 | 89% / $19.58 |
| 3 | coordinated | 7% / $28.10 | 4% / $28.15 | 4.5% / $34.81 | 2.5% / $27.98 |
| 5 | random | 67.5% / $23.00 | 65% / $23.05 | 64.5% / $28.49 | 64.5% / $22.18 |
| 5 | sellPromise | 92% / $27.59 | 79% / $27.74 | 92% / $33.20 | 48% / $28.33 |
| 5 | sharePromise | 7% / $25.43 | 6.5% / $25.58 | 7% / $31.90 | 5% / $25.36 |
| 5 | neverPromise | 95.5% / $20.57 | 94% / $20.56 | 94% / $25.77 | 96% / $19.52 |
| 5 | coordinated | 7% / $27.43 | 6.5% / $27.51 | 6.5% / $33.58 | 5% / $27.32 |
| 8 | random | 68% / $24.07 | 63% / $24.12 | 61.5% / $30.03 | 67.5% / $23.35 |
| 8 | sellPromise | 92% / $29.15 | 89% / $29.31 | 92% / $35.03 | 55% / $29.84 |
| 8 | sharePromise | 7% / $25.42 | 4% / $25.55 | 6% / $32.14 | 4.5% / $25.30 |
| 8 | neverPromise | 95% / $21.89 | 94.5% / $21.92 | 93.5% / $27.57 | 97.5% / $20.97 |
| 8 | coordinated | 6% / $27.85 | 4% / $27.90 | 3.5% / $34.30 | 3.5% / $27.70 |

## Farmer goal-winners under None

| Farmers | Share + promise | Coordinated | Share city loss | Coordinated city loss |
|---|---:|---:|---:|---:|
| 3 | 28.33% | 70.33% | 7% | 7% |
| 5 | 34% | 65.2% | 7% | 7% |
| 8 | 31.87% | 69.94% | 7% | 6% |

Every None target passes, and each A/B/C scenario lowers random and coordinated city losses at every tested table size; random play still loses at least 30% under each policy. Coordinated play has the lowest city loss and most farmer goal-winners under None. To keep these targets after company farmers lost the kitchen route, the starting reserve rose from ceil(1.1) to ceil(1.25) units per farmer and full-need recovery from 0.75 to 0.85. These are results on fixed seeds, not guarantees about all possible games.
