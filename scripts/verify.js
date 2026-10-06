#!/usr/bin/env node
// 빌드 도구가 없는 순수 정적 사이트라, 이 스크립트가 CI에서 도는 유일한 게이트다.
// 매 세션마다 수동으로 하던 검증(문법/브레이스/ID 정합성)을 그대로 코드로 옮긴 것.
const fs = require("fs")
const path = require("path")
const vm = require("vm")
const { execFileSync } = require("child_process")

const root = path.join(__dirname, "..")
let failed = false

function fail(message) {
	console.error(`✗ ${message}`)
	failed = true
}

function ok(message) {
	console.log(`✓ ${message}`)
}

// 1) JS 문법 검사
try {
	execFileSync(process.execPath, ["--check", path.join(root, "js/script.js")], { stdio: "pipe" })
	ok("js/script.js syntax OK")
} catch (e) {
	fail(`js/script.js syntax error:\n${e.stderr?.toString() || e.message}`)
}

// 2) CSS 중괄호 균형
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8")
const openCount = (css.match(/{/g) || []).length
const closeCount = (css.match(/}/g) || []).length
if (openCount === closeCount) {
	ok(`css/style.css braces balanced (${openCount})`)
} else {
	fail(`css/style.css braces unbalanced: ${openCount} '{' vs ${closeCount} '}'`)
}

// 3) JS의 모든 getElementById(...)가 HTML의 id="..."와 대응하는지 확인
const html = fs.readFileSync(path.join(root, "index.html"), "utf8")
const js = fs.readFileSync(path.join(root, "js/script.js"), "utf8")
const navigationJs = fs.readFileSync(path.join(root, "js/navigation.js"), "utf8")
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))
const referencedIds = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1])
const missingIds = referencedIds.filter((id) => !htmlIds.has(id))
if (missingIds.length === 0) {
	ok(`all ${new Set(referencedIds).size} getElementById() targets exist in index.html`)
} else {
	fail(`getElementById() references missing from index.html: ${[...new Set(missingIds)].join(", ")}`)
}



// 4) SEO winner cluster: proven Search Console terms must remain aligned in title/H1/description.
const expectedTitle = "<title>Scratch Off Simulator — Free Scratch Card &amp; Ticket Simulator</title>"
const expectedH1 = "<h1>Scratch Off Simulator</h1>"
const metaHasSecondaryQueries = html.includes("scratch card simulator") && html.includes("scratch ticket simulator")
if (html.includes(expectedTitle) && html.includes(expectedH1) && metaHasSecondaryQueries) {
	ok("SEO title/H1 preserve the primary winner and cover proven secondary simulator queries")
} else {
	fail("SEO title/H1/description drifted away from the proven scratch simulator query cluster")
}

// Pre-deploy SEO/GEO coherence: crawl signals, social previews and machine-readable app data
// must describe the same visible product without deprecated/stale FAQ schema.
const robots = fs.readFileSync(path.join(root, "robots.txt"), "utf8")
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8")
const jsonLdMatch = html.match(/<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/)
let appSchema = null
try {
	appSchema = jsonLdMatch ? JSON.parse(jsonLdMatch[1]) : null
} catch (error) {
	fail("JSON-LD is not valid JSON: " + error.message)
}

const canonicalUrl = "https://saramjh.github.io/scratchLottery/"
const seoGeoCoherent =
	(html.match(/<h1\b/g) || []).length === 1 &&
	html.includes('<link rel="canonical" href="' + canonicalUrl + '">') &&
	html.includes('<meta property="og:url" content="' + canonicalUrl + '">') &&
	html.includes('property="og:image:alt"') &&
	html.includes('name="twitter:image:alt"') &&
	html.includes('<meta name="robots" content="max-image-preview:large">') &&
	!html.includes('<meta name="keywords"') &&
	!html.includes('"@type": "FAQPage"') &&
	!html.includes("95–99% RTP") &&
	!html.includes("50–70%") &&
	appSchema?.["@type"] === "WebApplication" &&
	appSchema?.url === canonicalUrl &&
	appSchema?.["@id"] === canonicalUrl + "#app" &&
	appSchema?.isAccessibleForFree === true &&
	Array.isArray(appSchema?.featureList) &&
	appSchema.featureList.length >= 4 &&
	robots.includes("User-agent: *\nAllow: /\n") &&
	robots.includes("Sitemap: " + canonicalUrl + "sitemap.xml") &&
	sitemap.includes("<loc>" + canonicalUrl + "</loc>") &&
	/<lastmod>2026-10-(?:0[5-9]|[12]\d|3[01])<\/lastmod>/.test(sitemap) &&
	fs.existsSync(path.join(root, "docs/og-image.png")) &&
	fs.existsSync(path.join(root, "favicon.svg"))

if (seoGeoCoherent) {
	ok("SEO/GEO metadata, crawl signals, social preview assets and WebApplication schema are coherent")
} else {
	fail("SEO/GEO pre-deploy coherence contract failed")
}

// AdSense/search-quality contract: the product owns exactly one manual ad, placed
// inside the long static reference run rather than beside controls. Auto ads are
// excluded for this product path in AdSense so they cannot re-inject around the app.
const manualAdCount = (html.match(/class="adsbygoogle"/g) || []).length
const manualAdIndex = html.indexOf('data-ad-placement="static-reference-break"')
const oddsComparisonIndex = html.indexOf("<h2>Odds Comparison</h2>")
const worldOddsIndex = html.indexOf('id="worldOddsCard"')
const longRunIndex = html.indexOf('id="longRunCard"')
const monetizationAndTrustCoherent =
	manualAdCount === 1 &&
	manualAdIndex > oddsComparisonIndex &&
	manualAdIndex < worldOddsIndex &&
	worldOddsIndex < longRunIndex &&
	html.includes('<div class="ad-label">SPONSORED</div>') &&
	css.includes(".ad-slot-wrapper {") &&
	css.includes("min-height: 250px;") &&
	!html.includes('class="perspective-list"') &&
	!html.includes("shark attack") &&
	!html.includes("fireworks accident") &&
	html.includes("Last checked 2026-10.")

if (monetizationAndTrustCoherent) {
	ok("AdSense placement is controlled, measurable and separated from interactions; non-core risk filler is removed")
} else {
	fail("AdSense/search-quality placement contract failed")
}

// Startup must have a single real-data initialization path, not temporary Custom renders.
const startupIsSinglePath =
	js.includes('new URLSearchParams(window.location.search).get("preset")') &&
	js.includes('requestedPreset !== "custom" && LOTTERY_PRESETS[requestedPreset]') &&
	js.includes('applyPreset(landingPreset, false, false)') &&
	js.includes('function applyPreset(presetKey, wipeLedger = true, trackSelection = true)') &&
	js.includes('function resetLottery(wipeLedger = true, trackReset = true)') &&
	js.includes('resetLottery(wipeLedger, false)') &&
	js.includes('if (trackReset) trackEvent("reset_lottery")') &&
	js.includes('const DEFAULT_PRESET_KEY = "us_scratch5"') &&
	!js.includes('calculatePrizeProbabilities(p1) // 20%')
if (startupIsSinglePath) {
	ok("startup uses one official default-preset render path")
} else {
	fail("startup reintroduced duplicate or temporary preset rendering")
}

// The fixed default real-data landing must be useful before deferred JS executes.
const staticDefaultOddsPresent =
	html.includes('id="oddsTopPrize">1 in 1,368,188</span>') &&
	html.includes('id="oddsAnyPrize">1 in 3.8</span>') &&
	html.includes('id="oddsOverallReturn">64.6%</span>') &&
	html.includes('id="presetEvidence"') &&
	html.includes('Official Texas Lottery Game 2755 printed distribution')
if (staticDefaultOddsPresent) {
	ok("default official odds are present in static HTML before JavaScript")
} else {
	fail("default Current Odds regressed to an empty JavaScript-only state")
}

// Manual probability changes are a Custom-mode action by default; only bootstrapping may opt out.
if (
	!js.includes('applyProbability({ activateCustom: false })') &&
	js.includes('function applyProbability({ activateCustom = true } = {})') &&
	js.includes('updatePresetEvidence("custom", true)')
) {
	ok("manual probability changes default to explicit Custom-mode evidence")
} else {
	fail("manual probability path can leave official evidence attached to a modeled distribution")
}

// 5) Official instant-lottery presets: parse the literal data and prove top odds, any-prize odds and RTP.
function extractLotteryPresets(source) {
	const marker = "const LOTTERY_PRESETS = "
	const start = source.indexOf(marker)
	const end = source.indexOf("const MODELED_PRIZE_TEMPLATE", start)
	if (start < 0 || end < 0) throw new Error("LOTTERY_PRESETS block not found")
	const literal = source.slice(start + marker.length, end).trim()
	const verifiedModels = require(path.join(root, "js/verified-lottery-models.js"))
	return vm.runInNewContext("(" + literal + ")", {
		VERIFIED_TEXAS_2755: verifiedModels.texas2755,
	})
}

function officialStats(preset) {
	const issued = preset.issuedTickets
	const tiers = preset.officialTiers
	const winners = tiers.reduce((sum, tier) => sum + tier.count, 0)
	const payout = tiers.reduce((sum, tier) => sum + tier.count * tier.rewardMoney, 0)
	return {
		topOdds: issued / tiers[0].count,
		anyPrizeProbability: winners / issued,
		rtp: payout / (issued * preset.ticketCost),
	}
}

function near(actual, expected, epsilon = 1e-10) {
	return Math.abs(actual - expected) <= epsilon
}

try {
	const presets = extractLotteryPresets(js)
	const texas = officialStats(presets.us_scratch5)
	const s1000 = officialStats(presets.speetto1000)
	const s2000 = officialStats(presets.speetto2000)

	if (
		near(texas.topOdds, 1368187.5) &&
		near(texas.anyPrizeProbability, 1451436 / 5472750) &&
		near(texas.rtp, 17674350 / (5472750 * 5)) &&
		presets.us_scratch5.evidence.url === "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/details.html_252698616.html" &&
		js.includes("const STATE_VERSION = 3")
	) {
		ok("Texas $5 Game 2755 matches official 5,472,750-ticket distribution, 1-in-3.77 overall odds and 64.59% computed RTP")
	} else {
		fail("Texas $5 Game 2755 official distribution contract failed")
	}

	if (
		s1000.topOdds === 5000000 &&
		near(s1000.anyPrizeProbability, 1652506 / 5000000) &&
		near(s1000.rtp, 0.6) &&
		presets.speetto1000.evidence.url === "https://www.dhlottery.co.kr/st/st10Intro"
	) {
		ok("Speetto 1000 matches official 5,000,000-ticket distribution and 60.0% RTP")
	} else {
		fail("Speetto 1000 official distribution contract failed")
	}

	if (
		s2000.topOdds === 5000000 &&
		near(s2000.anyPrizeProbability, 1763779 / 5000000) &&
		near(s2000.rtp, 0.6025) &&
		presets.speetto2000.evidence.url === "https://www.dhlottery.co.kr/st/st20Intro"
	) {
		ok("Speetto 2000 matches official 5,000,000-ticket distribution and 60.25% computed RTP (60.3% published)")
	} else {
		fail("Speetto 2000 official distribution contract failed")
	}
} catch (e) {
	fail("official lottery data verification failed: " + e.message)
}



// 6) Current external odds and budget simulator regression contracts.
if (
	html.includes("<td>1 in 290,472,336</td>") &&
	html.includes("https://www.megamillions.com/How-To-Play.aspx")
) {
	ok("Mega Millions uses the current 1-in-290,472,336 official jackpot odds")
} else {
	fail("Mega Millions odds/source regressed to an outdated value")
}

const landingPresetAligned =
	js.includes('const DEFAULT_PRESET_KEY = "us_scratch5"') &&
	js.includes('? requestedPreset') &&
	js.includes(': DEFAULT_PRESET_KEY') &&
	js.includes('applyPreset(landingPreset, false, false)') &&
	!js.includes("FEATURED_PRESET_KEYS") &&
	html.includes("Default real-data ticket: Texas Lottery Game 2755")
if (landingPresetAligned) {
	ok("search landing defaults to the official Texas scratch-off instead of rotating to unrelated presets")
} else {
	fail("search landing preset can drift away from the proven scratch-off intent")
}

const customModelIsolated =
	js.includes('function applyProbability({ activateCustom = true } = {})') &&
	!js.includes('applyProbability({ activateCustom: false })') &&
	js.includes('const customPreset = LOTTERY_PRESETS.custom') &&
	js.includes('presetSelect.value = "custom"') &&
	js.includes('ticketCost = customPreset.ticketCost') &&
	js.includes('currencySymbol = customPreset.currency')
if (customModelIsolated) {
	ok("custom probability input is isolated from official/game preset reward tables")
} else {
	fail("custom probability model can drift into a non-custom preset")
}

const budgetIds = ["simBudgetInput", "simBudgetBtn", "simBudgetRiskBtn", "simBudgetHint", "budgetRiskResult"]
const budgetMarkupPresent = budgetIds.every((id) => html.includes('id="' + id + '"'))
const budgetLogicPresent =
	js.includes("function runBudgetSimulation()") &&
	js.includes("Observed Return:") &&
	js.includes("Theoretical Return (current model):") &&
	js.includes('trackEvent("run_budget_simulation"') &&
	js.includes("function runBudgetRiskAnalysis()") &&
	js.includes('const $simBudgetRisk = document.getElementById("simBudgetRiskBtn")') &&
	js.includes('$simBudgetRisk.addEventListener("click", runBudgetRiskAnalysis)') &&
	js.includes("function clearSimulationOutputs()") &&
	js.includes('trackEvent("run_budget_risk_analysis"') &&
	js.includes("Profit frequency") &&
	js.includes("10th–90th percentile net")
if (budgetMarkupPresent && budgetLogicPresent) {
	ok("budget simulation and observed-vs-theoretical return UI are wired")
} else {
	fail("budget simulation regression contract failed")
}


const exactOddsIds = ["exactOddsTicketsInput", "exactOddsCalculateBtn", "exactOddsHint", "exactOddsResult"]
const exactOddsMarkupPresent =
	exactOddsIds.every((id) => html.includes('id="' + id + '"')) &&
	html.includes("Exact odds for N tickets") &&
	html.includes("1 − (1 − p)<sup>n</sup>") &&
	html.includes("≥1 any prize") &&
	html.includes("≥1 top prize")
const exactOddsLogicPresent =
	js.includes("const EXACT_ODDS_MAX_TICKETS = 1000000") &&
	js.includes("function updateExactMultiTicketOdds(track = true)") &&
	js.includes("LotteryMathCore.atLeastOne(topPrizeProbability, count)") &&
	js.includes("LotteryMathCore.atLeastOne(anyPrizeProbability, count)") &&
	js.includes('trackEvent("calculate_exact_odds"') &&
	js.includes('trackValueCompleted("exact_odds"') &&
	js.includes('updateExactMultiTicketOdds(false)')
if (exactOddsMarkupPresent && exactOddsLogicPresent) {
	ok("exact multi-ticket odds calculator expands adjacent search intent without a duplicate landing page")
} else {
	fail("exact multi-ticket odds calculator regression contract failed")
}


// 7) Growth instrumentation must target the ScratchLottery GA4 stream and expose
// one activation event plus a shared value-completion event across core paths.
const growthInstrumentationPresent =
	html.includes("gtag/js?id=G-4DYFKSNFBG") &&
	html.includes("gtag('config', 'G-4DYFKSNFBG')") &&
	!html.includes("G-ERNG0LEKY9") &&
	html.includes('src="js/analytics.js"') &&
	js.includes("ScratchAnalytics.track(name, params)") &&
	js.includes('trackEvent("tool_started"') &&
	js.includes('trackEvent("value_completed"') &&
	js.includes('trackToolStarted("scratch")') &&
	js.includes('trackValueCompleted("scratch"') &&
	js.includes("trackValueCompleted(growthMode") &&
	js.includes('trackValueCompleted("budget_risk"') &&
	js.includes('trackValueCompleted("exact_odds"')
if (growthInstrumentationPresent) {
	ok("growth funnel events target the shared host GA4 stream and mirror into Clarity")
} else {
	fail("growth instrumentation contract failed")
}


const shareLoopInstrumented =
	js.includes('const SHARE_BASE_URL = "https://saramjh.github.io/scratchLottery/"') &&
	js.includes("function shareReferralUrl(campaign)") &&
	js.includes('presetKey !== "custom" && LOTTERY_PRESETS[presetKey]') &&
	js.includes("presetParam") &&
	js.includes("utm_campaign=") &&
	js.includes("utm_content=") &&
	js.includes("function shareSimulationResult(") &&
	js.includes("function shareBudgetRiskResult(") &&
	js.includes("data-share-fast-sim") &&
	js.includes("data-share-budget-risk") &&
	js.includes('method: "native_link"') &&
	js.includes('method: "clipboard"') &&
	js.includes('trackEvent("share_attempt"') &&
	js.includes('trackEvent("share_completed"')
if (shareLoopInstrumented) {
	ok("value-moment shares carry attributable referral URLs with native and clipboard fallbacks")
} else {
	fail("share referral loop contract failed")
}

const experimentLabMarkupPresent =
	["experimentLab", "nextExperimentQuestion", "nextExperimentReason", "nextExperimentActions", "labSavedCount", "savedExperimentList", "clearSavedExperiments", "longRunSaveBtn", "modalExperimentBtn"].every((id) => html.includes('id="' + id + '"')) &&
	(html.match(/class="experiment-row"/g) || []).length === 4 &&
	html.includes('href="#experimentLab">Lab</a>') &&
	html.includes("Saved experiments never leave your browser unless you share them.")
const experimentLabLogicPresent =
	js.includes('const EXPERIMENT_LAB_STORAGE_KEY = "scratchLotteryExperimentsV1"') &&
	js.includes("const EXPERIMENT_LAB_MAX_SAVED = 12") &&
	js.includes("function saveExperiment(snapshot)") &&
	js.includes("function offerExperimentSave(container, snapshot)") &&
	js.includes("function runExperimentSnapshot(snapshot") &&
	js.includes("function runCuratedExperiment(id") &&
	js.includes("function setNextExperimentContext(context)") &&
	js.includes("function initExperimentLab()") &&
	js.includes('trackEvent("experiment_selected"') &&
	js.includes('trackEvent("experiment_run"') &&
	js.includes('trackEvent("experiment_saved"') &&
	js.includes('$resetLottery.textContent = "Reset play totals"') &&
	js.includes("My Lab stays saved") &&
	js.includes("localStorage.removeItem(EXPERIMENT_LAB_STORAGE_KEY)")
const experimentLabStylePresent =
	css.includes(".experiment-lab {") &&
	css.includes(".experiment-row {") &&
	css.includes("min-height: 72px;") &&
	css.includes(".saved-experiment-row {")
if (experimentLabMarkupPresent && experimentLabLogicPresent && experimentLabStylePresent) {
	ok("Experiment Lab reuses verified tools, keeps My Lab local-only and preserves play-reset separation")
} else {
	fail("Experiment Lab regression contract failed")
}

const trackerPath = path.join(root, "data/live/texas-scratch-watch.json")
const trackerUpdaterPath = path.join(root, "scripts/update_live_content.py")
const trackerWorkflowPath = path.join(root, ".github/workflows/refresh-live-content.yml")
let trackerData = null
try {
	trackerData = JSON.parse(fs.readFileSync(trackerPath, "utf8"))
} catch (error) {
	fail("official prize tracker data is missing or invalid JSON: " + error.message)
}

const trackerGameIds = ["2712", "2751", "2755"]
const trackerSnapshotsValid =
	trackerData?.schemaVersion === 1 &&
	trackerData?.provider === "Texas Lottery" &&
	Object.keys(trackerData?.games || {}).sort().join(",") === trackerGameIds.join(",") &&
	trackerGameIds.every((gameId) => {
		const game = trackerData.games[gameId]
		if (
			!game ||
			game.gameNumber !== gameId ||
			game.price !== 5 ||
			!String(game.sourceUrl || "").startsWith("https://www.texaslottery.com/") ||
			!Array.isArray(game.history) ||
			game.history.length < 1 ||
			JSON.stringify(game.current) !== JSON.stringify(game.history[game.history.length - 1])
		) return false

		return game.history.every((snapshot) => {
			if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshot.sourceDate || "")) return false
			if (!(snapshot.ticketCount > 0) || !(snapshot.overallOdds > 1)) return false
			if (!Array.isArray(snapshot.prizes) || snapshot.prizes.length < 1) return false
			const printed = snapshot.prizes.reduce((sum, row) => sum + row.printed, 0)
			const claimed = snapshot.prizes.reduce((sum, row) => sum + row.claimed, 0)
			const rowsValid = snapshot.prizes.every((row) =>
				row.amount > 0 &&
				row.printed >= 0 &&
				row.claimed >= 0 &&
				row.claimed <= row.printed &&
				row.unclaimed === row.printed - row.claimed
			)
			return (
				rowsValid &&
				snapshot.totalPrizes.printed === printed &&
				snapshot.totalPrizes.claimed === claimed &&
				snapshot.totalPrizes.unclaimed === printed - claimed &&
				snapshot.topPrize.amount === snapshot.prizes[0].amount &&
				snapshot.topPrize.unclaimed === snapshot.topPrize.printed - snapshot.topPrize.claimed
			)
		})
	})

const houstonTracker = trackerData?.games?.["2755"]?.current
const houstonPrintedDistribution = [
	[100000, 4],
	[5000, 10],
	[500, 1159],
	[100, 20954],
	[50, 42891],
	[20, 145940],
	[10, 656742],
	[5, 583736],
]
const trackerHoustonAligned =
	houstonTracker?.ticketCount === 5472750 &&
	houstonTracker?.overallOdds === 3.77 &&
	JSON.stringify(houstonTracker?.prizes?.map((row) => [row.amount, row.printed])) === JSON.stringify(houstonPrintedDistribution)

const trackerMarkupValid =
	html.includes('id="prizeTracker"') &&
	html.includes("<!-- TEXAS_PRIZE_TRACKER_DATA_START -->") &&
	html.includes("<!-- TEXAS_PRIZE_TRACKER_DATA_END -->") &&
	html.includes("Texas Lottery claimed-prize tables") &&
	html.includes("Houston Texans · Game 2755") &&
	html.includes("Azulejos · Game 2751") &&
	html.includes("50X The Cash · Game 2712") &&
	html.includes("<strong>Not current ticket odds.</strong>") &&
	!html.includes("best scratch ticket") &&
	!html.includes("hot ticket")

const trackerUpdater = fs.readFileSync(trackerUpdaterPath, "utf8")
const trackerWorkflow = fs.readFileSync(trackerWorkflowPath, "utf8")
const trackerAutomationValid =
	trackerUpdater.includes('ALL_GAMES_URL = "https://www.texaslottery.com/') &&
	trackerUpdater.includes("validate_registry_entry") &&
	trackerUpdater.includes("claimed > printed") &&
	trackerUpdater.includes("snapshot_signature") &&
	trackerUpdater.includes('SITEMAP_PATH = ROOT / "sitemap.xml"') &&
	trackerWorkflow.includes("schedule:") &&
	trackerWorkflow.includes("python3 scripts/update_live_content.py") &&
	trackerWorkflow.includes("node scripts/verify.js") &&
	trackerWorkflow.includes("git add index.html sitemap.xml data/live/texas-scratch-watch.json") &&
	trackerWorkflow.includes("data/live/texas-scratch-watch.json") &&
	trackerWorkflow.includes("actions/deploy-pages@v4") &&
	/\.tracker-row > a\s*\{[\s\S]*?min-height:\s*44px;/.test(css)

if (trackerSnapshotsValid && trackerHoustonAligned && trackerMarkupValid && trackerAutomationValid) {
	ok("official Texas prize tracker is source-bounded, internally consistent, archived and safely automated")
} else {
	fail("official Texas prize tracker regression contract failed")
}

// 8) Impeccable refinement regression contracts: destructive actions, accessibility,
// progressive disclosure, human-readable probability formatting, and anti-slop cleanup.
const impeccableRefinementPresent =
	html.includes('id="navToggle" class="nav-toggle-btn" aria-expanded="false"') &&
	html.includes('id="topbarNav"') &&
	navigationJs.includes("function setProductNavOpen(open") &&
	navigationJs.includes('event.key !== "Escape"') &&
	html.includes('role="dialog" aria-modal="true"') &&
	js.includes('event.key === "Escape"') &&
	js.includes("function modalFocusableElements()") &&
	js.includes("function requestResetLottery()") &&
	js.includes('textContent = "Confirm reset"') &&
	html.includes('id="shareCardBtn" class="share-btn" hidden') &&
	html.includes('id="lotteryLogTableToggle" class="text-link-btn" hidden') &&
	js.includes("shareButton.hidden = totalAttempts === 0") &&
	js.includes("toggle.hidden = lotteryRecord.length === 0") &&
	html.includes('id="secondaryGameChoiceGrid"') &&
	js.includes('const SECONDARY_PRESET_KEYS = new Set(["custom", "lucky_fun"])') &&
	js.includes("function formatTierProbability(probability)") &&
	!js.includes("probability.toFixed(10)") &&
	!css.includes("border-left: 3px solid var(--accent)") &&
	!css.includes("@keyframes glitter") &&
	!html.includes("Explore other web projects:") &&
	(html.match(/class="scratch-cell-skeleton"/g) || []).length === 15 &&
	/\.disclosure-trigger\s*\{[\s\S]*?min-height:\s*44px;/.test(css) &&
	/\.custom-select-trigger\s*\{[\s\S]*?min-height:\s*44px;/.test(css) &&
	!/<(?:select|option|details|summary)\b|type="number"/i.test(html) &&
	!/(?:-apple-system|Segoe UI|Georgia|Times New Roman)/.test(css) &&
	js.includes("function initDisclosures()") &&
	js.includes("function initCustomSelect(root)") &&
	html.includes('<div id="fastSimChart" class="fast-sim-chart"><p class="lottery-log-empty">Run a simulation to see results here.</p></div>') &&
	js.includes('chart.innerHTML = `<p class="lottery-log-empty">Run a simulation to see results here.</p>`')
if (impeccableRefinementPresent) {
	ok("Impeccable refinement contracts cover reset safety, a11y, disclosure, readable odds and anti-slop cleanup")
} else {
	fail("Impeccable refinement regression contract failed")
}

// 9) Visual composition contract: the play surface is bounded to the ticket stage,
 // and analysis continues full-width instead of leaving a permanent dead ticket column.
const visualCompositionPresent =
	html.includes('<main class="site-main">') &&
	html.includes('<section class="play-stage">') &&
	html.includes('<div class="play-console">') &&
	html.includes('<div class="analysis-stack">') &&
	html.includes('<div class="two-col forecast-grid">') &&
	!html.includes('class="layout"') &&
	!html.includes('class="workspace"') &&
	css.includes(".play-stage {") &&
	css.includes(".play-console {") &&
	css.includes(".analysis-stack {") &&
	css.includes("grid-template-columns: 380px minmax(0, 1fr);") &&
	css.includes(".forecast-grid {") &&
	!css.includes(".workspace {") &&
	!css.includes(".layout {")
if (visualCompositionPresent) {
	ok("visual composition uses a bounded play stage and full-width analysis stack without legacy layout ownership")
} else {
	fail("visual composition regression contract failed")
}

// 10) Motion and viewport hardening contracts: state-change motion only, reduced-motion respected,
 // platform-native visible select chrome removed, and narrow ticket prizes are explicitly constrained.
const motionViewportPresent =
	js.includes("function motionEnabled()") &&
	js.includes("function animateTicketRefresh()") &&
	js.includes("function animatePresetRefresh()") &&
	js.includes("function animateSimulationOutput()") &&
	js.includes("function setMetricText(el, nextText)") &&
	js.includes('modal.classList.add("is-open")') &&
	js.includes('modal.classList.add("is-closing")') &&
	css.includes("--motion-base: 220ms") &&
	css.includes("@media (prefers-reduced-motion: reduce)") &&
	css.includes("#jackpotModal.is-open .modal-content") &&
	css.includes(".topbar-nav.is-open") &&
	css.includes("appearance: none;") &&
	css.includes("@media (max-width: 799px)") &&
	css.includes("white-space: nowrap;") &&
	!css.includes("overflow-x: hidden; /* 광고 iframe") &&
	!css.includes(".symbol-shape-star {\n\tclip-path:") &&
	js.includes('<svg class="symbol-shape symbol-shape-star"')
if (motionViewportPresent) {
	ok("motion explains ticket/preset/simulation/modal state changes and viewport hardening preserves reduced-motion/native-control constraints")
} else {
	fail("motion and viewport hardening regression contract failed")
}

process.exit(failed ? 1 : 0)
