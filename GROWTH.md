# Growth Operating System — Scratch Lottery Simulator

Last updated: 2026-10-05

## Operating Model

Analysis unit:
1. Host ecosystem — https://saramjh.github.io/
2. Product endpoint — /scratchLottery/
3. Query / Job — e.g. scratch off simulator, scratch card simulator, odds education

Do not treat ScratchLottery as an independent domain.
Do not assume shared-host authority transfer.
Evaluate rankings by query × page, and analytics by pagePath + app_id.

Decision order:
Market → Demand → Competition → Product Value → Distribution → Measurement → Experiment → Growth Loop

---

## 1. Current Growth Model

### Host ecosystem

`saramjh.github.io` contains the root blog plus multiple repository GitHub Pages endpoints such as ScratchLottery, richChecker/rich-tester, recipeCalc, space_atlas_student, SquircleSimulator and others.

They are separate repositories but share the same origin.

Practical consequences:
- one Search Console host property contains multiple projects,
- current production GA4 is consolidated into one property/stream,
- product reporting must use pagePath and explicit app identity,
- same-origin browser storage can collide if keys are not namespaced,
- the root blog can become an owned distribution layer only when it serves a genuinely distinct user Job,
- same host does not imply automatic ranking benefit.

### ScratchLottery role

Search Console, 2026-06-28 to 2026-09-26:
- entire host: 206 clicks / 2,868 impressions
- ScratchLottery: 185 clicks / 1,665 impressions
- ScratchLottery contribution: about 89.8% of host clicks and 58.1% of host impressions

Recent 2026-09-15 to 2026-09-26:
- host: 33 clicks / 213 impressions
- ScratchLottery: 19 clicks / 121 impressions

ScratchLottery is currently the strongest organic acquisition asset in the host portfolio.

### Core Job

Help me experience and quantify what scratch-off lottery probability and long-run loss actually feel like without spending real money.

### Value Proposition

The product combines:
- tactile scratch interaction,
- verified real-world distributions where available,
- fast simulation,
- budget simulation,
- repeated risk simulation,
- RTP / long-run interpretation,
- no real-money wager.

### Value Moment

A user completes a scratch or simulation result and can relate the observed outcome to the theoretical probability / RTP.

### Usage pattern

Observed behavior is:
- strong in-session repetition among activated users,
- weak proven cross-session return so far.

Do not assume either a pure one-shot utility or a daily-game model.

### North Star

Value-Completed Sessions on /scratchLottery/

Supporting metrics:
- activated users / sessions
- completed-value users / sessions
- repeated actions per activated user
- returning user rate
- share → referral → value completion

---

## 2. Analytics Architecture

### Active consolidated property

- GA4 property: properties/456806471
- display name: blog
- web stream ID: 8626988215
- measurement ID: G-4DYFKSNFBG
- default URI: https://saramjh.github.io/

The API currently returns one production web stream for the consolidated property.

Therefore sibling projects are separated with:
- pagePath
- app_id for custom events

hostName is useful for separating production from localhost/127.0.0.1, but cannot distinguish projects that all use saramjh.github.io.

### Historical ScratchLottery property

- properties/456069548
- legacy measurement ID: G-ERNG0LEKY9

This contains historical ScratchLottery data and is not the current production destination.

### Correction log

An earlier pass incorrectly treated the legacy property as active and temporarily changed the local tag to G-ERNG0LEKY9.

Shared-host verification disproved that assumption.

Current local code is restored to G-4DYFKSNFBG and regression tests reject the legacy ID.

---

## 3. Empirical Findings

### Proven Search Console cluster

| Query | Impressions | Clicks | CTR | Avg position |
| --- | ---: | ---: | ---: | ---: |
| scratch off simulator | 186 | 28 | 15.05% | 7.66 |
| scratch card simulator | 153 | 10 | 6.54% | 6.79 |
| scratch ticket simulator | 186 | 10 | 5.38% | 6.36 |
| scratch off ticket simulator | 52 | 10 | 19.23% | 5.98 |
| scratcher simulator | 44 | 4 | 9.09% | 7.75 |

Conclusion:
- simulator intent is already proven,
- the flagship must be protected,
- synonym landing pages are not justified.

### Current 25-day Search Console movement

2026-09-08 to 2026-10-02 vs the preceding 25 days:

- clicks: 44 vs 42 (+4.8%),
- impressions: 307 vs 447 (-31.3%),
- CTR: 14.33% vs 9.40%,
- average position: 11.95 vs 16.10.

Interpretation:
- the page is not suffering a ranking-quality collapse; click yield and average position improved,
- reach is narrower than the prior window, so the current growth ceiling is query coverage / total impression inventory rather than a weak click-through proposition,
- this makes adjacent-intent expansion safer than rewriting the proven simulator proposition.

Current core rows:
- scratch off simulator: 7 clicks / 33 impressions / 21.2% CTR / avg position 8.88,
- scratch ticket simulator: 3 / 20 / 15.0% / 7.90,
- scratch card simulator: 1 / 18 / 5.6% / 7.00,
- scratch off ticket simulator: 1 / 8 / 12.5% / 6.50,
- scratcher simulator: 0 / 7 / 0% / 8.71.

### Host portfolio examples

- /scratchLottery/: 185 clicks / 1,665 impressions / avg pos 13.33
- /recipeCalc/: 0 clicks / 1,086 impressions / avg pos 64.82
- /rich-tester/: 12 clicks / 44 impressions / avg pos 16.41
- /richChecker/: 5 clicks / 31 impressions / avg pos 28.32

No material ScratchLottery query overlap with sibling products was observed.

### Active GA4 — ScratchLottery, 2026-09-08 to 2026-10-04

Current connected production property, filtered by pagePath containing `/scratchLottery/`:

- 50 active users / 50 total users
- 60 sessions
- 41 engaged sessions
- 66 page views
- 68.3% engagement rate
- 5,115 seconds of user engagement

Acquisition:
- Organic Search: 45 sessions / 35 active users / 35 engaged sessions
- Direct: 12 sessions / 12 active users / 5 engaged sessions
- Unassigned: 3 sessions
- Referral: 1 session

Organic Search is 75% of sessions. Search remains the only proven scalable acquisition engine.

Audience concentration:
- United States: 26 sessions / 21 active users / 19 engaged sessions,
- Germany: 7 / 6 / 5,
- South Korea: 3 / 3 / 3,
- desktop: 47 sessions / 37 active users / 33 engaged sessions,
- mobile: 13 / 13 / 8.

Distribution implication:
keep English/US search intent primary. Do not rebuild the product around Korean traffic or mobile-first virality merely because those channels are easier to post into; current first-party usage is desktop-heavy and US-led.

### Actual product usage

| Event | Count | Active users |
| --- | ---: | ---: |
| scratch_completed | 1,327 | 29 |
| next_lottery | 1,305 | 28 |
| run_fast_simulation | 688 | 8 |
| reset_lottery | 155 | 40 |
| select_preset | 150 | 40 |
| apply_probability | 102 | 40 |
| share_result_card | 1 | 1 |

Activated depth is high:
- scratch completers average about 45.8 completed scratches each,
- fast-simulation users average 86 simulations each.

This is the strongest current product signal: users who discover the value can go very deep in one session.

Instrumentation caveat:
the currently deployed version fires some `reset_lottery` / `select_preset` events during initialization and preset application. The 2026-10-05 local release suppresses those synthetic events, so post-deploy counts will be cleaner and should not be compared raw against this baseline.

### Cross-session retention and referral

Current classified data:
- new: 49 active users / 50 sessions / 36 engaged sessions
- returning: 6 active users / 8 sessions / 5 engaged sessions
- referral: 1 session
- `share_result_card`: 1 event

Users can appear in both new and returning classifications, so do not sum those user counts.

Current pattern:
- acquisition works,
- activated users repeat heavily,
- return is still weak,
- referral is effectively absent.

The primary growth bottleneck is therefore not “make the scratch interaction more addictive.” It is turning existing value into adjacent search coverage, shareable proof, and a reason to return.

### Internal engagement feasibility gate — 2026-10-05

The product is a static GitHub Pages app with existing localStorage persistence, so engagement work must be separated by what can be trustworthy without a backend.

| Candidate | User utility | Technical fit now | Operating cost | Decision |
| --- | --- | --- | --- | --- |
| Contextual next experiment | High: converts a completed result into another question | High: routes into existing tools | Very low | Implement |
| Curated executable experiments | High: adds browseable content without fake editorial volume | High: presets existing controls/functions | Very low | Implement |
| Personal experiment lab | Medium-high: gives a concrete return reason | High: localStorage already exists and is namespaced | Low | Implement |
| Community aggregate | Potentially high, but only if data is real | Low without write API, abuse controls and aggregation | Medium-high | Defer |
| Comments/discussion | Potentially useful after community density exists | Low without identity/moderation/backend | High | Defer |
| Accounts/streaks | Unproven and risks generic gamification | Low-medium | Medium | Reject for now |
| Bounded official claimed-prize tracker | Medium-high: gives the page a genuinely changing evidence surface and a concrete revisit reason | Medium-high with GitHub Actions + official Texas pages | Low while limited to three games | Implement bounded pilot |

Implementation rule:
the Experiment Lab features must reuse the current verified probability engine and controls. The official tracker is a separate descriptive evidence surface: it may archive operator-published claimed-prize changes, but it must not feed those counts back into simulation probabilities, infer unsold-ticket odds, invent community statistics, or create decorative “featured” content.

---

## 4. Shared-Host / Owned Content Analysis

### Existing blog article

Root blog URL:
`/scratch-lottery-simulation/`

Observed:
- it links to /scratchLottery/,
- only 1 recent GA4 session,
- no observed root-blog → ScratchLottery referrer transition,
- Search Console URL Inspection: URL unknown to Google,
- no 90-day query rows.

Therefore the root blog currently provides no measurable acquisition to ScratchLottery.

### Sitemap state

Root sitemap:
`https://saramjh.github.io/sitemap.xml`

Search Console reports:
- submitted 2026-09-12,
- last downloaded 2024-10-21,
- pending,
- 27 submitted / 0 indexed in sitemap status.

The live sitemap contains the ScratchLottery article.

Its lastmod is 2024-09-03 even though the article was edited in 2026 because the blog uses `modified` while jekyll-sitemap uses `last_modified_at` for sitemap freshness.

### Important cannibalization finding

The article is currently titled `Scratch Lottery Simulation` and its body mainly describes the simulator product.

The flagship already ranks strongly for simulator queries.

Fresh SERPs show two different result classes:
- simulator queries → actual simulator/game utilities,
- informational odds queries → explanatory lottery/education pages.

Therefore forcing the existing article to be indexed as-is is NOT a high-confidence growth action.

It could split relevance across two same-host URLs for the same simulator Job.

Decision:
- the temporary local last_modified_at change was reverted,
- do not force indexing of the current article,
- first validate a distinct informational Job,
- only then rewrite the article and fix freshness/indexing metadata.

### Shared-host authority rule

Do not assume:
- ScratchLottery success automatically boosts sibling rankings,
- root-blog links automatically transfer enough authority to improve ranking.

Observed evidence supports only that:
- pages share a host,
- pages can internally link,
- they share analytics/Search Console management,
- ranking remains highly page/query specific.

---

## 5. Same-Origin Technical Audit

ScratchLottery localStorage keys:
- scratchLotteryState
- scratchLotterySoundOn

They are already namespaced and do not conflict with the root blog's `theme` key.

No ScratchLottery service worker registration was found.

No immediate shared-origin storage/service-worker repair is required.

---

## 6. Current Bottlenecks

### B-001 — Query expansion must avoid same-host self-cannibalization

Evidence:
- flagship already owns simulator intent,
- root blog article currently targets nearly the same concept,
- the article is not indexed,
- external SERPs distinguish simulator utility from educational odds content.

Impact: High
Confidence: High for intent overlap; Medium for the exact cannibalization magnitude.

Measurement:
- query × page overlap
- flagship clicks and position as guardrails
- future blog asset must earn a different informational query cluster.

### B-002 — Search coverage is concentrated in one proven Job

Evidence:
Most visible ScratchLottery queries are simulator synonyms.

Impact: Medium-high
Confidence: High for concentration, Medium for the next adjacent Job.

### B-003 — Cross-session return is weak

Evidence:
Current 2026-09-08 to 2026-10-04 classified GA4 data shows 6 active returning users / 8 returning sessions / 5 engaged returning sessions. This is still small relative to 49 active new users / 50 new sessions, and the classifications can overlap at user level.

Impact: Medium
Confidence: Medium due small sample.

Do not assume gamification is the fix.

### B-004 — Shared-host event identity

All projects feed the consolidated GA4 stream.

Change implemented locally:
- every tracked ScratchLottery event receives `app_id: scratchLottery`,
- Clarity custom events are namespaced as `scratchLottery:<event>`.

Confidence: High

### B-005 — Live-data expansion is expensive

Current-EV / remaining-prize competitors operate ongoing data-ingestion systems. A nationwide/statewide comparison product would still create meaningful source-breakage, game-lifecycle and freshness cost.

2026-10-05 bounded pilot:
- track exactly three Texas $5 games, including the current default Game 2755,
- fetch only official Texas Lottery current-game/detail pages,
- archive a snapshot only when published counts change,
- render the latest source date and direct operator links in static HTML,
- run from a daily GitHub Action with fail-closed parsing/verification,
- explicitly label printed-minus-claimed values as unclaimed prizes, not current ticket odds,
- never alter the simulator's verified issue-table probabilities from claimed-prize data.

Decision:
Use this bounded watchlist to test whether changing official evidence creates return/search value. Do not turn it into a nationwide lottery ETL/database unless measured demand justifies the maintenance cost.

---

## 7. Demand & Competition

### SIMULATE

Status: first-party validated.
Landing: /scratchLottery/
Decision: protect and improve.

### EXPERIENCE LONG-RUN RISK

Status: validated by repeated scratch/simulation behavior.
Decision: core value.

### INFORMATIONAL LOTTERY MATH / PROBABILITY LITERACY

External SERPs contain distinct educational material around lottery expected value, probability, repeated trials and gambler's-fallacy interpretation. Google Search Console for 2026-08-01 through 2026-10-02 returned no query rows on this host for the tested educational cluster (lottery math/probability, expected value, law of large numbers, gambler's fallacy, scratch odds explained), while the flagship remained dominated by simulator queries.

2026-10-05 local change:
- add a dedicated `/scratchLottery/math/` learning page rather than bloating or retitling the simulator,
- teach expected value, variance/law of large numbers and independent-trial streaks with state-driven visuals,
- reuse the exact Texas Game 2755 issue model and shared math primitives used by the simulator,
- route each concept back to the relevant simulator tool,
- instrument `math_lesson_run` and `math_to_simulator`,
- keep the simulator title/H1 and canonical untouched.

Decision:
`/scratchLottery/math/` owns this probability-literacy Job. Do not rewrite the existing root-blog Scratch Lottery Simulation article around the same EV/RTP/variance/repeated-trials cluster; that would recreate same-host overlap.

### CALCULATE EXACT SCRATCH ODDS

External SERPs validate dedicated calculator utilities for printed odds, multi-ticket probability and budget-level interpretation.

2026-10-05 local change:
- the existing canonical product now includes an exact “N tickets” calculator,
- it computes ≥1 any-prize and ≥1 top-prize probabilities with `1 - (1 - p)^n`,
- it also shows expected payout and expected net from the current prize model,
- it reuses the verified preset/evidence system instead of creating a new keyword landing page,
- `calculate_exact_odds` and `value_completed(mode=exact_odds)` are instrumented.

Decision:
ship the small same-page CALCULATE slice first. Only expand into a separate Full Prize Distribution Odds Lab if post-deploy Search Console impressions and product usage prove incremental demand.

### VERIFY / COMPARE CHANGING OFFICIAL PRIZE CLAIMS

Market exists, but reliable current-EV or remaining-ticket odds require data the operator does not publish. The bounded pilot therefore tracks only published printed-prize versus claimed-prize movement for three Texas $5 games.

Decision:
Ship the descriptive three-game tracker on the existing canonical page. Measure whether users revisit or search for this evidence before expanding game/state coverage; do not market it as live ticket EV or a best-game ranking.

---

## 8. Distribution Channels

### Organic Search

Primary proven acquisition channel.

### Owned Host Content

The first approved informational asset now lives inside the product namespace:

`Distinct probability-literacy query → /scratchLottery/math/ interactive explanation → relevant simulator tool → value completion`

The root blog is not the default educational layer. It stays unapproved until a different editorial Job is validated; do not use it as a duplicate simulator or math landing.

### External communities

Small historical referral samples can be deeply engaged, but scale is unproven.

### Share/referral

2026-10-05 local change:
- fast-simulation results expose “Share this simulation” at the value moment,
- repeated-budget risk results expose “Share this analysis” at the value moment,
- native Web Share is used where available,
- desktop/non-Web-Share browsers copy the result text plus an attributable referral URL instead of merely downloading an image,
- campaign and preset are encoded in UTM parameters,
- `share_attempt`, `share_completed`, `share_cancelled` and `share_failed` separate intent from successful distribution.

This directly addresses the current baseline of one share-card event and one referral session.

### Paid acquisition

Not justified until unit economics are established.

---

## 9. Growth Funnel

Host-level:
`External discovery → blog or product endpoint → product interaction → value → repeat action → share / return`

ScratchLottery:
`Search → /scratchLottery/ → scratch/simulation → completed result → next_lottery / another simulation → optional share`

Observed:
- search acquisition works,
- product value works,
- within-session continuation works strongly for a subset,
- cross-session return is weak,
- root-blog → product acquisition is not currently working,
- share loop is not yet measured post-deployment.

---

## 10. Instrumentation

Existing product events remain.

New local growth events:
- tool_started
- value_completed
- calculate_exact_odds
- share_attempt
- share_completed
- share_cancelled
- share_failed

All tracked ScratchLottery events are automatically scoped with:
`app_id = scratchLottery`

Clarity event names use:
`scratchLottery:<event>`

Product analysis in the consolidated property should use:
- pagePath starts with /scratchLottery/
- and/or app_id = scratchLottery

Do not use hostName to distinguish sibling projects.

---

## 11. Experiment Ledger

### EXP-001 — Shared-host analytics identity

Observation:
All projects use one active GA4 stream.

Hypothesis:
Explicit app identity prevents future custom-event ambiguity.

Change:
Add `app_id=scratchLottery` centrally and namespace Clarity events.

Primary Metric:
clean filtering of ScratchLottery events.

Confidence: High
Cost: Very low
Status: Implemented locally and runtime-verified.

### EXP-002 — Root-blog article differentiation

Observation:
The root blog article exists but is unknown to Google and overlaps heavily with the simulator intent.

Evidence:
- title: Scratch Lottery Simulation,
- body: mostly product feature description,
- no Search Console query rows in the validated window,
- flagship already ranks for simulator synonyms,
- `/scratchLottery/math/` now owns the EV/RTP/variance/repeated-trials educational Job.

Decision:
Do not rewrite the root-blog article around lottery math, expected value, RTP, variance, repeated trials or gambler's fallacy. It remains unapproved until a genuinely different editorial Job is identified.

Guardrail:
no simulator-query or math-page query cannibalization.

Confidence: High that the former proposed rewrite now overlaps.
Status: Blocked pending a different Job.

### EXP-003 — Value-moment share referral loop

Observation:
The prior implementation had one `share_result_card` event and only one referral session. Its CTA was detached from the deeper simulation value moments, and desktop fallback downloaded an image without producing a referral click path.

Change:
- contextual share CTAs are attached to fast simulation and budget-risk results,
- successful native shares carry a UTM-attributed URL,
- desktop fallback copies result text plus the attributed URL,
- attempt/success/cancel/failure are instrumented separately.

Primary Metric:
`share_completed / value_completed`, then share-referred sessions and referred-user value completion.

Confidence: Medium-high
Status: Implemented locally and browser-verified.

### EXP-004 — Exact multi-ticket odds search adjacency

Observation:
Current organic coverage is concentrated in simulator synonyms while external SERPs contain dedicated scratch-ticket odds calculators.

Change:
Add exact N-ticket probability inside the existing Fast Simulation section, using the current verified prize model rather than creating another landing page.

Primary Metric:
- `calculate_exact_odds` users / engaged users,
- new Search Console impressions for odds-calculator / multi-ticket probability queries.

Guardrail:
the proven simulator query cluster must not lose position/CTR.

Confidence: Medium-high
Cost: Low
Status: Implemented locally and browser-verified.

Next gate:
A larger Full Prize Distribution Odds Lab stays unapproved until this minimal slice shows incremental search or product demand.

### EXP-005 — Interactive Math of Lottery learning layer

Observation:
The product already demonstrates randomness, but users can finish the utility loop without understanding why expected value, variance and independent trials produce the observed behavior.

Validation:
- connected Search Console showed no owned educational-query rows for the tested probability-literacy cluster from 2026-08-01 through 2026-10-02,
- the flagship's measured queries remain simulator-heavy,
- current external search results separately serve educational lottery-probability/expected-value content,
- current Google guidance treats useful interactive main content as valid people-first content and does not require special AI/GEO markup.

Change:
- create `/scratchLottery/math/` with exactly three initial concepts: expected value, variance/law of large numbers, and independent trials,
- use deterministic visual demonstrations for teaching and link back to the full simulator for fresh random experiments,
- share Texas Game 2755 model data and probability primitives with the flagship so educational numbers cannot silently drift,
- respect reduced motion and expose textual equivalents through live status/readouts,
- add a self-canonical and sitemap entry while leaving the flagship simulator metadata unchanged.

Primary Metrics:
- math-page organic impressions/clicks for informational queries,
- `math_lesson_run` users,
- `math_to_simulator` / math-page engaged users,
- downstream simulator `value_completed` after a math-page transition.

Guardrails:
- flagship simulator query position/CTR,
- query × page overlap between `/scratchLottery/`, `/scratchLottery/math/`, and the root blog,
- page performance/accessibility and no gambling-optimization claims.

Confidence: Medium-high on strategic fit; search demand on this exact host remains unproven.
Cost: Low-medium.
Status: Implemented locally under TDD; pre-deploy browser/SEO validation pending completion.

---

## 12. Priority Queue

### Priority A

1. Preserve flagship simulator search equity.
2. Keep production GA4 ID G-4DYFKSNFBG.
3. Scope product events with app_id=scratchLottery.
4. Preserve official-data integrity and layout/performance fixes.
5. Measure actual in-session repetition and cross-session return in the consolidated property.
6. Prevent duplicate simulator intent across same-host URLs.

### Priority B

1. Measure the new value-moment share/referral loop after deployment.
2. Measure `/scratchLottery/math/` educational-query impressions, lesson interaction and math → simulator transition without disturbing the flagship query cluster.
3. Measure exact-odds adoption and new Search Console adjacency before expanding the Odds Lab.
4. Keep the root-blog Scratch Lottery Simulation article out of the math/EV/RTP cluster unless a genuinely distinct editorial Job is found.
5. Test community/short-form distribution using actual simulation or educational visual results, not generic product promotion.

### Priority C

1. synonym landing pages
2. mass programmatic SEO
3. nationwide/statewide live-prize or current-EV database beyond the bounded pilot
4. large compare-games product
5. daily streak/account gamification
6. paid acquisition

---

## 13. Growth Loops

### Product Search Loop — functioning

`Google simulator query → ScratchLottery → repeated scratch/simulation → useful experience → possible mention/share → more discovery`

### Interactive Math → Product Loop — implemented locally

`Informational probability query → /scratchLottery/math/ interactive concept → relevant simulator tool → value completion`

The math page is inside the product namespace and owns the probability-literacy Job. The old root-blog article is no longer the candidate for this cluster.

### Root-blog Content → Product Loop — blocked

A root-blog transition remains possible only after a different editorial Job is identified. Do not duplicate the simulator or math-page intent.

### Share Loop — candidate

`Deep product session → result share → new visit → value completion`

### Official Evidence Return Loop — bounded pilot

`Official claimed-prize table changes → static tracker/archive changes → revisit/search discovery → simulator or analysis use`

Guardrail:
printed-minus-claimed is an unclaimed-prize count, not an estimate of tickets remaining, current win probability or expected value.

### Portfolio Loop — possible but unproven

Cross-link only when user intent is genuinely adjacent.
Do not create cross-project links merely for SEO.

---

## 14. Shared-Host SEO Rules

Always distinguish:
- host metrics
- endpoint metrics
- query × page metrics

Do not:
- call all root-domain backlinks ScratchLottery backlinks
- infer authority transfer from the shared hostname
- count sibling traffic as ScratchLottery acquisition
- use hostName to separate projects
- create unrelated internal links for SEO juice
- index duplicate-intent blog/product pages

Do:
- filter Search Console by page
- filter GA4 by pagePath/app_id
- monitor query × page overlap
- use root blog only for distinct informational journeys

---

## 15. Measurement Plan

### Host portfolio
- clicks/impressions by endpoint
- endpoint share of host search traffic
- cross-endpoint query overlap

### ScratchLottery acquisition
- simulator query cluster
- organic landing sessions
- source / medium

### Product value
- scratch_completed users
- run_fast_simulation users
- value_completed
- repeated actions per activated user

### Retention
- returning users
- returning engaged sessions
- inter-session interval when sample is sufficient

### Interactive math experiment
- math-page impressions/clicks by educational query
- `math_lesson_run` by lesson
- `math_to_simulator` transition rate
- downstream simulator `value_completed`
- query × page overlap against flagship and root blog

### Root-blog experiment
- do not target the math/EV/RTP/variance/repeated-trials cluster
- define a genuinely different editorial Job before indexing work
- monitor query × page overlap if a future differentiated article is approved

### Referral
- share_completed
- share-attributed sessions
- referred-user value completion

---

## 16. Current Data Gaps

- Clarity export is unavailable through the current connected-tool session.
- exact US keyword volume/KD/CPC remains unavailable from current Semrush/DataForSEO access.
- root sitemap GSC status is anomalous: live sitemap is current, but GSC reports a stale last-download timestamp and pending state.
- current root-blog ScratchLottery article should not be forced into index before intent differentiation.
- same-host authority transfer is intentionally treated as unproven.

---

## 17. Next Decision Point

1. Deploy current ScratchLottery product/data/performance fixes and shared-host analytics scoping.
2. Establish a clean post-deploy baseline for app_id=scratchLottery, value completion, repeated actions, return behavior, and share referrals.
3. Preserve flagship simulator rankings as the primary guardrail.
4. Measure whether `/scratchLottery/math/` earns a distinct informational query cluster and converts readers into simulator value completion.
5. Do not repurpose the root-blog ScratchLottery article into the same lottery-math cluster; only revisit it if a different editorial Job is validated.
6. Measure whether the bounded Texas claimed-prize tracker earns repeat visits/search impressions before expanding its watchlist or geography.
7. Independently evaluate whether Full Prize Distribution Odds Lab has enough incremental CALCULATE demand to justify implementation.

Portfolio strategy:

**Treat ScratchLottery as the host's proven acquisition/product winner. Protect its simulator intent, use the shared host for measurable adjacent journeys rather than assumed authority transfer, and add new assets only when they capture a different Job.**
