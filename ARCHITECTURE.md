# Architecture

## Runtime and entry points
- Static GitHub Pages site. No package manager or build step.
- `index.html` is the flagship simulator entry point.
- `math/index.html` is the probability-learning entry point.
- GitHub Actions verify and deploy the static tree.

## Ownership
- `js/script.js`: flagship simulator UI/application orchestration.
- `js/math-of-lottery.js`: math-page UI/application orchestration only.
- `js/verified-lottery-models.js`: verified shared lottery issue models.
- `js/lottery-math-core.js`: side-effect-free shared probability math.
- `js/analytics.js`: the only GA4/Clarity event-dispatch adapter.
- `data/live/texas-scratch-watch.json`: bounded official claimed-prize snapshots.
- `scripts/update_live_content.py`: only writer for generated prize-tracker HTML/data updates.
- `css/style.css`: global tokens, base styles and flagship/shared component styles.
- `css/math.css`: math-page-only styles.
- `scripts/verify*.js`: behavior/data/architecture release contracts.

## State and side effects
- Flagship play totals: `scratchLotteryState`.
- Saved Experiment Lab setups: `scratchLotteryExperimentsV1`; intentionally independent from play totals.
- Sound preference: `scratchLotterySoundOn`.
- Analytics side effects must pass through `ScratchAnalytics.track`.
- Official claimed-prize refresh is isolated from simulator odds; claimed-prize data never mutates probability models.

## Dependency direction
```
Page UI (script.js / math-of-lottery.js)
  -> shared domain data (verified-lottery-models.js)
  -> pure math (lottery-math-core.js)

Page UI
  -> analytics adapter (analytics.js)

Updater
  -> official provider
  -> bounded snapshot data + generated static tracker markup
```

Shared domain/core modules do not import page code or mutate DOM.

## Hard contracts
- `/scratchLottery/` simulator URL, title/H1/canonical and proven simulator search intent.
- `/scratchLottery/math/` self-canonical educational intent.
- Verified official lottery distributions and source links.
- Existing localStorage keys and semantics.
- GA4 `app_id=scratchLottery` and Clarity `scratchLottery:<event>` namespace.
- Keyboard/mobile/reduced-motion behavior and 44px primary interactive targets.
- Static deployment and sitemap/robots behavior.

## Architecture invariants
1. Page-specific selectors do not live in the global stylesheet.
2. Analytics dispatch exists in one adapter; page modules only call that adapter.
3. Shared math/data modules are DOM-independent and side-effect-free except module export.
4. Verified issue-table data has one source of truth when consumed by multiple pages.
5. Claimed-prize snapshots cannot feed simulator probabilities or current-EV claims.
6. A page module cannot mutate another page's DOM.
7. New generic utilities require at least two genuine consumers with the same responsibility/change reason.
8. Deploy, CI and refresh workflows run all repository verifiers.
9. No synonym landing pages or root-blog duplication of simulator/math intent.
10. Refactors preserve public URLs, persisted state, analytics names and visible behavior unless separately approved.

## Intentionally retained debt
- `js/script.js` is large, but it remains one flagship application owner. It should be split only when a responsibility can move behind a stable contract without creating cross-module state synchronization.
- `AGENTS.md` and `CLAUDE.md` intentionally duplicate directives for different agent entry conventions; they are compatibility surfaces, not accidental duplicate product code.
- Existing source-oriented assertions in `scripts/verify.js` are retained where they enforce architecture/data invariants; migrate toward behavior tests opportunistically rather than rewriting the verifier wholesale.
