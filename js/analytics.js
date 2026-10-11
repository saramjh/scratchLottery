(function (root, factory) {
	"use strict"
	const api = factory(root)
	if (typeof module === "object" && module.exports) module.exports = api
	if (root) root.ScratchAnalytics = api
})(typeof window !== "undefined" ? window : globalThis, function (root) {
	"use strict"

	const APP_ID = "scratchLottery"

	function track(name, params = {}) {
		const scopedParams = {
			app_id: APP_ID,
			...params,
		}
		if (typeof root.gtag === "function") {
			root.gtag("event", name, scopedParams)
		}
		if (typeof root.clarity === "function") {
			root.clarity("event", APP_ID + ":" + name)
		}
	}

	// First-party page-area diagnostics, NOT Google Active View ad viewability.
	// Never inspect ad iframes, trigger ad refreshes, or infer ad impressions.
	function observeAdRegions(doc = root.document) {
		if (!doc || typeof root.IntersectionObserver !== "function") return () => {}
		const regions = [...doc.querySelectorAll(".ad-safe-container[data-ad-placement]")]
		if (!regions.length) return () => {}

		const reached = new Set()
		const dwelled = new Set()
		const inView = new Map()
		const timers = new Map()
		let stopped = false

		function clearDwell(region) {
			if (!timers.has(region)) return
			root.clearTimeout(timers.get(region))
			timers.delete(region)
		}

		function eligible() {
			return doc.visibilityState === "visible" &&
				doc.getElementById("jackpotModal")?.getAttribute("aria-hidden") !== "false"
		}

		function startDwell(region) {
			if (stopped || !eligible() || dwelled.has(region) || timers.has(region) || (inView.get(region) || 0) < 0.5) return
			timers.set(region, root.setTimeout(() => {
				timers.delete(region)
				if (stopped || !eligible() || (inView.get(region) || 0) < 0.5 || dwelled.has(region)) return
				dwelled.add(region)
				track("ad_region_dwelled", { placement: region.dataset.adPlacement })
			}, 1000))
		}

		const observer = new root.IntersectionObserver((entries) => {
			for (const entry of entries) {
				const region = entry.target
				inView.set(region, entry.isIntersecting ? entry.intersectionRatio : 0)
				if (entry.isIntersecting && eligible() && !reached.has(region)) {
					reached.add(region)
					track("ad_region_reached", { placement: region.dataset.adPlacement })
				}
				if ((inView.get(region) || 0) >= 0.5) startDwell(region)
				else clearDwell(region)
			}
		}, { threshold: [0, 0.5, 1] })

		function onVisibilityChange() {
			if (!eligible()) {
				for (const region of timers.keys()) clearDwell(region)
			} else {
				for (const region of regions) startDwell(region)
			}
		}

		for (const region of regions) observer.observe(region)
		doc.addEventListener("visibilitychange", onVisibilityChange)
		return () => {
			stopped = true
			observer.disconnect()
			doc.removeEventListener("visibilitychange", onVisibilityChange)
			for (const region of timers.keys()) clearDwell(region)
		}
	}

	return Object.freeze({
		appId: APP_ID,
		track,
		observeAdRegions,
	})
})
