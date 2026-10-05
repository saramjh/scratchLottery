(function (root, factory) {
	"use strict"
	const models = factory()
	if (typeof module === "object" && module.exports) module.exports = models
	if (root) root.VerifiedLotteryModels = models
})(typeof window !== "undefined" ? window : globalThis, function () {
	"use strict"

	function deepFreeze(value) {
		if (!value || typeof value !== "object" || Object.isFrozen(value)) return value
		Object.freeze(value)
		Object.values(value).forEach(deepFreeze)
		return value
	}

	return deepFreeze({
		texas2755: {
			id: "texas-2755",
			name: "Texas $5 Houston Texans",
			ticketCost: 5,
			p1: "0.0000730894",
			currency: "$",
			rewards: [100000, 5000, 500, 100, 50, 20, 10, 5],
			issuedTickets: 5472750,
			officialTiers: [
				{ rewardMoney: 100000, count: 4 },
				{ rewardMoney: 5000, count: 10 },
				{ rewardMoney: 500, count: 1159 },
				{ rewardMoney: 100, count: 20954 },
				{ rewardMoney: 50, count: 42891 },
				{ rewardMoney: 20, count: 145940 },
				{ rewardMoney: 10, count: 656742 },
				{ rewardMoney: 5, count: 583736 },
			],
			evidence: {
				label: "Official Texas Lottery Game 2755 printed distribution · $5 ticket · published overall odds 1 in 3.77",
				url: "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/details.html_252698616.html",
			},
		},
	})
})
