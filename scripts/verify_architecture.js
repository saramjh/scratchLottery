#!/usr/bin/env node
"use strict"

const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
let failures = 0

function pass(message) {
	console.log("✓ " + message)
}

function fail(message) {
	failures += 1
	console.error("✗ " + message)
}

function expect(condition, message) {
	if (condition) pass(message)
	else fail(message)
}

function read(relativePath) {
	return fs.readFileSync(path.join(root, relativePath), "utf8")
}

const mainHtml = read("index.html")
const mathHtml = read("math/index.html")
const globalCss = read("css/style.css")
const mainJs = read("js/script.js")
const mathJs = read("js/math-of-lottery.js")
const deployWorkflow = read(".github/workflows/deploy.yml")
const ciWorkflow = read(".github/workflows/ci.yml")
const refreshWorkflow = read(".github/workflows/refresh-live-content.yml")

const analyticsPath = path.join(root, "js/analytics.js")
const mathCssPath = path.join(root, "css/math.css")
const architecturePath = path.join(root, "ARCHITECTURE.md")

expect(fs.existsSync(analyticsPath), "one shared analytics adapter exists")
expect(fs.existsSync(mathCssPath), "math page styles have a page-specific owner")
expect(fs.existsSync(architecturePath), "architecture ownership and invariants are documented")

expect(
	mainHtml.includes('<script src="js/analytics.js" defer></script>') &&
		mainHtml.indexOf('src="js/analytics.js"') < mainHtml.indexOf('src="js/script.js"'),
	"flagship loads the shared analytics adapter before page logic"
)
expect(
	mathHtml.includes('<script src="../js/analytics.js" defer></script>') &&
		mathHtml.indexOf('src="../js/analytics.js"') < mathHtml.indexOf('src="../js/math-of-lottery.js"'),
	"math page loads the shared analytics adapter before page logic"
)

expect(
	mathHtml.includes('<link rel="stylesheet" href="../css/math.css">') &&
		!mainHtml.includes("css/math.css"),
	"math stylesheet is loaded only by the math page"
)
expect(
	!globalCss.includes(".math-page") &&
		!globalCss.includes(".math-main") &&
		!globalCss.includes(".math-lesson") &&
		!globalCss.includes(".math-trial-btn"),
	"global stylesheet does not own math-page selectors"
)

expect(
	!mainJs.includes("gtag(") &&
		!mainJs.includes("clarity(") &&
		mainJs.includes("ScratchAnalytics.track("),
	"flagship analytics side effects flow through the shared adapter"
)
expect(
	!mathJs.includes("gtag(") &&
		!mathJs.includes("clarity(") &&
		mathJs.includes("ScratchAnalytics.track("),
	"math analytics side effects flow through the shared adapter"
)

if (fs.existsSync(analyticsPath)) {
	const calls = []
	const oldGtag = global.gtag
	const oldClarity = global.clarity
	try {
		global.gtag = (...args) => calls.push(["gtag", ...args])
		global.clarity = (...args) => calls.push(["clarity", ...args])
		delete require.cache[require.resolve(analyticsPath)]
		const analytics = require(analyticsPath)
		analytics.track("architecture_probe", { content_id: "probe" })
		expect(
			calls.length === 2 &&
				calls[0][0] === "gtag" &&
				calls[0][1] === "event" &&
				calls[0][2] === "architecture_probe" &&
				calls[0][3]?.app_id === "scratchLottery" &&
				calls[0][3]?.content_id === "probe" &&
				calls[1][0] === "clarity" &&
				calls[1][1] === "event" &&
				calls[1][2] === "scratchLottery:architecture_probe",
			"shared analytics adapter preserves GA4 app_id and Clarity namespace behavior"
		)
	} finally {
		if (oldGtag === undefined) delete global.gtag
		else global.gtag = oldGtag
		if (oldClarity === undefined) delete global.clarity
		else global.clarity = oldClarity
	}
}

for (const [name, workflow] of [
	["deploy", deployWorkflow],
	["CI", ciWorkflow],
	["refresh", refreshWorkflow],
]) {
	expect(
		workflow.includes("node scripts/verify.js") &&
			workflow.includes("node scripts/verify_math_page.js") &&
			workflow.includes("node scripts/verify_architecture.js") &&
			workflow.includes("node scripts/verify_shell.js"),
		name + " workflow runs all repository contract verifiers"
	)
}

expect(
	!fs.existsSync(path.join(root, ".DS_Store")) &&
		!fs.existsSync(path.join(root, "css/.DS_Store")) &&
		!fs.existsSync(path.join(root, "css/font/.DS_Store")),
	"repository working tree contains no Finder metadata residue"
)

if (failures) {
	console.error("\n" + failures + " architecture contract(s) failed.")
	process.exit(1)
}
console.log("\nArchitecture contracts passed.")
