(function (root, factory) {
	"use strict"
	const api = factory()
	if (typeof module === "object" && module.exports) module.exports = api
	if (root) root.LotteryMathCore = api
})(typeof window !== "undefined" ? window : globalThis, function () {
	"use strict"

	function assertProbability(value, label) {
		if (!Number.isFinite(value) || value < 0 || value > 1) {
			throw new RangeError((label || "probability") + " must be between 0 and 1")
		}
	}

	function validateOutcomes(outcomes) {
		if (!Array.isArray(outcomes) || outcomes.length === 0) {
			throw new TypeError("outcomes must be a non-empty array")
		}
		let totalProbability = 0
		for (const outcome of outcomes) {
			if (!outcome || !Number.isFinite(outcome.probability) || !Number.isFinite(outcome.payout)) {
				throw new TypeError("each outcome needs finite probability and payout values")
			}
			assertProbability(outcome.probability, "outcome probability")
			if (outcome.payout < 0) throw new RangeError("payout cannot be negative")
			totalProbability += outcome.probability
		}
		if (Math.abs(totalProbability - 1) > 1e-9) {
			throw new RangeError("outcome probabilities must sum to 1")
		}
	}

	function issueModelOutcomes(model) {
		if (!model || !(model.issuedTickets > 0) || !Array.isArray(model.officialTiers)) {
			throw new TypeError("model needs issuedTickets and officialTiers")
		}
		const winners = model.officialTiers.map((tier) => ({
			probability: tier.count / model.issuedTickets,
			payout: tier.rewardMoney,
			label: "$" + tier.rewardMoney.toLocaleString("en-US"),
		}))
		const winningProbability = winners.reduce((sum, outcome) => sum + outcome.probability, 0)
		if (winningProbability > 1 + 1e-12) throw new RangeError("winning tier counts exceed issue size")
		return [
			...winners,
			{ probability: Math.max(0, 1 - winningProbability), payout: 0, label: "No prize" },
		]
	}

	function expectedPayout(outcomes) {
		validateOutcomes(outcomes)
		return outcomes.reduce((sum, outcome) => sum + outcome.probability * outcome.payout, 0)
	}

	function returnToPlayer(ticketCost, outcomes) {
		if (!(ticketCost > 0)) throw new RangeError("ticketCost must be positive")
		return expectedPayout(outcomes) / ticketCost
	}

	function expectedNet(ticketCost, outcomes) {
		return expectedPayout(outcomes) - ticketCost
	}

	function variance(outcomes) {
		validateOutcomes(outcomes)
		const mean = expectedPayout(outcomes)
		return outcomes.reduce(
			(sum, outcome) => sum + outcome.probability * Math.pow(outcome.payout - mean, 2),
			0
		)
	}

	function standardDeviation(outcomes) {
		return Math.sqrt(variance(outcomes))
	}

	function atLeastOne(probability, trials) {
		assertProbability(probability)
		if (!Number.isInteger(trials) || trials < 0) {
			throw new RangeError("trials must be a non-negative integer")
		}
		return 1 - Math.pow(1 - probability, trials)
	}

	function runningMean(values) {
		if (!Array.isArray(values)) throw new TypeError("values must be an array")
		let total = 0
		return values.map((value, index) => {
			if (!Number.isFinite(value)) throw new TypeError("runningMean values must be finite")
			total += value
			return total / (index + 1)
		})
	}

	function seededRandom(seed) {
		let state = Number(seed) >>> 0
		return function random() {
			state = (1664525 * state + 1013904223) >>> 0
			return state / 4294967296
		}
	}

	function sampleOutcome(outcomes, random) {
		validateOutcomes(outcomes)
		const rng = typeof random === "function" ? random : Math.random
		const draw = rng()
		let cumulative = 0
		for (const outcome of outcomes) {
			cumulative += outcome.probability
			if (draw < cumulative) return outcome
		}
		return outcomes[outcomes.length - 1]
	}

	function simulatePayouts(outcomes, trials, seed) {
		if (!Number.isInteger(trials) || trials < 1) {
			throw new RangeError("trials must be a positive integer")
		}
		const rng = seededRandom(seed)
		const payouts = []
		for (let i = 0; i < trials; i += 1) {
			payouts.push(sampleOutcome(outcomes, rng).payout)
		}
		return payouts
	}

	return Object.freeze({
		issueModelOutcomes,
		expectedPayout,
		expectedNet,
		returnToPlayer,
		variance,
		standardDeviation,
		atLeastOne,
		runningMean,
		seededRandom,
		sampleOutcome,
		simulatePayouts,
	})
})
