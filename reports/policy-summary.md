# Final balance and policy report

200 seeded games per strategy, table size and policy; 12,000 games. Each cell is **city loss rate / average farmer cash**. Pest game skipped to isolate distribution. Events use the same seeds across policies; decisions obey role restrictions.

| Farmers | Strategy | None | A | B | C |
|---|---|---:|---:|---:|---:|
| 3 | random | 56.5% / $23.53 | 47% / $22.85 | 54.5% / $30.14 | 47% / $22.77 |
| 3 | sellPromise | 60% / $32.11 | 56% / $32.32 | 60% / $38.48 | 41% / $33.26 |
| 3 | sharePromise | 6% / $25.35 | 4.5% / $22.86 | 6% / $32.34 | 1.5% / $25.35 |
| 3 | neverPromise | 91.5% / $20.80 | 86.5% / $19.97 | 88% / $27.01 | 82% / $19.93 |
| 3 | coordinated | 4.5% / $28.43 | 1.5% / $28.36 | 4% / $36.02 | 0.5% / $28.43 |
| 5 | random | 65% / $23.99 | 48.5% / $23.49 | 59% / $29.66 | 60% / $23.23 |
| 5 | sellPromise | 94% / $28.08 | 89% / $29.74 | 94% / $33.16 | 54.5% / $29.66 |
| 5 | sharePromise | 11.5% / $26.11 | 6% / $23.11 | 11.5% / $32.29 | 7.5% / $26.05 |
| 5 | neverPromise | 93% / $21.62 | 88% / $21.31 | 92% / $27.06 | 91% / $20.53 |
| 5 | coordinated | 11% / $28.00 | 2% / $27.88 | 6.5% / $34.58 | 6.5% / $27.92 |
| 8 | random | 58.5% / $24.81 | 43% / $24.20 | 54.5% / $31.04 | 55.5% / $24.16 |
| 8 | sellPromise | 94% / $29.43 | 89% / $30.78 | 94% / $34.81 | 57.5% / $31.03 |
| 8 | sharePromise | 6% / $25.99 | 3.5% / $23.15 | 6.5% / $32.52 | 1.5% / $25.95 |
| 8 | neverPromise | 93% / $22.61 | 89% / $22.19 | 91% / $28.62 | 96.5% / $21.71 |
| 8 | coordinated | 3% / $28.29 | 1.5% / $28.15 | 2.5% / $35.38 | 1.5% / $28.26 |

## Farmer goal-winners under None

| Farmers | Share + promise | Coordinated | Share city loss | Coordinated city loss |
|---|---:|---:|---:|---:|
| 3 | 28.67% | 71.83% | 6% | 4.5% |
| 5 | 35.4% | 66.9% | 11.5% | 11% |
| 8 | 34.13% | 71.06% | 6% | 3% |

Every original None target passes, and each A/B/C scenario lowers random and coordinated city losses at every tested table size; random play still loses at least 30% under each policy. Coordinated play has the lowest city loss and most farmer goal-winners under None. Cheap organic farming deliberately raises farmer goal completion under B; coordinated still beats Share on farmer goal completion there. These are results on fixed seeds, not guarantees about all possible games.
