# Chiang Mai Food Resilience — Two farming paths, one city

A pixel game for UTC2720 Project 2 about moving emergency food to Chiang Mai households during floods and market closures. Single-player mode has one farmer who chooses a role; pass-and-play and multiplayer support three to eight farmers and an Automatic or human Food Council over five rounds. Both farmer roles share one city meter; the host facilitates and holds no farming or Council seat.

Learning goal: balance farm income with keeping vulnerable households fed during floods and market closures. The primary audience is university students with little food-system knowledge; the secondary audience is adults in community workshops. Learn through choices, outcomes and a brief practice task; Why and Quick reference provide optional detail.

Guided first game starts with a normal market, then festival prices, a warning, a flood and a market closure. Uncheck it for shuffled events. Recorded round choices and four debrief prompts support a facilitated review without quizzes or scores for learning. Human playtesting with the target audiences is still needed; the automated tests verify game behaviour, not learning effectiveness.

## Run and check

```sh
npm ci
npm run dev
npm test
npm run build
node scripts/blind-play.mjs
```

Single-player and pass-and-play modes work offline without Firebase. In single-player mode, choose either the Mae Tha or contract farmer role; the automatic Council and five-round game remain the same. The host and phones use Firebase for multiplayer. The pure engine remains in `src/round2/`; game and policy numbers are in `config.ts`. Pixel assets live in `src/ui/` and do not import a reference project. The built app can be previewed with `npx vite preview`.

## Set up Firebase

1. Create a project in the [Firebase Console](https://console.firebase.google.com/). Register a **Web app** in Project settings and copy its web-app configuration.
2. In **Authentication → Sign-in method**, enable **Anonymous**. No player accounts or passwords are needed; Firebase persists the anonymous identity in the browser, allowing the same seat to return after refresh. See [anonymous authentication](https://firebase.google.com/docs/auth/web/anonymous-auth).
3. Create a **Realtime Database**, choose a region suitable for your players, and start in **locked mode**. Copy its exact database URL (including the regional hostname).
4. In the database **Rules** tab, replace the rules with [database.rules.json](database.rules.json) and publish them. Do not use open/test-mode rules: the supplied rules permit only the host to write game state, permit each phone to append its own actions, and restrict private views and receipts to their authenticated owner. See [Realtime Database security rules](https://firebase.google.com/docs/database/security/core-syntax).
5. Copy `.env.example` to `.env.local` and fill in the `VITE_FIREBASE_*` values. They map to the Web app's `apiKey`, `authDomain`, `databaseURL`, `projectId`, and `appId`. Restart Vite after editing the file.
6. In Authentication settings, include your deployed domain in **Authorized domains**; for local testing, include `localhost` and the laptop's LAN hostname/address if needed.

These are **web-client configuration values**, embedded in the built frontend. Never put an Admin SDK key, service-account JSON, or password in a `VITE_*` variable. Real environment files are gitignored. Firebase access is controlled by authentication and the database rules.

You can optionally deploy the rules with the Firebase CLI after configuring the project:

```sh
firebase login
firebase use --add
firebase deploy --only database
```

## Deploy to Vercel

1. Import this repository into [Vercel](https://vercel.com/docs/frameworks/frontend/vite), choose **Vite**, and use `npm run build` with output directory `dist`.
2. Add the five `VITE_FIREBASE_*` values in **Project Settings → Environment Variables** for each environment you use. They are read at build time; redeploy after changing them. See [Vercel environment variables](https://vercel.com/docs/environment-variables).
3. Optional: set `VITE_PUBLIC_APP_URL` to the deployed HTTPS URL; this is the base URL used for the host QR code. Otherwise, the current browser URL is used.
4. Deploy, add the deployed domain to Firebase Authentication's authorized domains, and open the deployed page on the host laptop.

The application uses query parameters (`?join=ABCD`) rather than path routing; no SPA rewrite is needed.

## Play

1. Choose Single player to select one farmer role, or Pass-and-play to select 3–8 farmers. Both modes let you choose policy None/A/B/C and optionally **Skip pest game**; pass-and-play also lets you choose an Automatic or human Council.
2. For multiplayer, create a room and join its QR/code from phones; a human Council uses its own phone. Each farmer picks a farm seat and a role (company contract or Mae Tha organic) in the lobby; pass-and-play picks a role per farmer on the setup screen. Group games need at least one farmer of each role, and roles stay fixed for all five rounds (replays keep them).
3. Try a short Sell/Share practice task, then read the current event and enter Grow: a 10-second seeded pest game, concurrent on phones and sequential offline. It is for flavour only and never changes the harvest. Company farmers spray; Mae Tha members hand-pick. Each farmer can Skip their own game, the host (or the single screen) can **Skip for everyone**, and missing phones time out.
4. Choose one available route card and, where permitted, a school/hospital promise for next round. Company farmers keep one produce route, **Sell to company**, and can choose to contribute $4 of personal cash to Council delivery funding. Company contributions are a simplified game choice, not a claim about existing arrangements in Chiang Mai. Phones have a 60-second planning timer; offline play has handoffs and no planning deadline.
5. After farmer submissions, the Council chooses one action or acts automatically. The seven pixel reveal steps advance automatically every 5 seconds. Next skips the current step; Pause reveal stops progression and animations; Skip jumps to the next round (or final results). Farmer personas use the entered names. Repeated channel introductions and per-round fact cards are omitted; Quick reference and Why explanations stay available.
6. Review cash-goal winners and the policy comparison; discuss four focused questions and add anonymous reflections to the word wall.

For local phone access, run `npm run dev -- --host 0.0.0.0` and use the laptop’s LAN URL rather than localhost. Multiplayer requires internet access and Firebase configuration.

## Rules and economics

Prices, harvests, costs and policy effects are simplified for gameplay. Company-contract farmer and Mae Tha organic farmer are two example farming paths; conventional farming does not necessarily mean having a company contract.


- All food is counted in whole crates (1 crate feeds 1 household) and all money in whole dollars. Farms start at $72 with a +$32 cash goal; individual wins require surviving all five rounds. Reaching a high cash balance cannot compensate for collective failure.
- Players choose their roles (at least one of each). Company farmers get 5 crates of input advance (debt) each round and harvest 10 crates before disruption. Debt is repaid first from accessible produce and unpaid debt carries forward. Company farmers have one option under every policy: the company buys everything left at a fixed $3/unit. Company produce, both repaid and bought, uses up open-market buyer capacity. During a market closure the company still pays, but all company produce rots (except Policy A's diversion). Simulations without chosen roles deal 40% company farmers reproducibly.
- Mae Tha members normally harvest 8 crates; round 1 soil recovery halves this. They pay $8 certification each round, receive a $1/crate organic market premium, and share a pooled organic buyer cap of 2.4 crates per farmer in the whole table (rounded to whole crates). Unsold fresh produce is waste; the phone shows profit toward the cash goal.
- Sell uses market buyers at $4 normally and $6 during a festival. Share prioritises the community food hub/kitchen and sells any remainder; the hub pays $1 in normal/festival/warning weeks and $2 in crises, while Council money lasts. School/hospital promises (4 crates) pay $3/crate, reserve next round’s harvest, and only half arrives in floods or closures. Extra crisis need must use the hub/reserve/Council, not school contracts.
- Store deposits farmer-owned food at $1/crate each round; pooled stock decays 25%, rounded down to lots of 4 crates. Release uses the owner’s stock. The separate Mae Tha community reserve never decays. All routes, including reserve releases, use available roads; floods halve transport now and harvest next round.
- Normal emergency need is 4 households per farmer; crisis need is 6 per farmer, rounded up to a lot of 4. The city meter is shown as the % of people with access to food (vulnerable households, schools and hospitals): community hub deliveries and school/hospital contracts raise it, while market sales supply the wider city. It starts at 75% and each unmet household lowers it. Initial reserve is 5 crates per farmer (rounded up to a lot of 4), Council budget $28 per farmer. Warnings are 60% forecasts, not certain floods.
- Every five-round deck contains at least one Flood and one Market closure. The eight-card deck is built and shuffled as before (same cards, same 60% forecast rule); if a shock is missing from rounds 1–5, a seeded swap moves it into a Normal/Festival round, avoiding the round after a warning where possible (a warning just before a swapped-in flood counts as correct). Decks average 2.25 shocks per game instead of 1.6. Policy comparisons replay the identical sequence.
- The Food Council coordinates food deliveries, buyers, community groups and transport; it does not own the food. A human Council can fund storage, arrange emergency purchases or extra trucks, or release the community reserve. Automatic Council buys reserve to fill projected need and finances submitted hub food; it preserves the farmer’s chosen card.

## Policy scenarios

| Scenario | Changes |
|---|---|
| None | Existing company channels and organic costs |
| A — company closure diversion | In closures 20% of company-taken produce reaches alternative channels, split between hospital and kitchen. Company farmers still have only the Sell to company option |
| B — cheaper organic farming | Certification $0, initial soil-recovery harvest 75%, pooled organic cap 3.6 crates per table farmer |
| C — emergency food bank | Reserve starts 0.8 crates per farmer larger (rounded), grows by 4 crates before each subsequent round, and releases automatically during crises |

A’s small emergency intake limit models partial adoption and receiving capacity; the diverted food remains constrained by roads. Policy settings are separate from the human Council’s round actions.

Policy comparisons are illustrative game scenarios, not predictions of real-world outcomes. The end screen replays the same event deck, role cohort, recorded farmer decisions and human Council actions under None. Any choice that is illegal under None falls back to Sell/no school promise. It compares shortage rounds, final % with access to food, company-farmer cash/debt, Mae Tha profit and waste, and reports fewer shortage rounds. An early city failure stops that replay; comparisons use the rounds recorded in the played game and are model experiments, not real-world forecasts.

## Balance evidence and tests

`blind-play.mjs` uses Mulberry32 event seeds 1–200, independent decision randomness, 3/5/8 farmers, five strategies, and four policies: **12,000 games**. It skips pest losses to isolate distribution and asserts conservation, road capacity, nonnegative budgets, deterministic replay and the balance targets. `simulate.mjs` remains an alias to the maintained audit.

Strategies are random legal cards + random promise, Sell + promise, Share + promise, random legal cards without promises, and coordinated routing using current known need and stock. Unsupported role choices fall back to Sell. Coordination feeds current need through low-opportunity-cost routes, sells surplus, and stores a surplus farm on a warning once its cash goal is met; it never examines future events.

See [policy-summary.md](reports/policy-summary.md), [blind-play.json](reports/blind-play.json) and [BUILD-LOG.md](BUILD-LOG.md) for final and before/after results. Learning sources preserve the supplied fieldwork/workshop attributions. The model simplifies real supply chains and does not independently verify those facts.

Tests cover deterministic allocation, debt/rot/soil/card restrictions, organic caps and costs, policy effects, recorded-decision replay, shared learning, concurrent action/revision handling, Grow deadlines, offline five-round play, anonymous reflections, and Firebase transaction/lease behavior.

## Multiplayer recovery and security

The host owns authoritative game state; phones append authenticated actions and receive private projections. Future events, forecast outcomes and others’ drafts stay off the public board. Actions are idempotent, the host serializes updates, and checkpoint/public/private/receipt writes are transactional. Persisted anonymous phone identities retain seats on reconnect; new identities after start spectate. A host lease prevents simultaneous controlling tabs. Host refresh can resume from the checkpoint; obsolete room versions require a new room.

Real `.env` files and Firebase keys must never be committed. The example contains blank configuration only. Mocked tests do not replace a live three-phone Firebase smoke test: no real keys were available for this build.

## Browser and deployment

Browser checks cover 360px controls, 1280px projector layout, pixel animation scaling, a full five-farmer Automatic Council game, and console errors; details and proof images are in BUILD-LOG. Browser testing uses the production preview to avoid dependency-cache collisions with simulations.

The previous deployment was `https://food-resilience-market.vercel.app/`; this merge has not been published there by this build. Build with `npm run build`, provide the Firebase environment values at build time, and deploy `dist` to the chosen host.
