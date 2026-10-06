"use strict"

const mathModel = VerifiedLotteryModels.texas2755
const mathOutcomes = LotteryMathCore.issueModelOutcomes(mathModel)
const mathExpectedPayout = LotteryMathCore.expectedPayout(mathOutcomes)
const mathRtp = LotteryMathCore.returnToPlayer(mathModel.ticketCost, mathOutcomes)
const mathExpectedNet = LotteryMathCore.expectedNet(mathModel.ticketCost, mathOutcomes)
const mathStdDev = LotteryMathCore.standardDeviation(mathOutcomes)
const anyPrizeProbability = mathOutcomes
	.filter((outcome) => outcome.payout > 0)
	.reduce((sum, outcome) => sum + outcome.probability, 0)

function motionEnabled() {
	return !window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function trackMathEvent(name, params = {}) {
	ScratchAnalytics.track(name, {
		content_id: "math_of_lottery",
		...params,
	})
}

function formatPercent(value, digits = 1) {
	return (value * 100).toFixed(digits) + "%"
}

function setupOutboundMeasurement() {
	document.addEventListener("click", (event) => {
		const link = event.target.closest("[data-math-to-simulator]")
		if (!link) return
		trackMathEvent("math_to_simulator", { lesson: link.dataset.mathToSimulator })
	})
}

function renderExpectedValue() {
	const payout = document.getElementById("evPayoutValue")
	const net = document.getElementById("evNetValue")
	const rtp = document.getElementById("evRtpValue")
	const status = document.getElementById("evStatus")
	if (payout) payout.textContent = "$" + mathExpectedPayout.toFixed(2)
	if (net) net.textContent = "−$" + Math.abs(mathExpectedNet).toFixed(2)
	if (rtp) rtp.textContent = formatPercent(mathRtp, 1)
	if (status) status.textContent = "The expected payout fills " + formatPercent(mathRtp, 1) + " of the $5 cost line."
}

function replayExpectedValue() {
	const bar = document.getElementById("evPayoutBar")
	if (!bar) return
	bar.style.transform = "scaleX(" + mathRtp + ")"
	if (motionEnabled() && typeof bar.animate === "function") {
		bar.animate(
			[
				{ transform: "scaleX(0)" },
				{ transform: "scaleX(" + mathRtp + ")" },
			],
			{ duration: 650, easing: "cubic-bezier(.2,.8,.2,1)" }
		)
	}
	trackMathEvent("math_lesson_run", { lesson: "expected_value" })
}

function chartPoints(values, theoretical) {
	const width = 640
	const height = 240
	const left = 36
	const right = 620
	const top = 18
	const bottom = 218
	const maxValue = Math.max(theoretical * 1.7, ...values, 1)
	const sampled = values.length <= 120
		? values.map((value, index) => ({ value, index }))
		: [...Array(120)].map((_, sampleIndex) => {
			const index = Math.min(values.length - 1, Math.floor((sampleIndex / 119) * (values.length - 1)))
			return { value: values[index], index }
		})
	const point = ({ value, index }) => {
		const x = left + ((values.length === 1 ? 0 : index / (values.length - 1)) * (right - left))
		const y = bottom - (Math.min(value, maxValue) / maxValue) * (bottom - top)
		return { x, y }
	}
	return {
		path: sampled.map((item, index) => {
			const p = point(item)
			return (index === 0 ? "M" : "L") + " " + p.x.toFixed(1) + " " + p.y.toFixed(1)
		}).join(" "),
		theoreticalY: bottom - (theoretical / maxValue) * (bottom - top),
	}
}

function runLargeNumbers(trials, shouldTrack = true) {
	const payouts = LotteryMathCore.simulatePayouts(mathOutcomes, trials, 2755)
	const runningPayout = LotteryMathCore.runningMean(payouts)
	const runningRtp = runningPayout.map((value) => value / mathModel.ticketCost)
	const finalRtp = runningRtp[runningRtp.length - 1]
	const chart = chartPoints(runningRtp, mathRtp)
	const path = document.getElementById("observedReturnPath")
	const reference = document.getElementById("theoreticalReturnLine")
	const status = document.getElementById("largeNumbersStatus")

	if (path) {
		path.setAttribute("d", chart.path)
		if (motionEnabled() && typeof path.getTotalLength === "function" && typeof path.animate === "function") {
			const length = path.getTotalLength()
			path.animate(
				[
					{ strokeDasharray: String(length), strokeDashoffset: String(length) },
					{ strokeDasharray: String(length), strokeDashoffset: "0" },
				],
				{ duration: Math.min(950, 450 + Math.log10(trials) * 120), easing: "ease-out" }
			)
		}
	}
	if (reference) {
		reference.setAttribute("y1", chart.theoreticalY.toFixed(1))
		reference.setAttribute("y2", chart.theoreticalY.toFixed(1))
	}
	if (status) {
		const gap = (finalRtp - mathRtp) * 100
		const direction = gap >= 0 ? "above" : "below"
		status.textContent =
			trials.toLocaleString("en-US") +
			" reproducible tickets finished at " +
			formatPercent(finalRtp, 1) +
			" observed RTP, " +
			Math.abs(gap).toFixed(1) +
			" percentage points " +
			direction +
			" the 64.6% theoretical RTP. Each button extends the same reproducible teaching sequence."
	}

	document.querySelectorAll(".math-trial-btn").forEach((button) => {
		const selected = Number(button.dataset.trials) === trials
		button.setAttribute("aria-pressed", String(selected))
	})

	if (shouldTrack) {
		trackMathEvent("math_lesson_run", {
			lesson: "law_of_large_numbers",
			trials,
			observed_rtp_percent: Number((finalRtp * 100).toFixed(2)),
		})
	}
}

function renderIndependence(losses, shouldTrack = true) {
	const sequence = document.getElementById("independenceSequence")
	const nextChance = document.getElementById("nextPrizeChance")
	const streakLabel = document.getElementById("streakProbabilityLabel")
	const streakValue = document.getElementById("streakProbability")
	const status = document.getElementById("independenceStatus")
	const lossProbability = 1 - anyPrizeProbability
	const streakProbability = Math.pow(lossProbability, losses)

	if (sequence) {
		sequence.replaceChildren()
		for (let i = 0; i < losses; i += 1) {
			const dot = document.createElement("span")
			dot.className = "math-trial-dot is-loss"
			dot.setAttribute("aria-hidden", "true")
			sequence.appendChild(dot)
		}
		const next = document.createElement("span")
		next.className = "math-trial-dot is-next"
		next.setAttribute("aria-hidden", "true")
		sequence.appendChild(next)

		if (motionEnabled()) {
			;[...sequence.children].forEach((dot, index) => {
				dot.animate(
					[
						{ opacity: 0, transform: "scale(.7)" },
						{ opacity: 1, transform: "scale(1)" },
					],
					{ duration: 220, delay: Math.min(index * 35, 280), fill: "both", easing: "ease-out" }
				)
			})
		}
	}

	if (nextChance) nextChance.textContent = formatPercent(anyPrizeProbability, 2)
	if (streakLabel) {
		streakLabel.textContent = losses === 0
			? "Chance before any losses"
			: "Chance of " + losses + " losses from the start"
	}
	if (streakValue) streakValue.textContent = losses === 0 ? "100.00%" : formatPercent(streakProbability, 2)
	if (status) {
		status.textContent =
			"After " +
			losses +
			(losses === 1 ? " simulated loss" : " simulated losses") +
			", the next independent draw is still " +
			formatPercent(anyPrizeProbability, 2) +
			" for any prize."
	}

	document.querySelectorAll(".math-streak-btn").forEach((button) => {
		button.setAttribute("aria-pressed", String(Number(button.dataset.losses) === losses))
	})

	if (shouldTrack) {
		trackMathEvent("math_lesson_run", {
			lesson: "independent_trials",
			completed_losses: losses,
		})
	}
}

function initMathPage() {
	setupOutboundMeasurement()
	renderExpectedValue()

	const replay = document.getElementById("replayEvMotion")
	if (replay) replay.addEventListener("click", replayExpectedValue)

	document.querySelectorAll(".math-trial-btn").forEach((button) => {
		button.addEventListener("click", () => runLargeNumbers(Number(button.dataset.trials)))
	})
	document.querySelectorAll(".math-streak-btn").forEach((button) => {
		button.addEventListener("click", () => renderIndependence(Number(button.dataset.losses)))
	})

	runLargeNumbers(100, false)
	renderIndependence(5, false)

	trackMathEvent("math_page_view", {
		model: mathModel.id,
		expected_payout: Number(mathExpectedPayout.toFixed(4)),
		rtp_percent: Number((mathRtp * 100).toFixed(2)),
		std_dev: Number(mathStdDev.toFixed(2)),
	})
}

document.addEventListener("DOMContentLoaded", initMathPage)
