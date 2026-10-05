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

	return Object.freeze({
		appId: APP_ID,
		track,
	})
})
