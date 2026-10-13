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

## 5 — Mixed roles, organic economics and Share balance correction
Deals seeded 40% company farmers, 60% Mae Tha members; company input advances/debt, one-off kitchen gift, restricted cards, closure rot, slightly higher harvest, spray/hand modes, soil recovery, $2 organic certificate fee, +$1 premium, pooled buyer cap and phone profit bar are implemented. All non-card paths validate role restrictions. Kept five rounds and the +$8 personal goal. Reduced normal/festival/warning hub payout to $1 (crisis remains $2); updated coordination to choose enough current routes to feed the city and sell surplus, without future deck knowledge. Preserves the requested affordability/fair-price trade-off.

To satisfy the user's additional Share test together with the specified organic economics, role economics were checked together: the old uniform-farm model lacked organic costs. Initial city security now 1.9/farmer, reserve ceil(1.1/farmer), crisis need ceil(1.5/farmer); all original targets and additional farmer-winner checks pass. Contract farmers' unavailable promises/gifts fall back to Sell in blind strategies. Pest game is skipped in balance reports to isolate distribution (explicit host option).

| Farmers | Strategy | Old loss | Mixed loss | Old goal-winners | Mixed goal-winners |
|---|---|---:|---:|---:|---:|
| 3 | neverPromise | 100% | 95% | 0.0% | 2.5% |
| 3 | coordinated | 4% | 6% | 82.0% | 71.17% |
| 3 | sellPromise | 62.5% | 82% | 37.5% | 18% |
| 3 | sharePromise | 7% | 6% | 93.0% | 28.67% |
| 3 | random | 68% | 57% | 29.0% | 25.17% |
| 5 | neverPromise | 100% | 98% | 0.0% | 1.2% |
| 5 | coordinated | 1% | 6.5% | 86.5% | 66.8% |
| 5 | sellPromise | 62.5% | 92% | 37.5% | 8% |
| 5 | sharePromise | 1.5% | 7% | 98.5% | 35.4% |
| 5 | random | 64.5% | 67% | 31.7% | 20.5% |
| 8 | neverPromise | 100% | 99% | 0.0% | 0.75% |
| 8 | coordinated | 3% | 1.5% | 85.81% | 71.56% |
| 8 | sellPromise | 67% | 89% | 33.0% | 11% |
| 8 | sharePromise | 6% | 2.5% | 94.0% | 35.25% |
| 8 | random | 68% | 60.5% | 28.38% | 25.25% |

Coordinated has the most farmer goal-winners at all counts and the lowest city loss (tie at 3). Share+promise goal-winners stay below 50%. Tests cover debt carryover, closure rot, soil recovery, card restrictions, organic costs/cap and fractional harvest. `npm test`: 95 passed; `npm run build`: passed. Fact plumbing was integrated with role projection; fact selection validation follows in milestone 6.

## 6 — Facts and debrief
Merged all 12 reference facts with their supplied source lines (fieldwork/workshop attributions, not independently verified publications), event/waste/soil matching and game-wide deduplication. One shared fact appears after each reveal. Channel cards use one shared session key offline; new offline games get a fresh run id. Debrief combines themes from both sets into 10 nonduplicate questions; anonymous word wall retained. Launcher illustrates the two farming paths story. `npm test`: 97 passed; `npm run build`: passed.

## 7 — Browser and integration checks
Finished offline connection status, responsive controls, role scenes, grow pause/deadline handling and reveal layout. Chrome checks at 360×800 and 1280×900 showed no horizontal overflow. Completed a five-farmer, five-round automatic-Council browser game and checked the final results; browser console had no errors. Saved launcher, setup and both farmer-role screenshots in reports. Final rebuilt first-round browser smoke also passed. Firebase three-phone testing remains unavailable because only the blank .env.example is present. No public deployment was performed. Before reference cleanup, `npm test`: 106 passed (including copied reference tests); `npm run build`: passed.

## 8 — Policies, replay, final audit and cleanup
Added selectable policies A/B/C and a recorded-choice replay against None using identical roles, events and pest outcomes. Comparison reports city shortages/security, company cash/debt, Mae Tha profit and waste; illegal replay choices fall back to legal choices. Policy A models partial alternative intake (20%), a limited company school promise (20%) and splits closure arrivals between hospital and hub. Policy B reduces certification costs and supports organic recovery/buyers. Policy C adds and replenishes a community reserve. These are illustrative game assumptions, not calibrated Chiang Mai measurements.

Final configuration supersedes earlier milestone tuning: starting security 1.7/farmer, maximum 2.3/farmer, reserve ceil(1.1/farmer), recovery 0.75. The final blind-play audit covers 12,000 games: 200 seeds × 3 farmer counts × 5 strategies × 4 policy settings. All configured balance targets and determinism, food accounting, road and budget checks pass. Policy A/B/C reduce random and coordinated city losses at each farmer count while retaining at least 30% random losses. See reports/blind-play.json and reports/policy-summary.md for all strategies and policies.

| Farmers | None: coordinated city loss | None: Share + promise city loss | Share + promise farmer goal-winners | Coordinated farmer goal-winners |
|---|---:|---:|---:|---:|
| 3 | 4.5% | 6% | 28.67% | 71.83% |
| 5 | 11% | 11.5% | 35.40% | 66.90% |
| 8 | 3% | 6% | 34.13% | 71.06% |

Coordinated play performs best for city and farmer goal-winners at all three counts. Share earns less than Sell in normal and festival rounds. Removed the copied pixel-reference directory only after final policy/browser verification; original Downloads source is untouched. Removed temporary tuning scripts/reports. Suggested additional realism wording/mechanics changes were not applied, per the user's request for suggestions only.

After reference cleanup, final project verification: 86 tests across 8 files passed; production build passed. The 20 removed tests belonged to the copied reference project.

## 9 — Exact prices and a clear trade-off on every option
Each phone card (Sell, Share, Store, Release, Sell to company), the promise toggle and the Council's Mae Tha reserve now show exact You get / City gets / Catch lines from new engine helpers (`optionOutcome`, `promiseOutcome`, `organicBuyersLeft`), with a "Why?" explanation behind each. The old cash range is gone. Market sales, which depend on other farms, are shown as the exact amount "if all N sell", and the catch line gives the exact number of buyers left. Promises show the normal and flood/closure values. The phone shows "Your choice: … · earned … · fed …" after each reveal (and for each farmer in single-screen mode). Ambiguity: the sourced facts in `learning.ts` keep their original "about"/"3-4x" wording rather than inventing precision; card cash excludes the fixed organic certificate. `npm test`: 111 passed; `npm run build`: passed; `blind-play.mjs`: all balance targets pass (no balance numbers changed).

## 10 — Conditions change with players' choices (feedback loops)
Added three engine loops with values in `config.loops`. (1) Security ending a round below 40% of max raises next round's market price by $1 and removes 0.2 buyers per farmer for each $1 above normal (stored on the event card as `surcharge`/`buyersLost`, so prices, previews and reveal agree; a closed market is not raised). (2) At least half the farms choosing Share or Release in a crisis adds $1 per farmer to next round's Council budget. (3) A flood right after a warning round with no storing is flagged "No one stored before the flood." Each loop has a one-line pixel caption in the reveal (and the planning board shows the price rise). A "Loops in this game" debrief section draws the three loops as arrow cycles with +/− links, R/B labels and the rounds each loop fired. Replays and the policy comparison start from the deck without loop effects (`baseEvents`). Engine tests cover each loop. `npm test`: 116 passed; `npm run build`: passed; `blind-play.mjs`: all balance targets pass.

## 10a — Whole numbers and "% with access to food" (playtest request)
Requested mid-run: no decimals, and food security named as the percentage of people with access to food. Food is now counted in whole crates (4 per original unit) and every fixed dollar amount is ×4 (start $72, goal +$32, certificate $8, Council $28/farmer, extra trucks $24), so the economics are unchanged while every quantity and price is a whole number. Market sales, Council payments, contract halving and loop/policy fractions round to whole crates; Share, storage decay, crisis need, reserve and market capacity round in lots of 4 crates (`roundingLot`, `roundUpToLot`) to keep the original whole-unit rounding. Food security is shown everywhere as a whole % of people with access to food (`accessPercent`); the households scene draws one house per 4 households. Balance after the rescale: coordinated, Share+promise and random results are identical to milestone 10 at 3/5/8 farmers; neverPromise loss 90.5/98.5/95.5% and sellPromise 100%. `npm test`: 116 passed; `npm run build`: passed; `blind-play.mjs`: all balance targets pass.

## 11 — Shoppers react to price (affordability vs fair farmer price)
New `config.shoppers`: when the market price is above the normal $4, 0.8 shoppers per farmer per $1 say "Why is it so high?" and walk off (exact, whole shoppers; their crates go unsold). This replaces milestone 10's separate lost-buyer count, so the low-security price rise, festivals and floods all use one mechanism. The organic premium turns 0.8 organic shoppers per farmer away every open-market week ("Organic? Too dear!"), more often than general shoppers; the organic buyer pool was raised by the same 0.8/farmer (2.4→3.2, Policy B 3.6→4.4), so normal-week organic sales are unchanged. The market reveal adds a shopper scene (buyers walk to the stall, walk-offs show a speech bubble and leave) with exact counts. The households scene splits unmet households into "Food here, but too expensive" (min of unmet and market food offered but unsold) and "No food", marking priced-out houses with $$. Phone Sell catch states the walk-offs. Ambiguity: the debrief already had ten questions (an earlier test caps it at ten), so the new question is merged into Affordability: "When was food too expensive for people even though it was there? Who paid for a fair farmer price?" Engine tests cover walk-offs, organic walk-offs and the split. `npm test`: 119 passed; `npm run build`: passed; `blind-play.mjs`: all balance targets pass.

## 12 — Explain the organic trap
Mae Tha members see a skippable three-panel animated story in round 1 (soil recovery with sprouts appearing, certificate coins flying away, organic shoppers walking off), one line each, with values from config (half harvest, $8 certificate after the crate rescale; Policy B shows 75% and a free certificate). The phone profit bar adds running totals "Spent on certificate" and "Lost to soil recovery" (crates), tracked exactly by the engine as `certificatePaid` and `soilLost`. The end screen adds "Two farming paths": contract farmers vs Mae Tha members side by side (average cash, company debt, food wasted, households fed per farmer) with "Organic pays off later. Contract farming pays now but locks you in debt." Ambiguity: the spec's "$2 certificate" is $8 after the whole-number rescale; the screen reads the config value. No balance numbers changed. `npm test`: 121 passed; `npm run build`: passed; `blind-play.mjs`: all balance targets pass.

## 13 — Characters with a profile and destiny
`src/characters.ts` holds 6 company-contract and 6 Mae Tha profiles (pixel portrait colour, name, age, family, starting situation), written only from facts already in `learning.ts` (company advances, no say over crop or price, COVID income loss, Mae Tha's debt-escape founding, mixed crops, three-year organic conversion, off-size vegetables) and marked "Fictional composite based on our fieldwork facts." The engine deals distinct profiles within each role with one seeded draw taken after every other draw, so decks and roles are unchanged. Phones show "Meet your farmer" before round 1 and the character's name and age on the plan screen. At the end each farmer's phone (and every farmer in single-screen mode) shows a one-paragraph destiny chosen from 6 contract and 5 Mae Tha templates using final cash, debt, the city result, households fed and the round-by-round `debtAfter` the engine now records. Ambiguity: a contract farm normally repays each advance in the same round, so "paid off the company in round N" means clearing a debt that carried over; farms that never fell behind get their own templates. `npm test`: 126 passed; `npm run build`: passed; `blind-play.mjs`: all balance targets pass.
