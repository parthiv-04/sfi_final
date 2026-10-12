# Food Resilience Market

React + TypeScript + Vite. Three to eight farms and a human or Automatic Food Council play five rounds. The host is an overseer, never a farmer or Council player. The pure, deterministic rules engine is `src/round2/engine.ts`; all game numbers are in `src/round2/config.ts`.

## Run locally

Use Node 24 LTS (or Node 22.12+).

```sh
npm ci
npm run dev
```

Open the printed URL. Choose **Single-screen mode** to play without Firebase or internet access. This uses the existing engine and pass-and-play interface.

```sh
npm test
npm run build
```

All direct package dependencies are pinned to exact versions; `package-lock.json` pins the resolved dependency tree.

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

## Play a room

1. On the laptop/projector, choose **Host a room**, select **3–8 farmers** (default 5), and select a human or Automatic Council. The Council does not count toward the farmer count. With fewer than five farmers, Automatic Council is selected by default.
2. Create the room. Phones scan its QR code or choose **Join a room**, enter the four-letter code and name, and choose a seat. A human Council needs its own phone; the host only oversees.
3. Fill the chosen seats, or start with the currently joined farmers when at least three have joined. Food need, reserve, security, budget and market capacity scale to the actual farmer count.
4. Read the shared how-to and context cards, then the event and harvest cards. **Next** and **Skip** keep everyone together. The host has **?** and a **Cards** library throughout.
5. All farmers decide together within 60 seconds: **Sell**, **Share**, **Store**, or **Release** their own stored food. Optionally promise one school/hospital unit next round, then press **Submit**. Individual choices stay private until resolution; the host sees only an aggregate households-fed preview and submission ticks. Single-screen mode passes once between farmers without a timer.
6. After all submissions or the deadline, a human Council chooses its action. Automatic Council first buys reserve deliveries to cover need, then funds additional crisis hub deliveries when it can. The shared screen explains what it did.
7. The host reveals the event, channel outcomes, households fed and security, about two seconds per step, or presses **Skip**. Advance to the next round. The host can pause/resume, end the timer early, replace a disconnected farmer with a spectator, or end the game.
8. The final screen shows city survival, cash-goal winners, ranking, waste and food history. **Discuss together** leads through seven questions and an anonymous reflection word wall. Replay the same events or start a fresh game with the same seats.

For phones on the same Wi-Fi during local development:

```sh
npm run dev -- --host 0.0.0.0
```

Open Vite's **Network** URL on the laptop, then create the room. A QR containing `localhost` or `127.0.0.1` cannot reach your laptop from another phone. Firebase still requires internet access; use single-screen mode when offline.

## Reconnect and recovery

- **Phone refresh/reconnection:** the browser's persisted Firebase identity owns the seat, not the typed name. The saved room/name automatically rejoin the same seat. Pending actions and their IDs survive a refresh; retrying an action cannot apply it twice.
- **New browser/device or cleared browser storage:** this is a new identity. After the game starts it spectates; it cannot claim another player's seat by typing their name.
- **Host closes/disconnects:** Firebase `onDisconnect` presence plus a heartbeat displays **Host disconnected** on phones. Detection may take up to approximately 16 seconds. Phones pause game actions while the host is unavailable. See [Firebase presence](https://firebase.google.com/docs/database/web/offline-capabilities).
- **Host refresh:** choose **Resume room** in the same browser. The private checkpoint restores the engine, seat assignments and processed-action receipts. Each page instance gets a fresh session ID, even when a duplicated tab inherits sessionStorage. A transactional host lease rejects a second active tab. A disconnected tab can be replaced when its presence goes offline, or after the lease expires. Checkpoint version checks prevent stale publications.
- **Host loses connection during an action:** checkpoint, public/private projections, receipt and queue removal are committed together in one database transaction. No local engine state advances unless that transaction succeeds. Use **Reconnect / resume host** if an error remains.

## Architecture and validation

- `src/Launcher.tsx`: lazy mode selection. Offline, host and phone bundles are separate.
- `src/multiplayer/hostModel.ts`: action parsing, seat/turn/revision checks, existing engine calls, and public/private projections. Host-only.
- `src/multiplayer/controller.ts`: serial queue processing and idempotent actions.
- `src/multiplayer/firebase.ts`: anonymous authentication, transactional room/checkpoint writes, queues, receipts, leases and presence.
- `src/multiplayer/PlayerView.tsx` and `PhoneControls.tsx`: mobile presentation and action payloads. They do **not** import or run the engine.
- `database.rules.json`: public board access, host-owned authoritative state, actor-owned queues and UID-scoped private views.

The host is trusted and remains the single source of truth. Firebase transports actions and projected views; phones cannot directly write game state. Future events, random forecast outcomes and individual drafts stay off the public board. Phones receive their own farm and plan. The current event is public before planning.

The mocked-realtime tests cover ownership, seat conflicts, reconnects, late spectators, malformed/forged/stale actions, existing engine validation, private projections, simultaneous submitted choices, timer boundaries, serial processing, checkpoint failures, duplicate retries and competing host sessions.

## Live smoke test

After configuring your project, use a laptop and phones (or separate browser profiles with distinct anonymous identities):

- Create a room; verify both the room code and QR join link.
- Fill all seats; start; verify all farmers can select and submit choices at the same time.
- Wait for the 60-second timer; verify choices resolve and the channel-by-channel reveal can be skipped.
- Send a malformed action in a test client; verify the rejection appears only on that phone.
- Refresh a phone; verify its seat and private view return without taking a new seat.
- Join a new browser after start; verify it can only spectate.
- Duplicate the host tab; verify it cannot resume the room while the original is connected.
- Close the host tab; verify **Host disconnected** appears, then resume the host and finish a round.
- Rooms created under the previous rules cannot be resumed; start a new room after updating.

A live Firebase project is required for this end-to-end smoke test; mocked tests do not substitute for checking the configured project's authentication, database rules and network connectivity.

## Live deployment

Production: https://food-resilience-market.vercel.app/

This deployment was published from the locally built `.vercel/output` bundle. The production build leaves `VITE_PUBLIC_APP_URL` blank so QR links use the HTTPS deployment origin. The GitHub auto-deploy connection was not established; future code changes require another deployment.

## Current rules and interpretation

- Each farm starts with $18 and a $26 cash goal, and harvests 2 units each round. Floods halve transport now and harvest next round. Events set a single market price and buying capacity. Warnings have a seeded 60% probability of a flood next round.
- With `n` farmers: normal need is `n`, crisis need is `ceil(1.4n)`, security starts/caps at `2n`, reserve starts at `ceil(1.2n)`, and Council budget is `6n`. Market capacity scales by event; per-farm harvest, transport and contract limits stay fixed.
- **Sell** sends available harvest to market; **Share** sends half to market and the rounded-up half to the hub; **Store** deposits available harvest; **Release** moves your own stored food to the hub and fresh harvest to market. Road capacity limits movement. Unmoved fresh food and unsold market food spoil; unmoved stored food stays stored.
- A promise signs at most 1 unit for next round at $3, versus $4 at the normal market. Due contracts have first priority; floods and market closures halve arrivals and pay only for food that arrives. Failed consignments count as waste and still consume transport. Contracts count toward normal household need. The extra crisis need must be met through the hub or reserve.
- Each unmet unit subtracts 1 from security. Meeting all need restores 1 up to the scaled cap. At zero everyone loses. If the city survives, farmers reaching their cash goal win; rank by cash. Ending early awards no wins.
- Farmer stock costs $1/unit at round end, then pooled stock decays 25%, rounded down, oldest first. Mae Tha's separate reserve never decays, incurs no farmer storage fees and gives no farmer payout. All reserve deliveries still use transport.
- Each farm has 3 transport units, halved during flood. Contracts have priority, followed by Council purchases, hub deliveries, market and storage. Council reserve releases use spare transport after farmers' routes.
- Human Council actions: support up to 4 deposits at $1/unit, buy up to 4 units from one farm at $3/unit, or add 4 transport per farm for $6. Reserve releases can accompany an action. Ordinary hub food pays $2/unit from the same budget and only funded food moves. Automatic Council buys reserve at $3/unit when need is short, then funds the submitted hub routes during crises; it never changes a farmer’s card; it cannot create food, transport or budget.
- Phones submit one card and optional promise, with no separate lock pass. Unsubmitted farms use Sell at timeout. Rejected actions do not overwrite an accepted choice. Pausing freezes the timer; reconnection preserves the seat under the same browser identity.
- The host screen shows only aggregate planned food until reveal. Phones run presentation and submit actions; only the host runs the engine. Reflections are anonymous on the public word wall, though the trusted host/database checkpoint associates submissions with identities to allow replacement of one's answer.

This is a simplified distribution chain; real cities have many more routes.

## Reproduce simulations

```sh
node scripts/simulate.mjs
```

The script runs the real engine with Mulberry32 seeds 1–20 at 3, 5 and 8 farmers, with Automatic Council throughout. Six profiles make **360 games**: Sell; Sell+promise; Share+promise; coordinated Store-on-warning/Release-in-crisis/Share-otherwise with promises; mixed Sell/coordinated; and random taps. Random taps choose uniformly among available cards (Release only when stock exists), and toggle the promise independently with 50% probability. Their decision RNG is separate from the event RNG, so every profile faces identical seeded events.

Pass an output filename to preserve a comparison:

```sh
node scripts/simulate.mjs reports/rebalance-after.json
```

[Before/after comparison](reports/rebalance-comparison.md) contains loss rates, cash, goal winners and waste. The corresponding JSON files preserve all histories and config snapshots. Goal winners require both enough cash and city survival; cash in an early loss is diagnostic only.

The requested changes do **not** meet every target: coordinated losses remain below 15%, but Sell+promise still loses too rarely and random taps meet the 50–70% band only with three farmers. Counterfactual budget, starting-security and event-frequency trials did not find one shared setting meeting all three targets at every size. None of those additional config experiments were applied. Further balance decisions are still needed.
