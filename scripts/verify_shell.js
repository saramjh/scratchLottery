#!/usr/bin/env node
"use strict"

const fs = require("fs")
const path = require("path")

const root = path.join(__dirname, "..")
let failures = 0

function ok(message) { console.log("✓ " + message) }
function fail(message) { failures += 1; console.error("✗ " + message) }
function expect(condition, message) { condition ? ok(message) : fail(message) }
function read(relative) { return fs.readFileSync(path.join(root, relative), "utf8") }

const rootHtml = read("index.html")
const mathHtml = read("math/index.html")
const baseCss = read("css/style.css")
const mathCss = read("css/math.css")
const rootJs = read("js/script.js")
const mathJs = read("js/math-of-lottery.js")
const navPath = path.join(root, "js/navigation.js")

function navLabels(html) {
	const match = html.match(/<nav class="topbar-nav"[^>]*>([\s\S]*?)<\/nav>/)
	if (!match) return []
	return [...match[1].matchAll(/<a href="[^"]+"[^>]*>([^<]+)<\/a>/g)].map((m) => m[1].trim())
}

expect(fs.existsSync(navPath), "shared navigation behavior owner exists")
if (fs.existsSync(navPath)) {
	const navJs = fs.readFileSync(navPath, "utf8")
	expect(
		navJs.includes("function setProductNavOpen") &&
		navJs.includes('document.getElementById("navToggle")') &&
		navJs.includes('document.getElementById("topbarNav")'),
		"shared navigation module owns mobile nav state"
	)
}

expect(
	!rootJs.includes("setMobileNavOpen") &&
	!rootJs.includes('const $navToggle = document.getElementById("navToggle")') &&
	!mathJs.includes("function setupNav"),
	"page scripts do not own global navigation"
)

expect(
	rootHtml.includes('<script src="js/navigation.js" defer></script>') &&
	mathHtml.includes('<script src="../js/navigation.js" defer></script>'),
	"both pages load the same navigation behavior"
)

const expected = ["Play", "Odds", "Simulate", "Math", "Lab", "Tracker"]
expect(
	JSON.stringify(navLabels(rootHtml)) === JSON.stringify(expected) &&
	JSON.stringify(navLabels(mathHtml)) === JSON.stringify(expected),
	"root and math expose one global navigation order"
)

expect(
	mathHtml.includes('aria-current="page">Math</a>') &&
	mathHtml.includes('class="math-local-nav"') &&
	mathHtml.includes('href="#expectedValueLesson"') &&
	mathHtml.includes('href="#largeNumbersLesson"') &&
	mathHtml.includes('href="#independenceLesson"'),
	"math concepts use local content navigation instead of a second global navbar"
)

expect(
	!mathHtml.includes('class="site-main math-main"') &&
	!mathCss.match(/\.math-main\s*\{[\s\S]*?max-width:/) &&
	!mathCss.match(/\.math-main\s*\{[\s\S]*?padding:/),
	"math page does not override shared site-main container geometry"
)

expect(
	baseCss.includes("--content-max: 1240px;") &&
	/\.site-main\s*\{[\s\S]*?max-width:\s*var\(--content-max\)/.test(baseCss) &&
	/\.topbar-inner\s*\{[\s\S]*?max-width:\s*var\(--content-max\)[\s\S]*?padding-inline:\s*var\(--space-3\)/.test(baseCss) &&
	baseCss.includes("padding: 18px 0;"),
	"header and page body share one outer width token"
)

expect(
	rootHtml.includes('href="math/">Math</a>') &&
	mathHtml.includes('href="../#simCard">Simulate</a>') &&
	mathHtml.includes('href="../#experimentLab">Lab</a>') &&
	mathHtml.includes('href="../#prizeTracker">Tracker</a>'),
	"global navigation supports Play → Analyze → Learn → Return flow across pages"
)

if (failures) {
	console.error("\n" + failures + " product-shell contract(s) failed.")
	process.exit(1)
}
console.log("\nProduct-shell contracts passed.")
