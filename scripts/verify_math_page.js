#!/usr/bin/env node
"use strict"

const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
let failures = 0

function ok(message) {
	console.log("✓ " + message)
}

function fail(message) {
	failures += 1
	console.error("✗ " + message)
}

function expect(condition, message) {
	if (condition) ok(message)
	else fail(message)
}

const mathHtmlPath = path.join(root, "math", "index.html")
const mathJsPath = path.join(root, "js", "math-of-lottery.js")
const corePath = path.join(root, "js", "lottery-math-core.js")
const modelsPath = path.join(root, "js", "verified-lottery-models.js")
const mainHtml = fs.readFileSync(path.join(root, "index.html"), "utf8")
const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8")
const mainJs = fs.readFileSync(path.join(root, "js", "script.js"), "utf8")

for (const [filePath, label] of [
	[mathHtmlPath, "math learning page"],
	[mathJsPath, "math interaction script"],
	[corePath, "shared lottery math core"],
	[modelsPath, "shared verified lottery model"],
]) {
	expect(fs.existsSync(filePath), label + " exists")
}

if (
	fs.existsSync(mathHtmlPath) &&
	fs.existsSync(mathJsPath) &&
	fs.existsSync(corePath) &&
	fs.existsSync(modelsPath)
) {
	const html = fs.readFileSync(mathHtmlPath, "utf8")
	const js = fs.readFileSync(mathJsPath, "utf8")
	const models = require(modelsPath)
	const core = require(corePath)

	expect(
		html.includes("<title>Scratch-Off Lottery Math: Probability, Expected Value &amp; Variance</title>"),
		"math page has distinct informational title"
	)
	expect(
		html.includes('<link rel="canonical" href="https://saramjh.github.io/scratchLottery/math/">'),
		"math page has self canonical"
	)
	expect(
		(html.match(/<h1[ >]/g) || []).length === 1 &&
			/<h1[^>]*>The Math of Scratch-Off Lotteries<\/h1>/.test(html),
		"math page has one descriptive H1"
	)
	expect(
		["expectedValueLesson", "largeNumbersLesson", "independenceLesson"].every((id) =>
			html.includes('id="' + id + '"')
		),
		"math page exposes three focused learning modules"
	)
	expect(
		html.includes('href="../#simCard"') &&
			html.includes('href="../#oddsCard"') &&
			html.includes("Texas Lottery Game 2755"),
		"math page links concepts back to product tools and sourced model"
	)
	expect(
		html.includes('aria-live="polite"') &&
			html.includes('aria-label="Running return chart"') &&
			html.includes('aria-label="Independent trial sequence"'),
		"interactive visuals have accessible textual/state semantics"
	)
	expect(
		!html.includes("FAQPage") &&
			!html.includes("llms.txt") &&
			!html.includes("best scratch") &&
			!html.includes("beat the odds"),
		"math page avoids GEO/SEO gimmicks and gambling-optimization claims"
	)
	expect(
		js.includes('matchMedia("(prefers-reduced-motion: reduce)")') &&
			js.includes("simulatePayouts(mathOutcomes, trials, 2755)") &&
			js.includes("same reproducible teaching sequence") &&
			js.includes("ScratchAnalytics.track(name") &&
			js.includes('trackMathEvent("math_lesson_run"') &&
			js.includes('trackMathEvent("math_to_simulator"'),
		"math interactions respect reduced motion and are growth-instrumented"
	)

	const model = models.texas2755
	expect(
		model &&
			model.ticketCost === 5 &&
			model.issuedTickets === 5472750 &&
			model.officialTiers.length === 8,
		"shared Texas 2755 verified model has expected issue contract"
	)
	expect(
		mainJs.includes("VerifiedLotteryModels.texas2755"),
		"main simulator consumes the shared Texas model instead of duplicating it"
	)

	const outcomes = core.issueModelOutcomes(model)
	const expectedPayout = core.expectedPayout(outcomes)
	const rtp = core.returnToPlayer(model.ticketCost, outcomes)
	expect(
		Math.abs(expectedPayout - 3.229518980402905) < 1e-12,
		"shared core reproduces Texas 2755 expected payout"
	)
	expect(
		Math.abs(rtp - 0.645903796080581) < 1e-12,
		"shared core reproduces Texas 2755 RTP"
	)
	expect(
		Math.abs(core.atLeastOne(0.25, 10) - (1 - Math.pow(0.75, 10))) < 1e-15,
		"at-least-one probability formula is exact"
	)
	expect(
		JSON.stringify(core.runningMean([1, 3, 5])) === JSON.stringify([1, 2, 3]),
		"running mean supports law-of-large-numbers visualization"
	)
	const rngA = core.seededRandom(2755)
	const rngB = core.seededRandom(2755)
	expect(
		[...Array(8)].every(() => rngA() === rngB()),
		"seeded simulations are reproducible for teaching"
	)
}

expect(
	mainHtml.includes('href="math/"') || mainHtml.includes('href="./math/"'),
	"flagship links internally to the distinct math learning job"
)
expect(
	sitemap.includes("<loc>https://saramjh.github.io/scratchLottery/math/</loc>"),
	"sitemap includes the math learning page"
)
expect(
	mainHtml.includes("<title>Scratch Off Simulator — Free Scratch Card &amp; Ticket Simulator</title>"),
	"flagship simulator title remains untouched"
)

if (failures) {
	console.error("\n" + failures + " math-page contract(s) failed.")
	process.exit(1)
}
console.log("\nMath learning contracts passed.")
