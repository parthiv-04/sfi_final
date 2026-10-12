# Rebalance comparison

20 seeds per profile and size; Automatic Council; identical event RNG across profiles. Random taps use a separate seeded RNG, uniform among available cards, and a 50% independent promise toggle. Cash includes early collective losses; wins require reaching the cash goal and keeping the city alive.

Applied: contract price $4 → $3; cash goal $23 → $26; flood/closure contract arrival rate 100% → 50%. Crisis excess remains hub/reserve-only. Automatic Council no longer redirects Sell food into the hub; it pays for elected hub routes and reserve releases. Failed contract consignments are wasted, consume transport, and receive no payment. No other config changes were applied.

| Farmers | Profile | City loss before → after | Avg cash before → after | Goal winners before → after | Avg waste before → after |
| --- | --- | --- | --- | --- | --- |
| 3 | Sell | 100% → 100% | $37.68 → $33.78 | 0/60 → 0/60 | 6.90 → 6.95 |
| 3 | Coordinated | 0% → 5% | $35.63 → $28.91 | 60/60 → 43/60 | 6.65 → 9.06 |
| 3 | Mixed | 100% → 100% | $41.83 → $39.39 | 0/60 → 0/60 | 5.30 → 5.50 |
| 3 | Sell + promise | 0% → 30% | $47.96 → $41.41 | 60/60 → 42/60 | 4.55 → 7.33 |
| 3 | Share + promise | 0% → 0% | $42.88 → $36.15 | 60/60 → 60/60 | 4.43 → 7.39 |
| 3 | Random taps | 40% → 60% | $33.34 → $29.92 | 33/60 → 19/60 | 6.52 → 7.85 |
| 5 | Sell | 100% → 100% | $35.75 → $32.28 | 0/100 → 0/100 | 12.70 → 13.30 |
| 5 | Coordinated | 0% → 0% | $36.03 → $29.62 | 100/100 → 74/100 | 11.55 → 15.58 |
| 5 | Mixed | 5% → 70% | $42.73 → $40.50 | 94/100 → 29/100 | 9.82 → 10.75 |
| 5 | Sell + promise | 0% → 5% | $47.63 → $41.86 | 100/100 → 95/100 | 8.60 → 12.95 |
| 5 | Share + promise | 0% → 0% | $43.01 → $36.56 | 100/100 → 100/100 | 7.05 → 11.29 |
| 5 | Random taps | 5% → 25% | $33.87 → $30.95 | 85/100 → 60/100 | 12.15 → 13.94 |
| 8 | Sell | 100% → 100% | $36.34 → $32.84 | 0/160 → 0/160 | 19.45 → 20.25 |
| 8 | Coordinated | 0% → 0% | $36.12 → $29.72 | 160/160 → 121/160 | 19.05 → 25.35 |
| 8 | Mixed | 5% → 55% | $42.04 → $40.44 | 152/160 → 70/160 | 16.33 → 18.30 |
| 8 | Sell + promise | 0% → 5% | $47.71 → $42.06 | 160/160 → 152/160 | 13.15 → 20.35 |
| 8 | Share + promise | 0% → 0% | $42.95 → $36.46 | 160/160 → 160/160 | 11.50 → 18.45 |
| 8 | Random taps | 15% → 45% | $35.08 → $31.55 | 124/160 → 68/160 | 19.33 → 22.50 |

Targets: coordinated losses <15% pass at all sizes. Random losses 50–70% pass only at 3 farmers (60%; 5 farmers 25%; 8 farmers 45%). Sell+promise losses ≥60% fail at all sizes (30%, 5%, 5%).

Budget-only trials (2–6 per farmer), event-frequency trials (2–12 closure copies; 1–3 normal copies; budgets 5–9 per farmer), and starting-security/budget trials (security 0.8–2 per farmer; budgets 6–10) found no common configuration meeting every target at all three sizes. These were in-memory counterfactuals only, not production edits. A narrower event-deck/starting-security/budget search, checked together at all sizes, is the next config option; no unverified numbers are recommended here.

No claim of “no dominant strategy” is warranted: Share+promise still survives every tested seed, and Sell+promise still earns more cash. Twenty seeds and simple table profiles do not establish strategic balance.
