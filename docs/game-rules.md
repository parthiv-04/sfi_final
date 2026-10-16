# Food Resilience Market Game Rules

Food Resilience Market is a five-round game about getting food to vulnerable households, schools and hospitals in Chiang Mai while keeping farms financially viable. Keep the shared city food-security meter above zero through all five rounds and finish with at least $26 to achieve your personal cash goal. All prices, harvests and policy effects are simplified game values.

## Set up the game

Choose one mode:

- **Single player:** one farmer chooses either the company-contract or Mae Tha organic role. The Food Council acts automatically.
- **Pass and play:** 3–8 farmers share one screen and take turns. Select an Automatic Council or a separate human Council player.
- **Multiplayer:** 3–8 farmers join the host’s room using the QR code or room code on their phones. A human Council needs its own seat and phone. The host facilitates and has no farmer or Council seat.

In group games, choose at least one farmer of each role. Roles remain fixed for all five rounds. Choose one policy scenario, None, A, B or C, before starting. You may also turn on Skip pest game. Single-player and pass-and-play work offline; multiplayer requires the configured Firebase connection and internet access.

## Starting resources and winning

Every farmer starts with **$18** and aims for **$26**. Farmer-owned warehouse stock starts empty. For N farmers, the city and Council start with:

| Resource | Starting amount |
| --- | --- |
| City food security | 2.1 × N points |
| Maximum food security | 2.8 × N points |
| Normal emergency food need | N units per round |
| Flood or closure emergency need | 1.5 × N units rounded up |
| Mae Tha community reserve | 1.25 × N units rounded up |
| Food Council budget | $7 × N |

For example, five farmers start with 10.5 security points, a maximum of 14, a 7-unit community reserve and a $35 Council budget. Normal need is 5 units and crisis need is 8.

If security reaches **zero**, the game ends immediately and nobody achieves an individual win, regardless of cash. If the city survives all five rounds, each farmer finishing with at least $26 wins individually. Several farmers can win. Cash ranks are shown at the end; tied balances share a rank.

## What happens each round

1. **Read the event and shared cards.** Check emergency need, buyer capacity, roads, reserve and Council budget.
2. **Grow.** Play a 10-second crop-protection minigame. Company farmers spray; Mae Tha farmers hand-pick pests. Results are recorded but do not change harvest, cash or food availability. Farmers can skip their own game; the host or shared screen can skip for everyone.
3. **Decide.** Each farmer chooses one available route card and, if eligible, a promise for next round. Phones have a 60-second planning window. Offline play has no planning deadline.
4. **Council.** After farmer submissions, the human Council selects its action and reserve release, or the Automatic Council acts.
5. **Reveal.** The game shows seven steps: event, market, school and hospital deliveries, warehouse, community hub, households and security. Review actual deliveries, money, waste and feedback-loop effects. The animation can be skipped.
6. **Continue.** Read the round fact and advance. After round 5, review the results, policy comparison and discussion questions, then add an anonymous reflection.

Option cards show expected outcomes. Actual market sales and paid hub deliveries depend on shared buyers, roads and Council funds.

## Farmer roles and available actions

### Company contract farmer

Each round, the company advances inputs equivalent to **1.25 produce units of debt**. Normal harvest is **2.5 units**. Accessible produce repays company debt first; unpaid debt carries forward and the next round adds a new advance.

Your only route card under every policy is **Sell to company**. The company buys the remaining accessible produce for **$3 per unit**, including during a market closure. You cannot Share, Store, Release or make a school or hospital promise. Company produce uses shared market buyer capacity when the market is open, reducing buyers available to Mae Tha farmers. Company payments are fixed even when wider-market prices change.

During closure, company produce does not reach the emergency recipients under None, B or C. Policy A diverts part of it to alternative channels.

### Mae Tha organic farmer

Normal harvest is **2 units**. In round 1, soil recovery reduces harvest to **1 unit** under None, A and C, or **1.5 units** under B. Certification costs **$2 every round**, except under B. Market sales earn the event price plus a **$1 organic premium** while the market is open.

Organic farmers share a pooled buyer cap of **0.6 × N units per round**, or **0.9 × N under B**, where N includes all farmers at the table. Actual sales also depend on remaining overall market capacity after company produce. Scarce organic buyers are shared across offers; unsold fresh food becomes waste.

Choose one card:

- **Sell:** offer accessible fresh produce to the market.
- **Share:** send fresh produce to the community hub or kitchen first and offer any remainder to the market. With the normal 2-unit available harvest, this routes both units to the hub. The hub pays $1 per delivered unit in normal, festival and warning rounds, or $2 in floods and closures, while Council funds last.
- **Store:** put accessible fresh produce into your own warehouse stock instead of feeding households now. Remaining stock costs $1 per unit each round. At round end, pooled farmer-owned stock loses 25%, rounded down to whole units; those losses are taken from warehouse lots in order.
- **Release:** send your own stored food to the hub first, then offer fresh harvest to the market using any remaining road capacity. This card appears only when you own stored stock. Delivered warehouse releases receive the hub price while Council funds last.

### Promises for schools and hospitals

Mae Tha farmers can promise **1 unit of next round’s harvest**, alongside their chosen route card. There is no new promise in round 5. A promise reserves food and road capacity next round before discretionary routes; it pays **$3 per unit that arrives**. In a flood or closure, only half the attempted consignment arrives. The disrupted half still uses harvest and road capacity.

School and hospital deliveries cover normal emergency need. The additional need created by a crisis must be met through the community hub and reserve routes.

## Events and transport

Every five-round game includes at least one Flood and one Market closure. A warning uses a 60% forecast rule; it is not a guarantee that the next round will flood.

| Event | Base market price per unit | Shared market capacity |
| --- | --- | --- |
| Normal week | $4 | 1.2 × N rounded up |
| Festival | $6 | 2 × N |
| Flood | $5 | 0.8 × N rounded up |
| Market closure | $0 | No buyers |
| Warning | $4 | 1.2 × N rounded up |

Mae Tha receives its $1 premium on open-market sales. Company purchases remain $3 per unit. Feedback effects can change the displayed open-market price and capacity.

Each farm normally has road capacity for **3 units**. A flood halves current road capacity to **1.5 units** and halves next round’s normal harvest: 1.25 units for a company farmer or 1 unit for a Mae Tha farmer. Repeated floods can keep harvest reduced. Existing promises and company repayments use roads before discretionary routes. Storage and reserve deliveries also consume road capacity.

The farmer-owned warehouse and Mae Tha community reserve are separate. The community reserve never decays, charges no farmer storage fee and pays no farmer cash when released.

## Food Council actions

The Council coordinates food deliveries and transport. Its budget is shared across rounds and pays eligible hub deliveries as well as selected actions. A human Council chooses one action and can also request a community-reserve release:

| Action | Cost and effect |
| --- | --- |
| Keep the budget for later | No action cost |
| Fund farm storage | $1 per supported unit actually stored, up to 4 units; offsets the farmer’s storage expense for those units |
| Arrange emergency purchase | $3 per unit bought from one selected farm, up to 4 units; sends available produce to the hub |
| Arrange extra trucks | $6; adds 4 road-capacity units to each farm for the round before any flood reduction |

A manual reserve release is limited by available reserve and remaining farm road capacity. It can accompany any of the actions above and has no separate purchase charge. Extra trucks raise capacity to 7 units per farm normally or 3.5 in a flood.

The Automatic Council estimates the food gap after submitted deliveries and allocates community reserve at **$3 per unit**, limited by reserve and budget. It also funds submitted hub deliveries and preserves farmers’ chosen cards. Actual deliveries can still fall short because roads, stock or money run out. The Council does not automatically create warehouse stock.

## How food security and feedback work

Market sales supply the wider city but do not directly feed the emergency recipients measured by the security meter. Community-hub deliveries, reserve releases and arriving school or hospital contracts feed those recipients.

School and hospital food counts only up to the normal need of N units. Hub food fills the remaining normal gap and, in a crisis, the extra need above N. Surplus school deliveries cannot replace that extra crisis hub need.

For each round:

- If all required emergency food arrives, security rises by **0.85 points**, capped at the maximum. This is a total increase, not an increase per farmer.
- If food is short, security falls by **1 point for each unmet food unit**. There is no recovery bonus in a shortage round.
- Excess deliveries do not earn additional recovery beyond 0.85 points.

Three feedback messages explain consequences across rounds:

- **Low security:** if end-of-round security is above zero but below 40% of the maximum, next round’s open-market base price rises by $1 and buyer capacity falls by 0.2 × N units. Closure has no price to raise. The surcharge does not change company payments.
- **Crisis cooperation:** if at least half of all farmers choose Share or Release in a flood or closure, next round’s Council budget gains $1 × N. The trigger counts chosen cards, not delivered units. Company farmers cannot choose those cards.
- **Unprepared flood:** if a flood follows a warning and nobody stored food in the warning round, the reveal flags the missed preparation. This message adds no separate numerical penalty beyond the flood’s normal effects.

Effects that apply next round stop after round 5.

## Policy scenarios

Choose one scenario for the whole game. It is separate from the Council’s round-by-round action.

| Policy | Rule changes |
| --- | --- |
| None | Standard costs, buyers and reserve |
| A company closure diversion | During market closure, 20% of company-taken produce reaches alternative channels, divided equally between hospital and community kitchen. Company farmers still have only Sell to company. Roads still constrain the food taken by the company. |
| B cheaper organic farming | Certification costs $0; Mae Tha round-1 harvest is 1.5 units; pooled organic buyer cap rises to 0.9 × N units. |
| C emergency food bank | Starting community reserve gains 0.2 × N units; it gains 1 unit before each later round and releases automatically during crises, subject to remaining roads. |

The final comparison replays the recorded choices and identical events under None. It compares shortage rounds, final security, company cash and debt, Mae Tha profit and waste. A choice that is unavailable in the baseline falls back to Sell without a promise. These comparisons illustrate game scenarios; they are not predictions of real supply chains.

## Quick reminders

Keep the city alive before pursuing the $26 cash goal. Check actual emergency need rather than assuming market sales raise security. A promise uses next round’s harvest, storing delays food availability and costs money, and a reserve can only help when roads remain available. Company farmers have a fixed route, so group planning depends on Mae Tha routes, Council choices and the selected policy.

Rules reference: [README](https://github.com/parthiv-04/sfi_final/blob/061b3ae/README.md), [game configuration](https://github.com/parthiv-04/sfi_final/blob/061b3ae/src/round2/config.ts), [rules engine](https://github.com/parthiv-04/sfi_final/blob/061b3ae/src/round2/engine.ts) and [round flow](https://github.com/parthiv-04/sfi_final/blob/061b3ae/src/multiplayer/hostModel.ts).
