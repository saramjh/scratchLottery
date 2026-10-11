#!/usr/bin/env node
// Deterministic unit regression for first-party ad-region diagnostics.
// These events describe PAGE AREAS, never paid ad impressions or Google Active View.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const vm = require("node:vm")
const path = require("node:path")

const regions = [
	{ dataset: { adPlacement: "tracker-reference-break" } },
	{ dataset: { adPlacement: "static-reference-break" } },
]
let visibility = "visible"
let modalHidden = "true"
let observed
let observer
let timerSeq = 0
const timers = new Map()
const calls = []
const listeners = new Map()
const doc = {
	querySelectorAll: () => regions,
	getElementById: () => ({ getAttribute: () => modalHidden }),
	get visibilityState() { return visibility },
	addEventListener: (name, fn) => listeners.set(name, fn),
	removeEventListener: (name) => listeners.delete(name),
}
const root = {
	document: doc,
	gtag: (kind, name, params) => calls.push({ kind, name, params }),
	setTimeout: (fn) => { const id = ++timerSeq; timers.set(id, fn); return id },
	clearTimeout: (id) => timers.delete(id),
	IntersectionObserver: class {
		constructor(callback, options) { this.callback = callback; this.options = options; observer = this }
		observe(el) { (this.nodes ||= []).push(el) }
		disconnect() { this.disconnected = true }
	},
}
function advanceOneSecond() {
	const scheduled = [...timers.values()]
	timers.clear()
	for (const task of scheduled) task()
}
function intersect(region, ratio) {
	observer.callback([{ target: region, intersectionRatio: ratio, isIntersecting: ratio > 0 }])
}
const source = fs.readFileSync(path.join(__dirname, "../js/analytics.js"), "utf8")
vm.runInNewContext(source, { window: root })
assert.equal(root.ScratchAnalytics.appId, "scratchLottery")
const dispose = root.ScratchAnalytics.observeAdRegions()
assert.equal(observer.nodes.length, 2)
assert.equal(JSON.stringify([...observer.options.threshold]), JSON.stringify([0, 0.5, 1]))

// Out of view: no diagnostic. One crossing: one reached event.
intersect(regions[0], 0)
assert.equal(calls.length, 0)
intersect(regions[0], 0.25)
assert.equal(calls.length, 1)
assert.equal(calls[0].name, "ad_region_reached")
assert.equal(calls[0].params.app_id, "scratchLottery")
assert.equal(calls[0].params.placement, "tracker-reference-break")
intersect(regions[0], 0.7)
intersect(regions[0], 0.1) // quick scrolling must cancel dwell
advanceOneSecond()
assert.equal(calls.length, 1)

// Half the static AREA shown for a second. This does not assert ad fill/viewability.
intersect(regions[0], 0.8)
advanceOneSecond()
assert.equal(calls.length, 2)
assert.equal(calls[1].name, "ad_region_dwelled")
intersect(regions[0], 0)
intersect(regions[0], 0.9)
advanceOneSecond()
assert.equal(calls.length, 2) // deduplicated

// Overlay and hidden tabs must not count toward viewable AREA dwell.
intersect(regions[1], 0.75)
assert.equal(calls.length, 3)
modalHidden = "false"
advanceOneSecond()
assert.equal(calls.length, 3)
modalHidden = "true"
intersect(regions[1], 0)
intersect(regions[1], 0.9)
visibility = "hidden"
listeners.get("visibilitychange")()
advanceOneSecond()
assert.equal(calls.length, 3)
visibility = "visible"
listeners.get("visibilitychange")()
advanceOneSecond()
assert.equal(calls.length, 4)
assert.equal(calls[3].name, "ad_region_dwelled")
assert.equal(calls[3].params.placement, "static-reference-break")
dispose()
assert.equal(observer.disconnected, true)
assert.equal(listeners.has("visibilitychange"), false)
assert.equal(timers.size, 0)
console.log("✓ Ad region entered/dwelled telemetry: one-shot, 50%/1s, background and overlay guards")
