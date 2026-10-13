# Chiang Mai Food Resilience — Two farming paths, one city

A pixel game for UTC2720 Project 2 about moving emergency food to Chiang Mai households during floods and market closures. Three to eight farmers and an Automatic or human Food Council play five rounds. Both farmer roles share one city meter; the host facilitates and holds no farming or Council seat.

## Run and check

```sh
npm ci
npm run dev
npm test
npm run build
node scripts/blind-play.mjs
```

Single-screen mode works offline without Firebase. The host and phones use Firebase for multiplayer. The pure engine remains in `src/round2/`; game and policy numbers are in `config.ts`. Pixel assets live in `src/ui/` and do not import a reference project. The built app can be previewed with `npx vite preview`.

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

1. Choose single-screen or host mode; select 3–8 farmers, Automatic or human Council, policy None/A/B/C, and optionally **Skip pest game**.
2. For multiplayer, create a room and join its QR/code from phones; a human Council uses its own phone.
3. Read shared context/event cards, then Grow: a 15-second seeded pest game, concurrent on phones and sequential offline, with up to one harvest unit lost. Company farmers spray; Mae Tha members hand-pick. Missing phone results time out with the configured maximum loss.
4. Choose one available route card and, where permitted, a school/hospital promise for next round. Phones have a 60-second planning timer; offline play has handoffs and no planning deadline.
5. After farmer submissions, the Council chooses one action or acts automatically. Follow the seven pixel reveal steps, use Skip for a short session, and read one sourced fact per round.
6. Review cash-goal winners and the policy comparison; discuss ten questions and add anonymous reflections to the word wall.

For local phone access, run `npm run dev -- --host 0.0.0.0` and use the laptop’s LAN URL rather than localhost. Multiplayer requires internet access and Firebase configuration.

## Rules and economics

- Farms start at $18 with a +$8 cash goal; individual wins require surviving all five rounds. Reaching a high cash balance cannot compensate for collective failure.
- Roughly 40% are company contract farmers, dealt reproducibly. Each round advances 1.25 produce units of debt and harvests 2.5 units before disruption/pest losses. Company debt is repaid first from accessible produce and unpaid debt carries forward. Cards are Sell and a single community-kitchen gift; school promises and repeated gifts open under A. During closure, company-taken food rots under None.
- Mae Tha members normally harvest 2 units; round 1 soil recovery halves this. They pay $2 certification each round, receive a $1 organic market premium, and share a pooled organic buyer cap of 0.6 units per farmer in the whole table. Unsold fresh produce is waste; the phone shows profit toward the cash goal.
- Sell uses market buyers at $4 normally and $6 during a festival. Share prioritises hub food and sells any remainder; the hub pays $1 in normal/festival/warning weeks and $2 in crises, while Council money lasts. School/hospital promises pay $3, reserve next round’s harvest, and only half arrives in floods or closures. Extra crisis need must use the hub/reserve/Council, not school contracts.
- Store deposits farmer-owned food at $1/unit each round; pooled stock decays 25%, rounded down. Release uses the owner’s stock. Mae Tha’s separate shared reserve never decays. All routes, including reserve releases, use available roads; floods halve transport now and harvest next round.
- Normal emergency need is one unit per farmer; crisis need is ceil(1.5 per farmer). Initial security is 1.7 per farmer, maximum 2.3, and a fully fed round recovers 0.75 points. Initial reserve is ceil(1.1 per farmer), Council budget $6 per farmer. Warnings are 60% forecasts, not certain floods.
- A human Council can support storage, buy food, hire trucks, or release reserve. Automatic Council buys reserve to fill projected need and finances submitted hub food; it preserves the farmer’s chosen card.

## Policy scenarios

| Scenario | Changes |
|---|---|
| None | Existing company channels and organic costs |
| A — more company channels | Company farmers can promise 0.2 units to schools/hospital and Share repeatedly; in closures 20% of company-taken produce reaches alternative channels, split between hospital and kitchen |
| B — cheaper organic farming | Certification $0, initial soil-recovery harvest 75%, pooled organic cap 0.9 units per table farmer |
| C — emergency food bank | Reserve starts 0.2 units per farmer larger, grows by one unit before each subsequent round, and releases automatically during crises |

A’s small school and emergency intake limits model partial adoption and receiving capacity; added channels remain constrained by roads. Policy settings are separate from the human Council’s round actions.

The end screen replays the same event deck, role cohort, recorded farmer decisions, crop losses and human Council actions under None. Policy-exclusive choices fall back to Sell/no school promise. It compares shortage rounds, final security, company-farmer cash/debt, Mae Tha profit and waste, and reports fewer shortage rounds. An early city failure stops that replay; comparisons use the rounds recorded in the played game and are model experiments, not real-world forecasts.

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
