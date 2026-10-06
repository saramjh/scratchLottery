/* ============================================================
   전역 유틸 — 트래킹, 토스트, 사운드/진동
   ============================================================ */
let currencySymbol = "$"
const winning_message = "Congratulations!"
const no_luck = "No luck!"
const lottery_logs = "Lottery Logs"

function trackEvent(name, params = {}) {
	ScratchAnalytics.track(name, params)
}

let growthToolStarted = false

function currentGrowthPreset() {
	return document.getElementById("lotteryPreset")?.value || "unknown"
}

function trackToolStarted(mode) {
	// Activation is session-level: the first meaningful interaction separates
	// passive landing visits from visitors who actually use the simulator.
	if (growthToolStarted) return
	growthToolStarted = true
	trackEvent("tool_started", {
		mode,
		preset_name: currentGrowthPreset(),
	})
}

function trackValueCompleted(mode, params = {}) {
	trackEvent("value_completed", {
		mode,
		preset_name: currentGrowthPreset(),
		...params,
	})
}

/* 브라우저 기본 alert() 대신 사이트 톤에 맞춘 알림을 쓴다 — 이 함수 하나로 전부 통일 */
let toastHideTimer = null
function showToast(message) {
	const toast = document.getElementById("appToast")
	if (!toast) return
	toast.textContent = message
	toast.hidden = false
	requestAnimationFrame(() => toast.classList.add("is-visible"))
	clearTimeout(toastHideTimer)
	toastHideTimer = setTimeout(() => {
		toast.classList.remove("is-visible")
		setTimeout(() => {
			toast.hidden = true
		}, 200)
	}, 2600)
}

/* 사운드/진동 연출 — 외부 음원 파일 없이 Web Audio API로 즉석 합성. 결과(당첨/낙첨)에는 영향을 주지 않는 순수 연출. */
const SOUND_PREF_KEY = "scratchLotterySoundOn"
let soundOn = (() => {
	try {
		return localStorage.getItem(SOUND_PREF_KEY) !== "off"
	} catch (e) {
		return true
	}
})()

let audioCtx = null
function getAudioCtx() {
	if (!audioCtx) {
		const AudioCtx = window.AudioContext || window.webkitAudioContext
		if (!AudioCtx) return null
		audioCtx = new AudioCtx()
	}
	if (audioCtx.state === "suspended") audioCtx.resume()
	return audioCtx
}

function playScratchTick() {
	if (!soundOn) return
	const ctx = getAudioCtx()
	if (!ctx) return
	const bufferSize = Math.floor(ctx.sampleRate * 0.03)
	const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
	const data = buffer.getChannelData(0)
	for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3
	const noise = ctx.createBufferSource()
	noise.buffer = buffer
	const gain = ctx.createGain()
	gain.gain.setValueAtTime(0.15, ctx.currentTime)
	gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.03)
	noise.connect(gain).connect(ctx.destination)
	noise.start()
}

function playRevealChime(isWin) {
	if (!soundOn) return
	const ctx = getAudioCtx()
	if (!ctx) return
	const now = ctx.currentTime

	if (isWin) {
		// 코인/잭팟 느낌: 사인파 대신 triangle(더 밝은 음색)로 도미솔도(한 옥타브 위) 아르페지오를
		// 빠르게 쌓고, 마지막 음에 한 옥타브+5도 위 배음을 살짝 얹어서 반짝이는 느낌을 더한다
		const notes = [523.25, 659.25, 783.99, 1046.5] // C5-E5-G5-C6
		notes.forEach((freq, i) => {
			const t = now + i * 0.075
			const osc = ctx.createOscillator()
			const gain = ctx.createGain()
			osc.type = "triangle"
			osc.frequency.value = freq
			gain.gain.setValueAtTime(0.0001, t)
			gain.gain.linearRampToValueAtTime(0.22, t + 0.015)
			gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28)
			osc.connect(gain).connect(ctx.destination)
			osc.start(t)
			osc.stop(t + 0.3)

			if (i === notes.length - 1) {
				const sparkle = ctx.createOscillator()
				const sparkleGain = ctx.createGain()
				sparkle.type = "triangle"
				sparkle.frequency.value = freq * 3 // 한 옥타브+5도 위 배음
				sparkleGain.gain.setValueAtTime(0.0001, t)
				sparkleGain.gain.linearRampToValueAtTime(0.08, t + 0.015)
				sparkleGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4)
				sparkle.connect(sparkleGain).connect(ctx.destination)
				sparkle.start(t)
				sparkle.stop(t + 0.42)
			}
		})
		return
	}

	const notes = [329.63, 261.63] // 낙첨: 짧은 하강 2음
	notes.forEach((freq, i) => {
		const osc = ctx.createOscillator()
		const gain = ctx.createGain()
		osc.type = "sine"
		osc.frequency.value = freq
		gain.gain.setValueAtTime(0.0001, now + i * 0.09)
		gain.gain.linearRampToValueAtTime(0.2, now + i * 0.09 + 0.02)
		gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.25)
		osc.connect(gain).connect(ctx.destination)
		osc.start(now + i * 0.09)
		osc.stop(now + i * 0.09 + 0.3)
	})
}

function vibrate(pattern) {
	if (navigator.vibrate) {
		try {
			navigator.vibrate(pattern)
		} catch (e) {
			// 무시 — 지원 안 하는 브라우저
		}
	}
}

function toggleSound() {
	soundOn = !soundOn
	try {
		localStorage.setItem(SOUND_PREF_KEY, soundOn ? "on" : "off")
	} catch (e) {
		// 저장 실패 무시
	}
	const btn = document.getElementById("soundToggle")
	if (btn) btn.textContent = soundOn ? "Sound: On" : "Sound: Off"
}

// script.js는 body 끝에서 로드되므로 DOMContentLoaded를 기다릴 필요 없이 바로 초기화한다
const $soundToggle = document.getElementById("soundToggle")
if ($soundToggle) {
	$soundToggle.textContent = soundOn ? "Sound: On" : "Sound: Off"
	$soundToggle.addEventListener("click", toggleSound)
}

const motionPreference = typeof window.matchMedia === "function" ? window.matchMedia("(prefers-reduced-motion: reduce)") : null
const MOTION_EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)"
const MOTION_EASE_STANDARD = "cubic-bezier(0.2, 0.8, 0.2, 1)"

function motionEnabled() {
	return !(motionPreference && motionPreference.matches)
}

function runMotion(el, keyframes, options = {}) {
	if (!el || !motionEnabled() || typeof el.animate !== "function") return null
	return el.animate(keyframes, {
		duration: 220,
		easing: MOTION_EASE_OUT,
		fill: "none",
		...options,
	})
}

function setMetricText(el, nextText) {
	if (!el) return
	const changed = el.textContent !== nextText
	el.textContent = nextText
	if (changed) {
		runMotion(
			el,
			[
				{ opacity: 0.35, transform: "translateY(4px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ duration: 190 }
		)
	}
}

function animateTicketRefresh() {
	const ticketArt = document.querySelector(".ticket-art")
	const grid = document.getElementById("yourNumbersGrid")
	runMotion(
		ticketArt,
		[
			{ opacity: 0.72, transform: "translateY(8px) scale(0.994)" },
			{ opacity: 1, transform: "translateY(0) scale(1)" },
		],
		{ duration: 280 }
	)
	if (!grid || !motionEnabled()) return
	grid.querySelectorAll(".play-cell, .symbol-game").forEach((cell, index) => {
		runMotion(
			cell,
			[
				{ opacity: 0.25, transform: "translateY(5px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ duration: 180, delay: Math.min(index, 14) * 12 }
		)
	})
}

function animatePresetRefresh() {
	for (const el of [document.getElementById("oddsCard"), document.getElementById("resultPanel")]) {
		runMotion(
			el,
			[
				{ opacity: 0.55, transform: "translateY(5px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ duration: 230 }
		)
	}
}

function animateSimulationOutput() {
	const result = document.getElementById("fastSimResult")
	const chart = document.getElementById("fastSimChart")
	runMotion(result, [{ opacity: 0, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 240 })
	runMotion(chart, [{ opacity: 0.45, transform: "translateY(7px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 300 })

	const path = chart?.querySelector(".lottery-log-line")
	if (path && motionEnabled() && typeof path.getTotalLength === "function") {
		const length = path.getTotalLength()
		path.style.strokeDasharray = String(length)
		path.style.strokeDashoffset = String(length)
		const animation = path.animate(
			[{ strokeDashoffset: length }, { strokeDashoffset: 0 }],
			{ duration: 420, easing: MOTION_EASE_STANDARD, fill: "forwards" }
		)
		animation.addEventListener("finish", () => {
			path.style.strokeDasharray = ""
			path.style.strokeDashoffset = ""
		})
	}

	chart?.querySelectorAll(".lottery-log-point").forEach((point, index) => {
		runMotion(point, [{ opacity: 0 }, { opacity: 1 }], {
			duration: 150,
			delay: Math.min(index, 24) * 8 + 80,
		})
	})
}

function animateSelectedDetail(el) {
	runMotion(el, [{ opacity: 0.45, transform: "translateY(4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 180 })
}

function setDisclosureOpen(root, open, { focusTrigger = false } = {}) {
	if (!root) return
	const trigger = root.querySelector(":scope > .disclosure-trigger")
	if (!trigger) return
	const panelId = trigger.getAttribute("aria-controls")
	const panel = panelId ? document.getElementById(panelId) : null
	if (!panel) return

	panel.getAnimations?.().forEach((animation) => animation.cancel())
	trigger.setAttribute("aria-expanded", String(open))
	root.classList.toggle("is-open", open)

	if (open) {
		panel.hidden = false
		runMotion(
			panel,
			[
				{ opacity: 0, transform: "translateY(-4px)" },
				{ opacity: 1, transform: "translateY(0)" },
			],
			{ duration: 180 }
		)
	} else {
		const animation = runMotion(
			panel,
			[
				{ opacity: 1, transform: "translateY(0)" },
				{ opacity: 0, transform: "translateY(-4px)" },
			],
			{ duration: 140 }
		)
		if (animation) {
			animation.addEventListener("finish", () => {
				if (trigger.getAttribute("aria-expanded") === "false") panel.hidden = true
			}, { once: true })
		} else {
			panel.hidden = true
		}
	}
	if (focusTrigger) trigger.focus()
}

function initDisclosures() {
	document.querySelectorAll("[data-disclosure]").forEach((root) => {
		const trigger = root.querySelector(":scope > .disclosure-trigger")
		if (!trigger) return
		trigger.addEventListener("click", () => {
			setDisclosureOpen(root, trigger.getAttribute("aria-expanded") !== "true")
		})
		trigger.addEventListener("keydown", (event) => {
			if (event.key !== "Escape" || trigger.getAttribute("aria-expanded") !== "true") return
			event.preventDefault()
			setDisclosureOpen(root, false, { focusTrigger: true })
		})
	})
}

function initCustomSelect(root) {
	const stateId = root?.dataset.customSelect
	const state = stateId ? document.getElementById(stateId) : null
	const trigger = root?.querySelector(".custom-select-trigger")
	const menu = root?.querySelector(".custom-select-menu")
	const valueEl = root?.querySelector("#taxCountryValue")
	const options = menu ? Array.from(menu.querySelectorAll(".custom-select-option")) : []
	if (!root || !state || !trigger || !menu || !valueEl || !options.length) return

	const selectedIndex = () => Math.max(0, options.findIndex((option) => option.getAttribute("aria-selected") === "true"))

	const close = ({ focusTrigger = false } = {}) => {
		root.classList.remove("is-open")
		trigger.setAttribute("aria-expanded", "false")
		menu.hidden = true
		if (focusTrigger) trigger.focus()
	}

	const open = (focusIndex = selectedIndex()) => {
		root.classList.add("is-open")
		trigger.setAttribute("aria-expanded", "true")
		menu.hidden = false
		runMotion(menu, [{ opacity: 0, transform: "translateY(-4px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 150 })
		requestAnimationFrame(() => options[Math.max(0, Math.min(options.length - 1, focusIndex))]?.focus())
	}

	const choose = (option) => {
		if (!option) return
		options.forEach((candidate) => candidate.setAttribute("aria-selected", String(candidate === option)))
		state.value = option.dataset.value || ""
		valueEl.textContent = option.textContent.trim()
		close({ focusTrigger: true })
		state.dispatchEvent(new Event("change", { bubbles: true }))
	}

	trigger.addEventListener("click", () => {
		if (trigger.getAttribute("aria-expanded") === "true") close()
		else open()
	})
	trigger.addEventListener("keydown", (event) => {
		if (!["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) return
		event.preventDefault()
		open(event.key === "ArrowUp" ? options.length - 1 : selectedIndex())
	})
	options.forEach((option, index) => {
		option.addEventListener("click", () => choose(option))
		option.addEventListener("keydown", (event) => {
			if (event.key === "Escape") {
				event.preventDefault()
				close({ focusTrigger: true })
				return
			}
			if (event.key === "Enter" || event.key === " ") {
				event.preventDefault()
				choose(option)
				return
			}
			let next = null
			if (event.key === "ArrowDown") next = (index + 1) % options.length
			if (event.key === "ArrowUp") next = (index - 1 + options.length) % options.length
			if (event.key === "Home") next = 0
			if (event.key === "End") next = options.length - 1
			if (next !== null) {
				event.preventDefault()
				options[next].focus()
			}
		})
	})
	document.addEventListener("pointerdown", (event) => {
		if (!root.contains(event.target)) close()
	})
}

function parseNumericField(el, { min = -Infinity, max = Infinity, integer = false } = {}) {
	if (!el) return null
	const raw = String(el.value || "").replace(/,/g, "").trim()
	if (!raw) return null
	const value = Number(raw)
	if (!Number.isFinite(value)) return null
	const normalized = integer ? Math.trunc(value) : value
	if (normalized < min || normalized > max) return null
	return normalized
}

initDisclosures()
document.querySelectorAll("[data-custom-select]").forEach(initCustomSelect)

// 당첨 시 짧은 컨페티 연출 — 이미 정해진 결과를 확인해주는 순수 시각 효과
function triggerWinConfetti() {
	if (typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
	const grid = document.getElementById("yourNumbersGrid")
	if (!grid) return
	const colors = ["#ffd700", "#ff6b6b", "#4ade80", "#60a5fa", "#fff"]
	for (let i = 0; i < 24; i++) {
		const piece = document.createElement("div")
		piece.className = "confetti-piece"
		piece.style.left = `${Math.random() * 100}%`
		piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)]
		piece.style.animationDelay = `${Math.random() * 0.2}s`
		piece.style.setProperty("--drift", `${(Math.random() - 0.5) * 60}px`)
		grid.appendChild(piece)
		piece.addEventListener("animationend", () => piece.remove())
	}
}

// 모달 요소
// 모달 관련 요소 선택
const modal = document.getElementById("jackpotModal")
const closeModal = document.querySelector(".modal-close-btn")
const modalBadge = document.getElementById("modalBadge")
const jackpotMessage = document.getElementById("jackpotMessage")
const prizeVTScroll = document.getElementById("prizeVTScroll")
let modalReturnFocus = null
let modalCloseTimer = null

function modalFocusableElements() {
	if (!modal) return []
	return Array.from(
		modal.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])')
	).filter((el) => !el.hidden)
}

/* ============================================================
   상태 영속화 (localStorage)
   ============================================================ */
/* 누적 기록 영속화 (localStorage) — 재방문 시 이전 장부를 복원한다.
   STATE_VERSION: 프리셋 상금표를 재보정(RTP 버그 수정)할 때마다 올린다 — 예전 버전에서 쌓인
   비현실적인 누적 총액(예: 억 단위 당첨금)이 지금 코드로 고쳐도 그대로 남아있던 문제가 있었다.
   버전이 다르면 "그 시절 숫자"는 지금 확률/상금표와 앞뒤가 안 맞으므로 누적치만 정직하게 리셋한다. */
const STORAGE_KEY = "scratchLotteryState"
const STATE_VERSION = 3

function loadState() {
	try {
		const raw = localStorage.getItem(STORAGE_KEY)
		if (!raw) return null
		const parsed = JSON.parse(raw)
		if (parsed.version !== STATE_VERSION) return null // 예전 버전 데이터는 신뢰하지 않고 새로 시작
		return parsed
	} catch (e) {
		return null // 프라이빗 브라우징 등으로 접근 불가하면 새 세션으로 시작
	}
}

function saveState() {
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: STATE_VERSION, totalCost, totalPrize, totalAttempts, lotteryRecord, bestWinAmount, bestWinLabel }))
	} catch (e) {
		// storage 저장 실패는 무시 — 메모리 상 상태로는 정상 동작
	}
}

const savedState = loadState()
let totalCost = savedState?.totalCost ?? 0
let totalPrize = savedState?.totalPrize ?? 0
let totalAttempts = savedState?.totalAttempts ?? 0
let lotteryRecord = Array.isArray(savedState?.lotteryRecord) ? savedState.lotteryRecord : []
let bestWinAmount = savedState?.bestWinAmount ?? 0
let bestWinLabel = savedState?.bestWinLabel ?? ""

if (lotteryRecord.length) {
	prizeVTScroll.innerHTML = `<span>${lotteryRecord[lotteryRecord.length - 1].result}</span>`
}

/* ============================================================
   스크래치 캔버스 — 칸별 은박 렌더링, 드래그/터치 처리
   ============================================================ */
/* 스크래치 티켓: 칸마다 독립된 은박 캔버스를 갖는다 — 하나의 큰 캔버스로 전체를 긁는 방식이 아니라
   실제 즉석복권처럼 "각 플레이 자리마다 따로 긁는" 구조. 결과는 이미 drawLotteryResult가 정했고,
   여기서는 그 결과를 몇 개의 자리로 어떻게 드러낼지만 다룬다. */
let p1 = "0.0000122850123" // user-setting probability

const CELL_ERASE_RADIUS = 13
const CELL_REVEAL_RATIO = 0.55 // 이 비율 이상 지워지면 그 자리는 다 드러난 것으로 간주

function paintCellFoil(ctx, w, h) {
	const coin = ctx.createRadialGradient(w * 0.3, h * 0.3, 2, w / 2, h / 2, Math.max(w, h))
	coin.addColorStop(0, "#f2f2f2")
	coin.addColorStop(0.5, "#c7c7c7")
	coin.addColorStop(1, "#8f8f8f")
	ctx.fillStyle = coin
	ctx.beginPath()
	ctx.roundRect(0, 0, w, h, 8)
	ctx.fill()
	ctx.strokeStyle = "#7a7a7a"
	ctx.lineWidth = 1
	ctx.stroke()

	ctx.font = `700 ${Math.round(Math.min(w, h) * 0.55)}px "IBM Plex Sans", sans-serif`
	ctx.fillStyle = "rgba(180, 140, 40, 0.5)"
	ctx.textAlign = "center"
	ctx.textBaseline = "middle"
	ctx.fillText("$", w / 2, h / 2)
}

// 캔버스 하나(하나의 플레이 자리)에 긁기 상호작용을 붙인다. 긁힌 영역이 충분해지면 onRevealed를 호출한다.
/* 여러 칸에 걸친 연속 드래그 지원: 마우스는 인접 캔버스로 넘어가면 그 캔버스의 mousemove가 원래
   따로 뜨지만("drawing이 이 칸에서 시작됐는가"만 보면 안 됨), 터치는 반대로 처음 닿은 캔버스에만
   이벤트가 계속 잡힌다(터치 API 특성). 그래서 캔버스별 이벤트에 기대지 않고, 문서 레벨에서 포인터가
   "지금 실제로 어디 위에 있는지"(elementFromPoint)를 계속 찾아서 그 칸을 긁는다 — 실제 손톱으로
   긁듯 칸 경계를 신경 안 써도 되게.
   또한 mousedown에서 preventDefault를 해야 드래그 중 주변 텍스트가 같이 선택되는 것을 막는다. */
const cellScratchRegistry = new Map() // canvas element -> { erase(clientX, clientY), revealNow() }
let scratchPointerActive = false

function scratchAtClientPoint(clientX, clientY) {
	const el = document.elementFromPoint(clientX, clientY)
	const canvas = el && el.closest ? el.closest(".play-scratch-canvas") : null
	if (canvas && cellScratchRegistry.has(canvas)) {
		cellScratchRegistry.get(canvas).erase(clientX, clientY)
	}
}

document.addEventListener("mousedown", (event) => {
	if (!event.target.closest || !event.target.closest(".play-scratch-canvas")) return
	event.preventDefault() // 드래그 중 텍스트가 선택되는 것을 막는다
	trackToolStarted("scratch")
	scratchPointerActive = true
	scratchAtClientPoint(event.clientX, event.clientY)
})
document.addEventListener("mousemove", (event) => {
	if (!scratchPointerActive) return
	scratchAtClientPoint(event.clientX, event.clientY)
})
document.addEventListener("mouseup", () => {
	scratchPointerActive = false
})
document.addEventListener(
	"touchstart",
	(event) => {
		if (!event.target.closest || !event.target.closest(".play-scratch-canvas")) return
		event.preventDefault()
		trackToolStarted("scratch")
		scratchPointerActive = true
		const touch = event.touches[0]
		scratchAtClientPoint(touch.clientX, touch.clientY)
	},
	{ passive: false }
)
document.addEventListener(
	"touchmove",
	(event) => {
		if (!scratchPointerActive) return
		event.preventDefault()
		const touch = event.touches[0]
		scratchAtClientPoint(touch.clientX, touch.clientY)
	},
	{ passive: false }
)
document.addEventListener("touchend", () => {
	scratchPointerActive = false
})

function setupCellScratch(canvas, onRevealed) {
	const dpr = window.devicePixelRatio || 1
	const w = canvas.clientWidth
	const h = canvas.clientHeight
	canvas.width = w * dpr
	canvas.height = h * dpr
	const ctx = canvas.getContext("2d")
	ctx.scale(dpr, dpr)
	paintCellFoil(ctx, w, h)

	let erasedArea = 0
	let done = false
	const totalArea = w * h
	const singleErase = Math.PI * CELL_ERASE_RADIUS * CELL_ERASE_RADIUS * 0.6 // 겹침을 감안한 대략치

	function erase(clientX, clientY) {
		if (done) return
		const rect = canvas.getBoundingClientRect()
		const x = clientX - rect.left
		const y = clientY - rect.top
		ctx.save()
		ctx.globalCompositeOperation = "destination-out"
		ctx.beginPath()
		ctx.arc(x, y, CELL_ERASE_RADIUS, 0, 2 * Math.PI)
		ctx.fill()
		ctx.restore()
		erasedArea += singleErase
		playScratchTick()
		if (erasedArea / totalArea > CELL_REVEAL_RATIO) {
			done = true
			ctx.clearRect(0, 0, w, h)
			cellScratchRegistry.delete(canvas)
			onRevealed()
		}
	}

	function revealNow() {
		if (!done) {
			done = true
			ctx.clearRect(0, 0, w, h)
			cellScratchRegistry.delete(canvas)
			onRevealed()
		}
	}

	cellScratchRegistry.set(canvas, { erase, revealNow })
	return { revealNow }
}

/* 스크래치 커버 만들기 끝 */

/* ============================================================
   티켓 데이터 — 프리셋, 확률 계산, 당첨 판정
   ============================================================ */
let ticketCost = 1000 // 기본 티켓 가격

/* 게임마다 실제로 다른 티켓 포맷을 갖는다 — 프리셋을 바꿔도 항상 같은 "당첨번호 5개 + 15칸" 틀이
   반복되지 않도록: 당첨번호 개수/플레이 자리 수/한 줄에 몇 칸인지/몇 개 맞아야 당첨으로 보여줄지가
   게임별로 다르다. 실제 당첨 확률·등수(drawLotteryResult)는 이 포맷과 무관하게 그대로 정직하다 —
   여기서 정하는 건 오직 "그 결과를 몇 개의 자리로 어떻게 나눠 보여줄지"뿐이다. */
const VERIFIED_TEXAS_2755 = window.VerifiedLotteryModels.texas2755

const LOTTERY_PRESETS = {
	custom: {
		name: "Custom Odds",
		ticketCost: 1000,
		p1: "0.0000122850123",
		currency: "$",
		// 이전 값(최대 10억 상금)은 한 번도 보정된 적이 없었다 — 실제로 RTP 243,842%까지 나오는
		// 버그였다(실측으로 발견됨). 다른 프리셋과 같은 방식으로 하위 등수를 재보정해 ~62%로 맞춤.
		rewards: [1000000, 13000, 5000, 2500, 1500, 1000, 500, 250],
		ticketFormat: { winningCount: 5, playCount: 9, columns: 3, minWinMatches: 2, matchesByRank: { 1: 5, 2: 5, 3: 4, 4: 4, 5: 3, 6: 3, 7: 2, 8: 2 } },
		// 색 테마: 특정 브랜드가 아니라 "사용자가 설정하는 도구"라는 느낌의 중립 회색+은색
		theme: { bg1: "#2a2d33", bg2: "#1b1d21", accent: "#c7ccd1", accentContrast: "#12131a" },
		howTo: "Match any of YOUR NUMBERS to a WINNING NUMBER to win the prize shown for that number.",
	},
	us_scratch5: {
		...VERIFIED_TEXAS_2755,
		// Outcome probabilities and prizes use the shared verified issue model. The scratch grid is this site's
		// simulation interface, not a reproduction of the licensed ticket artwork or official play mechanic.
		ticketFormat: { winningCount: 5, playCount: 15, columns: 5, minWinMatches: 2, matchesByRank: { 1: 5, 2: 5, 3: 4, 4: 4, 5: 3, 6: 3, 7: 2, 8: 2 } },
		theme: { bg1: "#0d2b4d", bg2: "#122238", accent: "#d4a94a", accentContrast: "#191305" },
		howTo: "Simulation interface: match YOUR NUMBERS to a WINNING NUMBER. Outcome probabilities use Texas Lottery Game 2755's printed prize distribution.",
	},
	powerball: {
		name: "Powerball Jackpot Tier",
		ticketCost: 2,
		p1: "0.0000003422", // 1 in 292,201,338
		currency: "$",
		rewards: [300000000, 1, 1, 1, 1, 1, 1, 1],
		// 실제 파워볼의 잘 알려진 공개 형식: 흰 공 5개(1~69) + 빨간 파워볼 1개(1~26).
		// 순서를 섞지 않고 실제 티켓처럼 메인 번호 다음에 보너스 볼을 마지막에 고정 배치한다.
		ticketFormat: {
			winningCount: 6,
			playCount: 6,
			columns: 6,
			minWinMatches: 1,
			matchesByRank: { 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 2, 7: 1, 8: 1 },
			numberPoolMax: 69,
			bonusBall: true,
			bonusPoolMax: 26,
		},
		// 색 테마: 파워볼 하면 떠올리는 진한 레드 계열(실제 게임 자체가 공개된 잭팟 게임이라 톤만 참고)
		theme: { bg1: "#5c1220", bg2: "#3b0c15", accent: "#f2c14e", accentContrast: "#2a0d05" },
		howTo: "Match your 5 main numbers and the red Powerball to the winning numbers to win the prize shown for that number.",
	},
	speetto1000: {
		name: "Speetto 1000",
		ticketCost: 1000,
		p1: "0.00002", // 1 in 5,000,000 (0.00002%)
		currency: "₩",
		rewards: [500000000, 20000000, 10000, 5000, 1000],
		issuedTickets: 5000000,
		officialTiers: [
			{ rewardMoney: 500000000, count: 1 },
			{ rewardMoney: 20000000, count: 5 },
			{ rewardMoney: 10000, count: 27500 },
			{ rewardMoney: 5000, count: 125000 },
			{ rewardMoney: 1000, count: 1500000 },
		],
		evidence: {
			label: "Official Donghaeng Lottery distribution · 5,000,000-ticket issue · published payout 60.0%",
			url: "https://www.dhlottery.co.kr/st/st10Intro",
		},
		// 실제 스피또1000 실물 사진 기준: LUCKY NUMBER(행운숫자)와 MY NUMBER(나의숫자)가
		// 세로로 짝을 이룬 열이 나란히 배치된 형식 — columns=5, 2행(위/아래) 구조로 재현.
		ticketFormat: { winningCount: 5, playCount: 10, columns: 5, minWinMatches: 2, matchesByRank: { 1: 5, 2: 5, 3: 4, 4: 4, 5: 3, 6: 3, 7: 2, 8: 2 }, pairedRows: true },
		// 색 테마: 실물 사진의 진보라 + 골드 톤을 그대로 반영
		theme: { bg1: "#4a1259", bg2: "#280a33", accent: "#f4c542", accentContrast: "#2c0a35" },
		howTo: "Match the LUCKY NUMBER to the MY NUMBER below it in the same column to win the prize shown for that column.",
	},
	speetto2000: {
		name: "Speetto 2000",
		ticketCost: 2000,
		p1: "0.00002", // 1 in 5,000,000 (0.00002%)
		currency: "₩",
		rewards: [1000000000, 100000000, 10000000, 20000, 4000, 2000],
		issuedTickets: 5000000,
		officialTiers: [
			{ rewardMoney: 1000000000, count: 1 },
			{ rewardMoney: 100000000, count: 3 },
			{ rewardMoney: 10000000, count: 25 },
			{ rewardMoney: 20000, count: 13750 },
			{ rewardMoney: 4000, count: 350000 },
			{ rewardMoney: 2000, count: 1400000 },
		],
		evidence: {
			label: "Official Donghaeng Lottery distribution · 5,000,000-ticket issue · published payout 60.3%",
			url: "https://www.dhlottery.co.kr/st/st20Intro",
		},
		// 실제 스피또2000 실물 사진 기준: "게임별 행운그림 2개가 모두 일치하면 당첨" — 6개의
		// 게임칸, 각 칸에 심볼 2개(각각 따로 긁음). 사진 속 표시 상금(장식용, 실제 지급액은
		// jackpotLevel.rewardMoney)을 그대로 사용. rank1만 실제로 사진의 "일십억원" 칸과 일치.
		ticketFormat: {
			symbolMatch: true,
			gameCount: 6,
			gameFaceValues: [10000000, 100000000, 20000, 4000, 1000000000, 2000],
			rankToGameIndex: { 1: 4, 2: 1, 3: 0, 4: 2, 5: 3, 6: 5 },
			playCount: 12,
			columns: 6,
		},
		// 색 테마: 실물 사진의 하늘색/시안 계열(캐릭터 일러스트는 재현하지 않음 — 저작물 아님, 배색만 참고)
		theme: { bg1: "#0d4f66", bg2: "#082e3d", accent: "#f4c542", accentContrast: "#082e3d" },
		howTo: "Each game has two hidden symbols. Scratch both — if they match, you win the prize shown for that game.",
	},
	lucky_fun: {
		name: "Lucky High-Win (Demo)",
		ticketCost: 10,
		p1: "20.0", // 20%
		currency: "$",
		// 이전 값도 보정된 적이 없어 RTP 10,528%였다. "고배당 데모"라는 컨셉은 살리되
		// (일부러 RTP>100%로 설계 — 실제 복권과 다르다는 걸 명확히 함) 143%로 재보정.
		rewards: [60, 30, 15, 10, 8, 6, 5, 5],
		// 데모용 — 당첨번호 3개, 자리 6개로 가볍고 빠르게 끝나는 포맷
		ticketFormat: { winningCount: 3, playCount: 6, columns: 3, minWinMatches: 1, matchesByRank: { 1: 3, 2: 3, 3: 2, 4: 2, 5: 2, 6: 1, 7: 1, 8: 1 } },
		// 색 테마: 실제 게임이 아닌 데모임을 색으로도 드러내는 화사한 보라/핑크
		theme: { bg1: "#3a1155", bg2: "#25073a", accent: "#e879f9", accentContrast: "#210633" },
		howTo: "Match any of YOUR NUMBERS to a WINNING NUMBER to win the prize shown for that number.",
	},
}
const MODELED_PRIZE_TEMPLATE = [
	{ rank: 1, rewardMoney: 100000, threshold: 0.000004 },
	{ rank: 2, rewardMoney: 10000, threshold: 0.007 },
	{ rank: 3, rewardMoney: 1000, threshold: 0.021 },
	{ rank: 4, rewardMoney: 250, threshold: 0.042 },
	{ rank: 5, rewardMoney: 100, threshold: 0.078 },
	{ rank: 6, rewardMoney: 50, threshold: 0.137 },
	{ rank: 7, rewardMoney: 20, threshold: 0.232 },
	{ rank: 8, rewardMoney: 5, threshold: 0.384 },
]

function calculatePrizeProbabilities(P1, rewardsArray) {
	const remainingProbability = 1 - parseFloat(P1) // 나머지 확률
	const fibonacci = [1, 2, 3, 5, 8, 13, 21, 34] // 1단계를 제외한 피보나치수열
	const T = fibonacci.reduce((sum, f) => sum + f, 0) // 피보나치 수열의 총합

	const probabilities = fibonacci.map((f, index) => {
		if (index === 0) {
			return P1
		} else {
			return P1 + (remainingProbability * f) / T
		}
	})

	// 확률 및 상금 적용
	for (let i = 0; i < prizeThresholds.length; i++) {
		prizeThresholds[i].threshold = probabilities[i]
		if (rewardsArray && rewardsArray[i] !== undefined) {
			prizeThresholds[i].rewardMoney = rewardsArray[i]
			if (jackpot[i]) jackpot[i].rewardMoney = rewardsArray[i]
		}
	}
}

// 등수별 확률계산
let prizeThresholds = MODELED_PRIZE_TEMPLATE.map((tier) => ({ ...tier }))

function configureModeledPrizeModel(preset, topPrizeProbability = p1) {
	prizeThresholds = MODELED_PRIZE_TEMPLATE.map((tier) => ({ ...tier }))
	calculatePrizeProbabilities(topPrizeProbability, preset ? preset.rewards : undefined)
}

function configurePrizeModel(preset, topPrizeProbability = p1) {
	if (preset && preset.officialTiers && preset.issuedTickets) {
		let cumulativeProbability = 0
		prizeThresholds = preset.officialTiers.map((tier, index) => {
			cumulativeProbability += tier.count / preset.issuedTickets
			if (jackpot[index]) jackpot[index].rewardMoney = tier.rewardMoney
			return { rank: index + 1, rewardMoney: tier.rewardMoney, threshold: cumulativeProbability }
		})
		return
	}

	configureModeledPrizeModel(preset, topPrizeProbability)
}

// prizeThresholds는 오름차순 누적확률 구간(CDF)이다: [0, threshold[0])은 1등, [threshold[0], threshold[1])은 2등, ...
// 이렇게 하면 한 장이 여러 등수에 동시 당첨되거나 고액 당첨이 저액 당첨에 덮어써지는 일이 없다.
function drawLotteryResult(prizeThresholds) {
	const draw = Math.random()
	for (let i = 0; i < prizeThresholds.length; i++) {
		if (draw < prizeThresholds[i].threshold) {
			const tier = prizeThresholds[i]
			return { rank: tier.rank, rewardMoney: tier.rewardMoney, num: jackpot[i].num }
		}
	}
	return null
}

// 당첨결과를 담을 jackopt
let jackpot = [
	{ rank: 1, num: 10, rewardMoney: 100000 },
	{ rank: 2, num: 8, rewardMoney: 10000 },
	{ rank: 3, num: 7, rewardMoney: 1000 },
	{ rank: 4, num: 6, rewardMoney: 250 },
	{ rank: 5, num: 5, rewardMoney: 100 },
	{ rank: 6, num: 4, rewardMoney: 50 },
	{ rank: 7, num: 3, rewardMoney: 20 },
	{ rank: 8, num: 2, rewardMoney: 5 },
]

/* ============================================================
   티켓 빌드 & 렌더 — 포맷, 셀, 화면 반영
   ============================================================ */
/* 실제 즉석복권 형식: WINNING NUMBERS(인쇄되어 그대로 보임) vs 여러 개의 플레이 자리(각각 숫자+상금을
   따로 긁어야 보임). 당첨/등수는 이미 drawLotteryResult가 정직하게 결정했다 — 여기서는 그 결과를
   "몇 개 자리가 당첨번호와 맞았는지"로 나눠 보여줄 뿐, 자리 배치가 확률에 영향을 주지 않는다.
   당첨번호 개수/자리 수/열 개수/커트라인은 선택한 게임(LOTTERY_PRESETS[key].ticketFormat)마다 다르다. */
const NUMBER_POOL_MAX = 49
const DEFAULT_TICKET_FORMAT = { winningCount: 5, playCount: 15, columns: 5, minWinMatches: 2, matchesByRank: { 1: 5, 2: 5, 3: 4, 4: 4, 5: 3, 6: 3, 7: 2, 8: 2 } }
let currentTicketFormat = DEFAULT_TICKET_FORMAT

function pickUniqueNumbers(count, excludeSet, poolMax) {
	const excluded = excludeSet || new Set()
	const max = poolMax || NUMBER_POOL_MAX
	const picked = new Set()
	while (picked.size < count) {
		const n = 1 + Math.floor(Math.random() * max)
		if (!excluded.has(n) && !picked.has(n)) picked.add(n)
	}
	return [...picked]
}

function shuffleInPlace(arr) {
	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}
	return arr
}

// 티켓 상태: 확률 엔진(drawLotteryResult, 손대지 않음) → 티켓 데이터 → 렌더러 → 스크래치 레이어 → 원장 순서.
let currentTicket = null // { winningNumbers, plays: [{number, prize, isWinner, revealed}], jackpotLevel }
let revealedPlayCount = 0
let ticketSettled = true // 앱 로드 직후엔 "이미 끝난 티켓" 취급 — startNewTicket()이 곧바로 새로 채운다

function computeMatchCount(jackpotLevel, format) {
	let matches
	if (jackpotLevel) {
		matches = format.matchesByRank[jackpotLevel.rank] || format.minWinMatches
	} else {
		// 실제 카드처럼 우연히 커트라인보다 하나 적게 맞는 "아쉬운 낙첨"이 나올 수 있게 한다
		matches = Math.random() < 0.35 ? Math.max(0, format.minWinMatches - 1) : 0
	}
	return Math.min(matches, format.winningCount, format.playCount)
}

// 스피또2000의 "심볼 매칭" 게임칸에 쓰는 6가지 도형 — 이모지 대신 CSS 도형(clip-path)으로 그린다
const SYMBOL_SHAPES = ["star", "circle", "diamond", "triangle", "hexagon", "square"]

function buildTicket(jackpotLevel, format) {
	const flavorPrizes = prizeThresholds.map((t) => t.rewardMoney)

	// 스피또2000처럼 "게임별 심볼 2개가 모두 일치하면 당첨"인 형식: 게임칸마다 독립된 심볼 2개를
	// 각각 긁는다. 확률 엔진이 이미 정한 단 하나의 진짜 당첨 등수만 실제로 심볼이 일치하고,
	// 나머지 게임칸은 항상 서로 다른 심볼(가짜로 일치시키는 "낚시성" 연출은 하지 않는다).
	// 이 형식은 matchesByRank 같은 "몇 자리 맞았는지" 개념이 없으므로 computeMatchCount를 쓰지 않는다.
	if (format.symbolMatch) {
		const winningGameIndex = jackpotLevel ? format.rankToGameIndex[jackpotLevel.rank] ?? format.consolationGameIndex : null
		const plays = []
		format.gameFaceValues.forEach((faceValue, gameIndex) => {
			const isWinner = gameIndex === winningGameIndex
			const prize = isWinner ? jackpotLevel.rewardMoney : faceValue
			let symbolA = SYMBOL_SHAPES[Math.floor(Math.random() * SYMBOL_SHAPES.length)]
			let symbolB = symbolA
			if (!isWinner) {
				do {
					symbolB = SYMBOL_SHAPES[Math.floor(Math.random() * SYMBOL_SHAPES.length)]
				} while (symbolB === symbolA)
			}
			plays.push({ symbol: symbolA, prize, isWinner, gameIndex, revealed: false })
			plays.push({ symbol: symbolB, prize, isWinner, gameIndex, revealed: false })
		})
		return { plays, jackpotLevel, playCount: format.gameCount * 2, columns: format.columns, symbolMatch: true }
	}

	const matches = computeMatchCount(jackpotLevel, format)

	// 파워볼처럼 "흰 공 5개 + 빨간 보너스 공 1개"가 실제로 공개된 잘 알려진 형식인 게임은
	// 자리 순서를 섞지 않고(실제 티켓처럼 항상 메인 번호들 다음에 보너스 볼) 각 자리에 맞는
	// 번호 범위(메인 1~69, 보너스 1~26 등)에서 뽑는다. 매칭 개수만 정직한 확률 엔진을 따른다.
	if (format.bonusBall) {
		const mainCount = format.winningCount - 1
		const mainPoolMax = format.numberPoolMax || NUMBER_POOL_MAX
		const winningMain = pickUniqueNumbers(mainCount, undefined, mainPoolMax)
		const winningBonus = pickUniqueNumbers(1, undefined, format.bonusPoolMax)[0]
		const winningNumbers = [...winningMain, winningBonus]

		const matchPositions = new Set(shuffleInPlace([...Array(format.winningCount).keys()]).slice(0, matches))
		const plays = winningNumbers.map((winNum, i) => {
			const isBonusSlot = i === format.winningCount - 1
			const pool = isBonusSlot ? format.bonusPoolMax : mainPoolMax
			// "아쉬운 낙첨"은 번호가 우연히 맞아도 실제 당첨(jackpotLevel)이 아니므로 isWinner로 취급하면 안 된다
			const isWinner = matchPositions.has(i) && !!jackpotLevel
			let number = winNum
			if (!isWinner) {
				do {
					number = 1 + Math.floor(Math.random() * pool)
				} while (number === winNum)
			}
			const prize = isWinner ? jackpotLevel.rewardMoney : flavorPrizes[i % flavorPrizes.length]
			return { number, prize, isWinner, isBonusSlot, revealed: false }
		})

		return { winningNumbers, plays, jackpotLevel, playCount: format.playCount, columns: format.columns, bonusBall: true }
	}

	const winningNumbers = pickUniqueNumbers(format.winningCount)
	const matchedValues = winningNumbers.slice(0, matches)
	const fillerValues = pickUniqueNumbers(format.playCount - matches, new Set(winningNumbers))
	const numbers = shuffleInPlace([...matchedValues, ...fillerValues])
	const winningSet = new Set(winningNumbers)

	// 당첨이 아닌 자리에도 실제 등수 상금 목록에서 그대로 가져온 "장식용" 상금을 인쇄한다(실제 티켓 관례).
	// 이 값은 원장에 반영되지 않는다 — 그 자리의 숫자가 당첨번호와 맞을 때만 진짜 지급액(jackpotLevel.rewardMoney)을 쓴다.
	const plays = numbers.map((number, i) => {
		// "아쉬운 낙첨"은 번호가 우연히 맞아도 실제 당첨(jackpotLevel)이 아니므로 isWinner로 취급하면 안 된다
		const isWinner = winningSet.has(number) && !!jackpotLevel
		const prize = isWinner ? jackpotLevel.rewardMoney : flavorPrizes[i % flavorPrizes.length]
		return { number, prize, isWinner, revealed: false }
	})

	return { winningNumbers, plays, jackpotLevel, playCount: format.playCount, columns: format.columns, pairedRows: !!format.pairedRows }
}

let cellControllers = [] // 접근성용 "Scratch Ticket" 버튼이 전체 자리를 즉시 드러낼 때 사용

// 숫자 자리(플레이 셀) 하나를 만든다 — 파워볼 보너스 볼 자리 강조는 그대로 유지
function makeNumberCell(play) {
	const cell = document.createElement("div")
	cell.className = `play-cell ${play.isBonusSlot ? "bonus-ball-slot" : ""}`
	cell.innerHTML = `
		<div class="play-number">${play.number}</div>
		<div class="play-prize">${currencySymbol}${play.prize.toLocaleString()}</div>
		<canvas class="play-scratch-canvas"></canvas>
	`
	return cell
}

// 스피또2000 게임칸의 심볼 자리 하나. 단순 기하는 CSS로, 별은 명시적 SVG 기하로 그린다.
function makeSymbolCell(play) {
	const cell = document.createElement("div")
	cell.className = "play-cell symbol-cell"
	const symbolMarkup =
		play.symbol === "star"
			? '<svg class="symbol-shape symbol-shape-star" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><polygon points="50,0 61,35 98,35 68,57 79,91 50,70 21,91 32,57 2,35 39,35"></polygon></svg>'
			: `<div class="symbol-shape symbol-shape-${play.symbol}"></div>`
	cell.innerHTML = `
		${symbolMarkup}
		<canvas class="play-scratch-canvas"></canvas>
	`
	return cell
}

function renderTicket(ticket) {
	const winningNumbersList = document.getElementById("winningNumbersList")
	const grid = document.getElementById("yourNumbersGrid")
	if (!winningNumbersList || !grid) return

	if (ticket.bonusBall) {
		// 실제 파워볼 표기 관례: 흰 공(메인 번호) ... 빨간 공(보너스) 순서, 시각적으로 분리
		const main = ticket.winningNumbers.slice(0, -1)
		const bonus = ticket.winningNumbers[ticket.winningNumbers.length - 1]
		winningNumbersList.innerHTML = `${main.join("  ")}<span class="bonus-ball-number">${bonus}</span>`
	} else if (ticket.winningNumbers) {
		winningNumbersList.textContent = ticket.winningNumbers.join("   •   ")
	}

	grid.innerHTML = ""
	cellControllers = []

	// 스피또2000: "게임"칸마다 심볼 2개가 나란히 — 실물 사진의 6게임 2x3 배치를 재현
	if (ticket.symbolMatch) {
		grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))"
		grid.classList.add("symbol-match-grid")
		const gameCount = ticket.plays.length / 2
		for (let g = 0; g < gameCount; g++) {
			const playA = ticket.plays[g * 2]
			const playB = ticket.plays[g * 2 + 1]
			const gameBox = document.createElement("div")
			gameBox.className = "symbol-game"
			gameBox.innerHTML = `<div class="symbol-game-prize">${currencySymbol}${playA.prize.toLocaleString()}</div>`
			const cellsRow = document.createElement("div")
			cellsRow.className = "symbol-game-cells"
			const cellA = makeSymbolCell(playA)
			const cellB = makeSymbolCell(playB)
			cellsRow.append(cellA, cellB)
			gameBox.appendChild(cellsRow)
			grid.appendChild(gameBox)
			cellControllers.push(setupCellScratch(cellA.querySelector("canvas"), () => onPlayRevealed(g * 2, cellA)))
			cellControllers.push(setupCellScratch(cellB.querySelector("canvas"), () => onPlayRevealed(g * 2 + 1, cellB)))
		}
		return
	}

	grid.classList.remove("symbol-match-grid")
	grid.style.gridTemplateColumns = `repeat(${ticket.columns}, minmax(0, 1fr))`

	// 스피또1000: 실물처럼 LUCKY NUMBER(위) / MY NUMBER(아래) 두 줄로 나눠 보여준다
	if (ticket.pairedRows) {
		const half = ticket.columns
		const rowLabels = ["LUCKY NUMBER", "MY NUMBER"]
		rowLabels.forEach((label, rowIndex) => {
			const labelEl = document.createElement("div")
			labelEl.className = "numbers-row-label"
			labelEl.textContent = label
			grid.appendChild(labelEl)
			ticket.plays.slice(rowIndex * half, rowIndex * half + half).forEach((play, i) => {
				const index = rowIndex * half + i
				const cell = makeNumberCell(play)
				grid.appendChild(cell)
				cellControllers.push(setupCellScratch(cell.querySelector("canvas"), () => onPlayRevealed(index, cell)))
			})
		})
		return
	}

	ticket.plays.forEach((play, index) => {
		const cell = makeNumberCell(play)
		grid.appendChild(cell)
		cellControllers.push(setupCellScratch(cell.querySelector("canvas"), () => onPlayRevealed(index, cell)))
	})
}

function onPlayRevealed(index, cellEl) {
	if (!currentTicket) return
	currentTicket.plays[index].revealed = true
	if (currentTicket.plays[index].isWinner) cellEl.classList.add("winner")
	revealedPlayCount++
	if (revealedPlayCount >= currentTicket.playCount && !ticketSettled) {
		settleTicket()
	}
}

// 티켓을 끝까지 긁었을 때만 원장에 반영한다 — 반복 스크래치 이벤트로 여러 번 반영되지 않도록 가드
function settleTicket() {
	ticketSettled = true
	totalCost += ticketCost
	updateDisplay()
	showJackpotModal(currentTicket.jackpotLevel)
	trackEvent("scratch_completed", {
		is_winner: !!currentTicket.jackpotLevel,
		rank: currentTicket.jackpotLevel ? currentTicket.jackpotLevel.rank : 0,
		reward_money: currentTicket.jackpotLevel ? currentTicket.jackpotLevel.rewardMoney : 0,
		total_attempts: totalAttempts,
	})
	trackValueCompleted("scratch", {
		is_winner: !!currentTicket.jackpotLevel,
		total_attempts: totalAttempts,
	})
	setNextExperimentContext("scratch")
}

// 확률 엔진에서 새 결과를 뽑고, 그 결과를 반영한 새 티켓을 만들어 렌더링한다.
function startNewTicket() {
	const jackpotLevel = drawLotteryResult(prizeThresholds)
	currentTicket = buildTicket(jackpotLevel, currentTicketFormat)
	revealedPlayCount = 0
	ticketSettled = false
	renderTicket(currentTicket)
	animateTicketRefresh()
	return jackpotLevel
}

/* ============================================================
   확률 표시, 결과 모달, 리셋
   ============================================================ */
function formatTierProbability(probability) {
	if (!Number.isFinite(probability) || probability <= 0) return "—"
	const percent = probability * 100
	if (percent < 0.01) {
		return `1 in ${Math.round(1 / probability).toLocaleString()}`
	}
	const decimals = percent >= 10 ? 1 : percent >= 1 ? 2 : percent >= 0.1 ? 3 : 4
	return `${Number(percent.toFixed(decimals)).toLocaleString()}%`
}

function displayPrizeProbabilities(prizeThresholds) {
	// 'div.prize-tier' 요소 선택
	const prizeTierDiv = document.querySelector("div.prize-tier")

	// 기존 내용을 제거
	prizeTierDiv.innerHTML = ""

	// 테이블 생성
	const table = document.createElement("table")
	table.setAttribute("class", "prize-table")

	// 테이블 헤더 생성
	const thead = document.createElement("thead")
	const headerRow = document.createElement("tr")
	const rankHeader = document.createElement("th")
	rankHeader.textContent = "Prize"
	const probabilityHeader = document.createElement("th")
	probabilityHeader.textContent = "Probability"
	const rewardHeader = document.createElement("th")
	rewardHeader.innerHTML = "Reward"

	headerRow.appendChild(rankHeader)
	headerRow.appendChild(probabilityHeader)
	headerRow.appendChild(rewardHeader)
	thead.appendChild(headerRow)
	table.appendChild(thead)

	// 테이블 바디 생성
	const tbody = document.createElement("tbody")

	// prizeThresholds 데이터를 순회하면서 각 등수와 확률 및 당첨금을 테이블에 추가
	// threshold는 누적확률(CDF)이므로, 해당 등수만의 확률은 이전 등수와의 구간 폭이다.
	let previousThreshold = 0
	prizeThresholds.forEach((tier) => {
		const row = document.createElement("tr")

		const rankCell = document.createElement("td")
		rankCell.textContent = `${tier.rank}`

		const probabilityCell = document.createElement("td")
		const probability = tier.threshold - previousThreshold
		previousThreshold = tier.threshold
		probabilityCell.textContent = formatTierProbability(probability)

		const rewardCell = document.createElement("td")
		rewardCell.innerHTML = `${currencySymbol} ${tier.rewardMoney.toLocaleString()}` // 금액을 천 단위로 구분하여 표시

		row.appendChild(rankCell)
		row.appendChild(probabilityCell)
		row.appendChild(rewardCell)
		tbody.appendChild(row)
	})

	table.appendChild(tbody)
	prizeTierDiv.appendChild(table) // 생성한 테이블을 'div.prize-tier'에 추가
}

// Startup initialization is centralized at DEFAULT_PRESET_KEY near the end of this file.
 // Do not render a temporary Custom ticket here: that used to build canvases/tables twice
 // before immediately replacing them with the fixed Texas search landing.
function applyProbability({ activateCustom = true } = {}) {
	const probabilityInputEl = document.getElementById("probabilityInput")
	const probabilityPercent = parseNumericField(probabilityInputEl, { min: 0, max: 100 })
	if (probabilityPercent === null || probabilityPercent <= 0 || probabilityPercent >= 100) {
		showToast("Enter a valid number between 0 and 99.")
		return
	}
	const requestedP1 = probabilityPercent / 100

	// 수동 확률은 실물/공식 프리셋 위에 덮어쓰지 않는다.
	// Custom preset의 상금표·티켓가격·통화와 결합해 공식 데이터와 가상 모델이 섞이지 않도록 한다.
	const customPreset = LOTTERY_PRESETS.custom
	p1 = requestedP1
	ticketCost = customPreset.ticketCost
	currencySymbol = customPreset.currency
	currentTicketFormat = customPreset.ticketFormat || DEFAULT_TICKET_FORMAT
	configureModeledPrizeModel(customPreset, p1)

	if (activateCustom) {
		clearSimulationOutputs()
		const presetSelect = document.getElementById("lotteryPreset")
		if (presetSelect) presetSelect.value = "custom"
		updateProbabilityComparison("custom")
		updatePresetEvidence("custom", true)
		updateTicketBanner("custom")
		applyTicketTheme("custom")
		highlightSelectedGameCard("custom")
		updateSimulationBudgetHint()
	}

	displayPrizeProbabilities(prizeThresholds)
	updateOddsSummary()
	startNewTicket()
	closeJackpotModal()

	trackEvent("apply_probability", {
		probability_percent: probabilityPercent,
		model: "custom",
	})
}

// 버튼 클릭은 명시적으로 Custom 모델로 전환한다. 초기 부트스트랩은 hidden preset state만 유지한다.
document.getElementById("applyProbability").addEventListener("click", () => applyProbability({ activateCustom: true }))

const $longRunApply = document.getElementById("longRunApply")
const $longRunSave = document.getElementById("longRunSaveBtn")
if ($longRunApply) $longRunApply.addEventListener("click", () => updateLongRunProjection({ track: true }))
if ($longRunSave) {
	$longRunSave.addEventListener("click", () => {
		if (latestLongRunSnapshot) saveExperiment(latestLongRunSnapshot)
	})
}

const $taxCalculate = document.getElementById("taxCalculate")
const $taxCountry = document.getElementById("taxCountry")
const $taxJackpotAmount = document.getElementById("taxJackpotAmount")
if ($taxCalculate) $taxCalculate.addEventListener("click", updateTaxCalculator)
if ($taxCountry) {
	$taxCountry.addEventListener("change", () => {
		const rule = LOTTERY_TAX_RULES[$taxCountry.value]
		if (rule && $taxJackpotAmount) $taxJackpotAmount.value = rule.defaultAmount
		updateTaxCalculator()
	})
}

function updateDisplay() {
	const costDisplay = document.getElementById("costDisplay")
	const prizeDisplay = document.getElementById("prizeDisplay")
	const profitDisplay = document.getElementById("profitDisplay")
	const attemptsDisplay = document.getElementById("attemptsDisplay")
	const shareButton = document.getElementById("shareCardBtn")

	setMetricText(costDisplay, `${currencySymbol}${totalCost.toLocaleString()}`)
	setMetricText(prizeDisplay, `${currencySymbol}${totalPrize.toLocaleString()}`)
	setMetricText(attemptsDisplay, totalAttempts.toLocaleString())
	if (shareButton) shareButton.hidden = totalAttempts === 0

	const totalProfit = totalPrize - totalCost
	if (profitDisplay) {
		setMetricText(profitDisplay, `${currencySymbol}${totalProfit.toLocaleString()}`)
		profitDisplay.classList.toggle("stat-profit-pos", totalProfit >= 0)
		profitDisplay.classList.toggle("stat-profit-neg", totalProfit < 0)
	}

	updatePersonalRtpRecap()
}

// 모달을 표시하고 내용을 업데이트하는 함수
function showJackpotModal(jackpotLevel) {
	totalAttempts++ // 시도 횟수 증가
	updateLotteryRecord(jackpotLevel)

	if (modalBadge) modalBadge.className = `modal-badge ${jackpotLevel ? "modal-badge-win" : "modal-badge-lose"}`

	// 당첨금은 여기서 먼저 반영해야 아래 totalProfit/updateDisplay가 이번 당첨을 포함한 값을 보여준다
	// (이전엔 반영 전에 계산해서, 당첨 직후 화면에 이번 당첨금이 안 잡히는 버그가 있었다)
	if (jackpotLevel) {
		totalPrize += jackpotLevel.rewardMoney
		if (jackpotLevel.rewardMoney > bestWinAmount) {
			bestWinAmount = jackpotLevel.rewardMoney
			bestWinLabel = `${jackpotLevel.rank} Prize`
		}
	}

	const totalProfit = totalPrize - totalCost // 총 손익 계산
	updateDisplay()

	if (jackpotLevel) {
		jackpotMessage.innerHTML = `
			<span class="modal-headline">${winning_message}</span>
			<span class="modal-rank">${jackpotLevel.rank} Prize</span>
			<span class="modal-amount">${currencySymbol} ${jackpotLevel.rewardMoney.toLocaleString()}</span>
			<span class="modal-footline">Total Profit: ${currencySymbol} ${totalProfit.toLocaleString()} · Attempts: ${totalAttempts}</span>
		`
	} else {
		jackpotMessage.innerHTML = `
			<span class="modal-headline">${no_luck}</span>
			<span class="modal-footline">Total Profit: ${currencySymbol} ${totalProfit.toLocaleString()} · Attempts: ${totalAttempts}</span>
		`
	}
	saveState()

	playRevealChime(!!jackpotLevel)
	vibrate(jackpotLevel ? [40, 30, 40, 30, 80] : [30])
	if (jackpotLevel) triggerWinConfetti()

	if (document.activeElement && document.activeElement !== document.body) {
		modalReturnFocus = document.activeElement
	}
	clearTimeout(modalCloseTimer)
	modalCloseTimer = null
	modal.style.display = "flex"
	modal.setAttribute("aria-hidden", "false")
	modal.classList.remove("is-closing")
	requestAnimationFrame(() => {
		modal.classList.add("is-open")
		const primaryAction = document.getElementById("modalPlayAgainBtn")
		;(primaryAction || closeModal)?.focus()
	})
}

// 모달을 닫는 함수
function closeJackpotModal() {
	if (!modal) return
	const wasOpen = modal.getAttribute("aria-hidden") === "false"
	const fallback = document.getElementById("nextLottery")
	const target = modalReturnFocus && modalReturnFocus.isConnected ? modalReturnFocus : fallback

	const finishClose = () => {
		modal.classList.remove("is-open", "is-closing")
		modal.style.display = "none"
		modal.setAttribute("aria-hidden", "true")
		modalCloseTimer = null
		if (wasOpen) requestAnimationFrame(() => target?.focus())
	}

	modalReturnFocus = null
	clearTimeout(modalCloseTimer)
	if (!wasOpen || !motionEnabled()) {
		finishClose()
		return
	}

	modal.classList.remove("is-open")
	modal.classList.add("is-closing")
	modalCloseTimer = setTimeout(finishClose, 190)
}

// 모달 닫기 버튼 클릭 시 모달 닫기
closeModal.addEventListener("click", closeJackpotModal)

// 모달 외부 클릭 시 모달 닫기
window.addEventListener("click", (event) => {
	if (event.target === modal) {
		closeJackpotModal()
	}
})

document.addEventListener("keydown", (event) => {
	if (!modal || modal.getAttribute("aria-hidden") !== "false") return
	if (event.key === "Escape") {
		event.preventDefault()
		closeJackpotModal()
		return
	}
	if (event.key !== "Tab") return

	const focusables = modalFocusableElements()
	if (!focusables.length) return
	const first = focusables[0]
	const last = focusables[focusables.length - 1]
	if (event.shiftKey && document.activeElement === first) {
		event.preventDefault()
		last.focus()
	} else if (!event.shiftKey && document.activeElement === last) {
		event.preventDefault()
		first.focus()
	}
})

// 모달 요소 끝

// "Scratch Ticket" 버튼은 주 상호작용(직접 긁기)의 대체가 아니라, 마우스/터치로 긁기 어려운
// 사용자를 위한 접근성 대안이다 — 남은 자리를 전부 즉시 드러낸다. 확률/결과는 바뀌지 않는다.
const $scratchButton = document.getElementById("scratch")
$scratchButton.addEventListener("click", () => {
	cellControllers.forEach((controller) => controller.revealNow())
})

// 리셋 버튼 이벤트 핸들러
// wipeLedger=false는 페이지 최초 로드시 "새 티켓만 준비"하고 복원된 누적 장부는 건드리지 않기 위함
function resetLottery(wipeLedger = true, trackReset = true) {
	clearSimulationOutputs()
	if (wipeLedger) {
		lotteryRecord = [] // 기록 초기화
		totalAttempts = 0 // 총 시도 횟수 초기화
		totalCost = 0 // 총 비용
		totalPrize = 0 // 총 당첨금
		saveState()
		prizeVTScroll.innerHTML = ``
	}

	updateDisplay() // costDisplay/prizeDisplay/profitDisplay를 현재 totalCost/totalPrize 기준으로 갱신
	displayLotteryRecord() // 복원되었거나 방금 초기화된 lotteryRecord를 화면에 반영

	// 현재 설정된 프리셋 보존하면서 확률 계산
	const currentPresetKey = document.getElementById("lotteryPreset")?.value || "custom"
	const presetObj = LOTTERY_PRESETS[currentPresetKey]
	configurePrizeModel(presetObj, p1)

	// 새 티켓 생성
	startNewTicket()
	displayPrizeProbabilities(prizeThresholds)
	closeJackpotModal()

	if (trackReset) trackEvent("reset_lottery")
}

const $resetLottery = document.getElementById("resetLottery")
let resetConfirmTimer = null

function clearResetConfirmation() {
	if (!$resetLottery) return
	clearTimeout(resetConfirmTimer)
	resetConfirmTimer = null
	$resetLottery.classList.remove("is-confirming")
	$resetLottery.textContent = "Reset play totals"
	$resetLottery.removeAttribute("aria-label")
}

function requestResetLottery() {
	if (!$resetLottery) return
	if (!$resetLottery.classList.contains("is-confirming")) {
		$resetLottery.classList.add("is-confirming")
		$resetLottery.textContent = "Confirm reset"
		$resetLottery.setAttribute("aria-label", "Confirm clearing saved scratch totals and log")
		showToast("This clears your scratch totals and log. My Lab stays saved. Select Confirm reset to continue.")
		resetConfirmTimer = setTimeout(clearResetConfirmation, 6000)
		return
	}
	clearResetConfirmation()
	resetLottery(true)
}

if ($resetLottery) $resetLottery.addEventListener("click", requestResetLottery)

function goToNextTicket() {
	if (!ticketSettled) {
		showToast("Scratch all the numbers on this ticket first.")
		return
	}
	startNewTicket()
	updateDisplay()
	displayPrizeProbabilities(prizeThresholds)
	trackEvent("next_lottery", {
		total_cost: totalCost,
		total_prize: totalPrize,
		total_profit: totalPrize - totalCost,
	})
	closeJackpotModal()
}

document.getElementById("nextLottery").onclick = goToNextTicket

const $modalPlayAgainBtn = document.getElementById("modalPlayAgainBtn")
if ($modalPlayAgainBtn) $modalPlayAgainBtn.addEventListener("click", goToNextTicket)

/* ============================================================
   로터리 로그 — 차트 / 상세보기 / 테이블
   ============================================================ */
function updateLotteryRecord(jackpotLevel) {
	const currentTime = new Date() // 현재 시각
	const month = String(currentTime.getMonth() + 1).padStart(2, "0") // 월 (0부터 시작하므로 +1 필요)
	const day = String(currentTime.getDate()).padStart(2, "0") // 일
	const hours = String(currentTime.getHours()).padStart(2, "0") // 시 (24시간 형식)
	const minutes = String(currentTime.getMinutes()).padStart(2, "0") // 분
	const seconds = String(currentTime.getSeconds()).padStart(2, "0") // 초

	const formattedTime = `${month}.${day} ${hours}:${minutes}:${seconds}`

	let result
	if (jackpotLevel) {
		result = `${jackpotLevel.rank} Prize ${currencySymbol} ${jackpotLevel.rewardMoney.toLocaleString()}`
	} else {
		result = `<span>${no_luck}</span>`
	}
	prizeVTScroll.innerHTML = `<span>${result}</span>`
	prizeVTScroll.classList.toggle("ticker-win", !!jackpotLevel) // 당첨일 때만 짧게 반짝임

	// 기록을 lotteryRecord 배열에 추가 — 차트/상세보기에 쓸 구조화된 값도 같이 저장한다
	const rewardMoney = jackpotLevel ? jackpotLevel.rewardMoney : 0
	lotteryRecord.push({
		time: formattedTime,
		result: result,
		currency: currencySymbol,
		cost: ticketCost,
		rewardMoney,
		rank: jackpotLevel ? jackpotLevel.rank : null,
		net: rewardMoney - ticketCost,
		isWin: !!jackpotLevel,
	})

	// 기록을 화면에 표시
	displayLotteryRecord()
}

const LOTTERY_LOG_CHART_MAX_POINTS = 40 // 이 개수보다 많으면 최신 것만 잘라서 보여준다(가독성)
let selectedLogIndex = null

function displayLotteryRecord() {
	renderLotteryLogChart()
	renderLotteryLogTable()
}

// 시계열 차트: x축=회차, y축=그 회차의 순손익(상금-비용). 점을 클릭하면 상세 패널에 표시된다.
function renderLotteryLogChart() {
	const container = document.getElementById("lotteryLogChart")
	if (!container) return

	if (!lotteryRecord.length) {
		container.innerHTML = `<p class="lottery-log-empty">Scratch a ticket to start your log.</p>`
		renderLotteryLogDetail(null)
		return
	}

	const points = lotteryRecord.slice(-LOTTERY_LOG_CHART_MAX_POINTS)
	const startIndex = lotteryRecord.length - points.length
	const values = points.map((r) => r.net ?? 0)
	const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)))

	const width = 600
	const height = 140
	const padX = 16
	const padY = 16
	const midY = height / 2
	const stepX = points.length > 1 ? (width - padX * 2) / (points.length - 1) : 0

	const coords = values.map((v, i) => {
		const x = padX + stepX * i
		const y = midY - (v / maxAbs) * (midY - padY)
		return { x, y }
	})

	const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")

	const circles = coords
		.map((p, i) => {
			const record = points[i]
			const logIndex = startIndex + i
			const isWin = !!record.isWin
			return `<circle
				class="lottery-log-point ${isWin ? "is-win" : "is-lose"} ${logIndex === selectedLogIndex ? "is-selected" : ""}"
				cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5"
				data-log-index="${logIndex}"
				tabindex="0" role="button"
				aria-label="${record.time}: ${isWin ? `won ${record.currency}${record.rewardMoney.toLocaleString()}` : "no luck"}"
			><title>${record.time} · ${isWin ? `Won ${record.currency}${record.rewardMoney.toLocaleString()}` : "No luck"}</title></circle>`
		})
		.join("")

	container.innerHTML = `
		<svg viewBox="0 0 ${width} ${height}" class="lottery-log-svg" preserveAspectRatio="none" role="img" aria-label="Net profit per scratch over time">
			<line x1="${padX}" y1="${midY}" x2="${width - padX}" y2="${midY}" class="lottery-log-zero-line" />
			<path d="${linePath}" class="lottery-log-line" fill="none" />
			${circles}
		</svg>
		${startIndex > 0 ? `<p class="lottery-log-note">Showing the most recent ${points.length} of ${lotteryRecord.length} scratches.</p>` : ""}
	`

	container.querySelectorAll(".lottery-log-point").forEach((el) => {
		const select = () => {
			selectedLogIndex = Number(el.dataset.logIndex)
			renderLotteryLogChart()
		}
		el.addEventListener("click", select)
		el.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault()
				select()
			}
		})
	})

	renderLotteryLogDetail(selectedLogIndex)
}

function renderLotteryLogDetail(index) {
	const detail = document.getElementById("lotteryLogDetail")
	if (!detail) return
	if (index === null || index === undefined || !lotteryRecord[index]) {
		detail.innerHTML = ""
		return
	}
	const record = lotteryRecord[index]
	const net = record.net ?? 0
	detail.innerHTML = `
		<div class="lottery-log-detail-row"><span class="stat-label">Time</span><span>${record.time}</span></div>
		<div class="lottery-log-detail-row"><span class="stat-label">Result</span><span>${record.isWin ? `${record.rank} Prize` : "No luck"}</span></div>
		<div class="lottery-log-detail-row"><span class="stat-label">Prize</span><span>${record.currency || currencySymbol}${(record.rewardMoney || 0).toLocaleString()}</span></div>
		<div class="lottery-log-detail-row"><span class="stat-label">Net</span><span class="${net >= 0 ? "stat-profit-pos" : "stat-profit-neg"}">${net >= 0 ? "+" : ""}${record.currency || currencySymbol}${net.toLocaleString()}</span></div>
	`
}

// 접근성 대안: 같은 데이터를 표(table)로도 볼 수 있게 — 색/좌표에 의존하지 않는 뷰
function renderLotteryLogTable() {
	const table = document.getElementById("lotteryLogTable")
	const toggle = document.getElementById("lotteryLogTableToggle")
	const chart = document.getElementById("lotteryLogChart")
	if (!table) return
	if (toggle) toggle.hidden = lotteryRecord.length === 0
	if (!lotteryRecord.length) {
		table.hidden = true
		if (chart) chart.hidden = false
		if (toggle) toggle.textContent = "View as table"
	}
	const rows = lotteryRecord
		.slice()
		.reverse()
		.map(
			(r) => `<div class="lottery-log-table-row"><span>${r.time}</span><span>${r.isWin ? `${r.rank} Prize` : "No luck"}</span><span>${r.currency || currencySymbol}${(r.rewardMoney || 0).toLocaleString()}</span></div>`
		)
		.join("")
	table.innerHTML = rows || `<p class="lottery-log-empty">No scratches yet.</p>`
}

const $lotteryLogTableToggle = document.getElementById("lotteryLogTableToggle")
if ($lotteryLogTableToggle) {
	$lotteryLogTableToggle.addEventListener("click", () => {
		const table = document.getElementById("lotteryLogTable")
		const chart = document.getElementById("lotteryLogChart")
		const isHidden = table.hasAttribute("hidden")
		table.toggleAttribute("hidden", !isHidden)
		chart.toggleAttribute("hidden", isHidden)
		$lotteryLogTableToggle.textContent = isHidden ? "View as chart" : "View as table"
	})
}

/* ============================================================
   프리셋 적용 & 오즈 요약 — 비교, 배너, 테마, RTP, 장기 예측
   ============================================================ */

function applyPreset(presetKey, wipeLedger = true, trackSelection = true) {
	const preset = LOTTERY_PRESETS[presetKey]
	if (!preset) return

	const probabilityInputEl = document.getElementById("probabilityInput")
	if (presetKey !== "custom") {
		if (probabilityInputEl) probabilityInputEl.value = preset.p1
		p1 = parseFloat(preset.p1) / 100
	} else {
		const enteredP1 = probabilityInputEl ? parseFloat(probabilityInputEl.value) / 100 : NaN
		if (Number.isFinite(enteredP1) && enteredP1 > 0 && enteredP1 < 1) {
			p1 = enteredP1
		} else {
			p1 = parseFloat(preset.p1) / 100
			if (probabilityInputEl) probabilityInputEl.value = preset.p1
		}
	}
	ticketCost = preset.ticketCost
	currencySymbol = preset.currency

	configurePrizeModel(preset, p1)
	currentTicketFormat = preset.ticketFormat || DEFAULT_TICKET_FORMAT
	resetLottery(wipeLedger, false)
	updateProbabilityComparison(presetKey)
	updatePresetEvidence(presetKey)
	updateTicketBanner(presetKey)
	applyTicketTheme(presetKey)
	updateOddsSummary()
	updateSimulationBudgetHint()
	highlightSelectedGameCard(presetKey)
	animatePresetRefresh()

	if (trackSelection) {
		trackEvent("select_preset", {
			preset_name: presetKey,
			p1: p1,
			ticket_cost: ticketCost,
		})
	}
}
function updatePresetEvidence(presetKey, hasCustomOverride = false) {
	const el = document.getElementById("presetEvidence")
	if (!el) return
	const preset = LOTTERY_PRESETS[presetKey]
	if (!preset) {
		el.textContent = ""
		return
	}

	if (hasCustomOverride) {
		el.textContent = "Custom probability model active. The top-prize probability is user-defined; lower-tier probabilities and prizes are simulator assumptions, not an official lottery distribution."
		return
	}

	if (preset.evidence) {
		const mathLink =
			presetKey === "us_scratch5"
				? ' <a href="math/">Learn why RTP, variance and repeated trials behave this way.</a>'
				: ""
		el.innerHTML = `${preset.evidence.label}. <a href="${preset.evidence.url}" target="_blank" rel="noopener">Official source</a>.${mathLink}`
		return
	}

	if (presetKey === "powerball") {
		el.innerHTML = 'Official jackpot odds are used for the top tier; lower prize tiers and displayed RTP are simulator-modeled, not the official Powerball prize distribution. <a href="https://www.powerball.com/powerball-prize-chart" target="_blank" rel="noopener">Official source</a>.'
		return
	}


	if (presetKey === "custom" || presetKey === "lucky_fun") {
		el.textContent = "Simulation-defined odds. This preset is not presented as an official lottery distribution."
		return
	}

	el.textContent = ""
}

/* 확률 체감 비교 — 실제로 공신력 있는 출처가 확인된 통계만 사용 (Anti-slop: no invented substance) */
const PROBABILITY_COMPARISONS = {
	powerball: {
		text: "You are far more likely to be struck by lightning in your lifetime (1 in 15,300, over 80 years) than to hit this top prize (1 in 292,201,338).",
		sourceLabel: "US National Weather Service",
		sourceUrl: "https://www.noaa.gov/jetstream/lightning/frequently-asked-questions",
	},
	speetto1000: {
		text: "An amateur golfer is about 400x more likely to make a hole-in-one (1 in 12,500) than to hit this top prize (1 in 5,000,000).",
		sourceLabel: "Haggin Oaks",
		sourceUrl: "https://www.hagginoaks.com/blog/what-are-your-chances-at-a-hole-in-one/",
	},
}

function updateProbabilityComparison(presetKey) {
	const el = document.getElementById("probabilityComparison")
	if (!el) return
	const comp = PROBABILITY_COMPARISONS[presetKey]
	if (!comp) {
		el.style.display = "none"
		return
	}
	el.style.display = "block"
	el.innerHTML = `${comp.text} <a href="${comp.sourceUrl}" target="_blank" rel="noopener">${comp.sourceLabel}</a>`
}

/* 티켓 배너 — 실제 프리셋 이름/최고상금(rewards[0])만 사용, 지어낸 브랜드/문구 없음 */
function updateTicketBanner(presetKey) {
	const preset = LOTTERY_PRESETS[presetKey]
	const nameEl = document.getElementById("ticketBannerName")
	const prizeEl = document.getElementById("ticketBannerPrize")
	const denomEl = document.getElementById("ticketDenom")
	const howToEl = document.getElementById("ticketHowTo")
	const winningNumbersBlockEl = document.getElementById("winningNumbersBlock")
	if (!preset || !nameEl || !prizeEl) return
	nameEl.textContent = preset.name
	const topPrize = preset.rewards && preset.rewards[0]
	prizeEl.textContent = topPrize ? `Win up to ${preset.currency}${topPrize.toLocaleString()}` : ""
	if (denomEl) denomEl.textContent = `${preset.currency}${preset.ticketCost.toLocaleString()} TICKET`
	if (howToEl && preset.howTo) howToEl.textContent = preset.howTo
	// 심볼 매칭 게임(스피또2000)은 "당첨번호" 개념 자체가 없다 — 게임칸 안에서 심볼 2개를 직접 비교한다
	if (winningNumbersBlockEl) winningNumbersBlockEl.hidden = !!(preset.ticketFormat && preset.ticketFormat.symbolMatch)
}

/* 게임마다 색 테마를 바꾼다 — CSS 변수만 갈아끼우므로 레이아웃/구조는 그대로 두고 배색만 바뀐다 */
function applyTicketTheme(presetKey) {
	const preset = LOTTERY_PRESETS[presetKey]
	const ticketArt = document.querySelector(".ticket-art")
	if (!preset || !preset.theme || !ticketArt) return
	const { bg1, bg2, accent, accentContrast } = preset.theme
	ticketArt.style.setProperty("--ticket-bg-1", bg1)
	ticketArt.style.setProperty("--ticket-bg-2", bg2)
	ticketArt.style.setProperty("--ticket-accent", accent)
	ticketArt.style.setProperty("--ticket-accent-contrast", accentContrast)
}

/* prizeThresholds(실제 CDF)로부터 티켓 1장의 기대 상금과 이론적 RTP%를 계산한다.
   updateOddsSummary와 "장기 오즈 예측"이 같은 계산을 중복하지 않도록 공용 함수로 뺐다. */
function computeTheoreticalReturn() {
	let previousThreshold = 0
	const outcomes = prizeThresholds.map((tier) => {
		const probability = tier.threshold - previousThreshold
		previousThreshold = tier.threshold
		return { probability, payout: tier.rewardMoney }
	})
	if (previousThreshold < 1) outcomes.push({ probability: 1 - previousThreshold, payout: 0 })
	const expectedReturnPerTicket = LotteryMathCore.expectedPayout(outcomes)
	const overallReturnPercent = ticketCost > 0 ? LotteryMathCore.returnToPlayer(ticketCost, outcomes) * 100 : 0
	return { expectedReturnPerTicket, overallReturnPercent }
}

/* 현재 오즈 요약 — prizeThresholds(실제 CDF)로부터 직접 계산, 근사/예시 값 아님 */
function updateOddsSummary() {
	const topPrizeEl = document.getElementById("oddsTopPrize")
	const anyPrizeEl = document.getElementById("oddsAnyPrize")
	const returnEl = document.getElementById("oddsOverallReturn")
	if (!topPrizeEl || !anyPrizeEl || !returnEl) return

	const topPrizeProbability = prizeThresholds[0].threshold
	const anyPrizeProbability = prizeThresholds[prizeThresholds.length - 1].threshold
	const { overallReturnPercent } = computeTheoreticalReturn()

	topPrizeEl.textContent = topPrizeProbability > 0 ? `1 in ${Math.round(1 / topPrizeProbability).toLocaleString()}` : "—"
	anyPrizeEl.textContent = anyPrizeProbability > 0 ? `1 in ${(1 / anyPrizeProbability).toFixed(1)}` : "—"
	returnEl.textContent = `${overallReturnPercent.toFixed(1)}%`

	updateLongRunProjection()
	updateExactMultiTicketOdds(false)
}

const EXACT_ODDS_MAX_TICKETS = 1000000

function formatChancePercent(probability) {
	const percent = probability * 100
	if (percent >= 0.01) return percent.toFixed(2) + "%"
	if (percent >= 0.000001) return percent.toFixed(6) + "%"
	return percent.toExponential(2) + "%"
}

function updateExactMultiTicketOdds(track = true) {
	const input = document.getElementById("exactOddsTicketsInput")
	const result = document.getElementById("exactOddsResult")
	if (!input || !result || !prizeThresholds.length) return false

	const count = parseNumericField(input, { min: 1, max: EXACT_ODDS_MAX_TICKETS, integer: true })
	if (count === null) {
		if (track) showToast(`Use 1–${EXACT_ODDS_MAX_TICKETS.toLocaleString()} tickets.`)
		return false
	}
	input.value = String(count)

	const topPrizeProbability = prizeThresholds[0].threshold
	const anyPrizeProbability = prizeThresholds[prizeThresholds.length - 1].threshold
	const chanceTopPrize = LotteryMathCore.atLeastOne(topPrizeProbability, count)
	const chanceAnyPrize = LotteryMathCore.atLeastOne(anyPrizeProbability, count)
	const { expectedReturnPerTicket } = computeTheoreticalReturn()
	const totalCostForCount = count * ticketCost
	const expectedPayout = count * expectedReturnPerTicket
	const expectedNet = expectedPayout - totalCostForCount
	const expectedNetClass = expectedNet >= 0 ? "stat-profit-pos" : "stat-profit-neg"
	const preset = LOTTERY_PRESETS[currentGrowthPreset()]
	const modelLabel = preset?.name || "Current model"

	result.innerHTML = `
		<div class="exact-odds-heading"><strong>${count.toLocaleString()} tickets · ${currencySymbol}${totalCostForCount.toLocaleString()} total cost</strong></div>
		<div class="exact-odds-grid">
			<div><span class="stat-label">≥1 any prize</span><strong>${formatChancePercent(chanceAnyPrize)}</strong></div>
			<div><span class="stat-label">≥1 top prize</span><strong>${formatChancePercent(chanceTopPrize)}</strong></div>
			<div><span class="stat-label">Expected payout</span><strong>${currencySymbol}${expectedPayout.toFixed(2)}</strong></div>
			<div><span class="stat-label">Expected net</span><strong class="${expectedNetClass}">${expectedNet >= 0 ? "+" : "−"}${currencySymbol}${Math.abs(expectedNet).toFixed(2)}</strong></div>
		</div>
		<p class="sim-budget-hint">Exact for this simulator's independent-draw ${modelLabel} model: chance of at least one result = 1 − (1 − p)<sup>n</sup>. This does not estimate remaining live tickets or predict a future ticket.</p>
	`

	if (track) {
		trackToolStarted("exact_odds")
		trackEvent("calculate_exact_odds", {
			ticket_count: count,
			chance_any_prize_percent: Number((chanceAnyPrize * 100).toFixed(6)),
			chance_top_prize_percent: Number((chanceTopPrize * 100).toFixed(9)),
		})
		trackValueCompleted("exact_odds", { ticket_count: count })
		offerExperimentSave(result, {
			type: "exact_odds",
			params: { count },
			summary: `${count.toLocaleString()} tickets · ≥1 any prize ${formatChancePercent(chanceAnyPrize)} · expected net ${expectedNet >= 0 ? "+" : "−"}${currencySymbol}${Math.abs(expectedNet).toFixed(2)}`,
		})
		setNextExperimentContext("exact")
	}
	return true
}

const $exactOddsCalculate = document.getElementById("exactOddsCalculateBtn")
const $exactOddsTicketsInput = document.getElementById("exactOddsTicketsInput")
if ($exactOddsCalculate) $exactOddsCalculate.addEventListener("click", () => updateExactMultiTicketOdds(true))
if ($exactOddsTicketsInput) {
	$exactOddsTicketsInput.addEventListener("keydown", (event) => {
		if (event.key === "Enter") updateExactMultiTicketOdds(true)
	})
}

/* "내 실제 RTP vs 이론적 RTP" — 표본이 너무 적으면 우연에 의한 극단값이 과장돼 보이므로
   최소 시도 횟수 이상일 때만 보여준다(가짜로 그럴싸하게 꾸미지 않기 위한 가드) */
const PERSONAL_RTP_MIN_ATTEMPTS = 20

function updatePersonalRtpRecap() {
	const el = document.getElementById("personalRtpRecap")
	if (!el) return
	if (totalAttempts < PERSONAL_RTP_MIN_ATTEMPTS || totalCost <= 0) {
		el.hidden = true
		return
	}
	const actualReturnPercent = (totalPrize / totalCost) * 100
	const { overallReturnPercent: theoreticalReturnPercent } = computeTheoreticalReturn()
	el.hidden = false
	el.textContent = `Over your last ${totalAttempts} tickets, you've actually gotten back ${actualReturnPercent.toFixed(1)}% of what you spent (this game's theoretical average is ${theoreticalReturnPercent.toFixed(1)}%). Short-run luck swings — that's expected, not a bug.`
}

/* "장기 오즈 예측" — 지금 게임의 진짜 확률/RTP를 몇 주/몇 년치로 그대로 투영만 한다.
   여기서도 확률 엔진(p1, prizeThresholds)은 그대로 가져다 쓸 뿐 새로 지어내지 않는다. */
let latestLongRunSnapshot = null

function updateLongRunProjection({ track = false } = {}) {
	const ticketsInput = document.getElementById("longRunPerWeek")
	const yearsInput = document.getElementById("longRunYears")
	const ticketsEl = document.getElementById("longRunTickets")
	const spentEl = document.getElementById("longRunSpent")
	const lossEl = document.getElementById("longRunLoss")
	const jackpotChanceEl = document.getElementById("longRunJackpotChance")
	if (!ticketsInput || !yearsInput || !ticketsEl || !spentEl || !lossEl || !jackpotChanceEl) return

	const perWeek = parseNumericField(ticketsInput, { min: 1, max: 1000, integer: true })
	const years = parseNumericField(yearsInput, { min: 1, max: 80, integer: true })
	if (perWeek === null || years === null) {
		showToast("Use 1–1,000 tickets per week and 1–80 years.")
		return
	}
	ticketsInput.value = String(perWeek)
	yearsInput.value = String(years)
	const totalTickets = perWeek * 52 * years
	const totalSpent = totalTickets * ticketCost
	const { overallReturnPercent } = computeTheoreticalReturn()
	const expectedReturn = totalSpent * (overallReturnPercent / 100)
	const expectedLoss = totalSpent - expectedReturn
	const topPrizeProbability = prizeThresholds[0].threshold
	const jackpotChance = LotteryMathCore.atLeastOne(topPrizeProbability, totalTickets)

	ticketsEl.textContent = totalTickets.toLocaleString()
	spentEl.textContent = `${currencySymbol}${Math.round(totalSpent).toLocaleString()}`
	lossEl.textContent = `${currencySymbol}${Math.round(expectedLoss).toLocaleString()}`
	jackpotChanceEl.textContent = `${(jackpotChance * 100).toFixed(2)}%`

	latestLongRunSnapshot = {
		type: "long_run",
		params: { perWeek, years },
		summary: `${perWeek.toLocaleString()}/week × ${years} ${years === 1 ? "year" : "years"} · expected loss ${currencySymbol}${Math.round(expectedLoss).toLocaleString()} · top-prize chance ${(jackpotChance * 100).toFixed(2)}%`,
		...experimentPresetContext(),
	}

	if (track) {
		trackToolStarted("long_run")
		trackEvent("calculate_long_run", { tickets_per_week: perWeek, years, total_tickets: totalTickets })
		trackValueCompleted("long_run", { tickets_per_week: perWeek, years, total_tickets: totalTickets })
		const saveButton = document.getElementById("longRunSaveBtn")
		if (saveButton) saveButton.hidden = false
		setNextExperimentContext("long_run")
	}
}

/* ============================================================
   세금 계산기 — 미국 누진세 + 국가별 공식 규정
   ============================================================ */
/* 미국 2026 연방 개인 소득세 누진 구간(1인 신고자 기준) — Tax Foundation이 정리한
   IRS Revenue Procedure 2025-32 수치. 원천징수(24% 단일세율)와는 별개로, "이 당첨금이
   유일한 소득이라면" 실제로 최종 세액이 누진 구간을 거쳐 얼마가 되는지 보여주기 위함. */
const US_2026_SINGLE_BRACKETS = [
	{ upTo: 12400, rate: 0.1 },
	{ upTo: 50400, rate: 0.12 },
	{ upTo: 105700, rate: 0.22 },
	{ upTo: 201775, rate: 0.24 },
	{ upTo: 256225, rate: 0.32 },
	{ upTo: 640600, rate: 0.35 },
	{ upTo: Infinity, rate: 0.37 },
]
const US_2026_STANDARD_DEDUCTION = 16100

function computeUsProgressiveTax(grossAmount) {
	const taxableIncome = Math.max(0, grossAmount - US_2026_STANDARD_DEDUCTION)
	let tax = 0
	let previousCap = 0
	for (const bracket of US_2026_SINGLE_BRACKETS) {
		if (taxableIncome <= previousCap) break
		const amountInBracket = Math.min(taxableIncome, bracket.upTo) - previousCap
		tax += amountInBracket * bracket.rate
		previousCap = bracket.upTo
	}
	return tax
}

/* 로또 당첨금 세금 — 실제로 검증한 각국 공식 규정만 사용한다(지어낸 세율 없음).
   미국은 원천징수(24%)일 뿐 최종 세액이 아니라는 걸 명시하고, 한국은 3억 기준 구간별
   최종 분리과세, 영국/호주는 실제로 세금이 0%인 국가라는 걸 그대로 보여준다. */
const LOTTERY_TAX_RULES = {
	us: {
		symbol: "$",
		defaultAmount: 1000000,
		sourceLabel: "IRS Instructions for Forms W-2G and 5754; brackets via Tax Foundation (IRS Rev. Proc. 2025-32)",
		sourceUrl: "https://www.irs.gov/instructions/iw2g",
		compute(amount) {
			// IRS: 상금이 $5,000을 넘을 때만 원천징수가 발생하고, 그 24%는 초과분이 아니라
			// 상금 "전체"에 적용된다 — $5,000 미만은 원천징수 자체가 없다(0%)
			const withholdingThreshold = 5000
			const withheld = amount > withholdingThreshold ? amount * 0.24 : 0
			const finalEstimate = computeUsProgressiveTax(amount)
			return {
				withheld,
				finalEstimate,
				note:
					amount > withholdingThreshold
						? `The IRS withholds a flat 24% up front once a prize exceeds $5,000 — that's only a prepayment, not your real bracket. Assuming this prize were your *only* income for the year (single filer, standard deduction, 2026 brackets), your actual federal tax would be closer to the "Est. Total Tax" figure above — real life usually lands somewhere between the two since you likely have other income too. State taxes aren't included.`
						: "Prizes of $5,000 or less aren't subject to automatic federal withholding — you'd still owe income tax on it when you file, just not withheld up front.",
			}
		},
	},
	kr: {
		symbol: "₩",
		defaultAmount: 1000000000,
		sourceLabel: "소득세법 제129조(원천징수세율)",
		sourceUrl: "https://www.koreadaily.com/article/20250101180050504",
		compute(amount) {
			const threshold = 300000000
			const below = Math.min(amount, threshold)
			const above = Math.max(0, amount - threshold)
			const belowTax = below * 0.22
			const aboveTax = above * 0.33
			const withheld = belowTax + aboveTax
			const note =
				above > 0
					? `Korea taxes lottery winnings as final withholding (분리과세), split by bracket — not one flat rate on the whole prize: 22% on the first ₩${below.toLocaleString()} (= ₩${Math.round(belowTax).toLocaleString()}), plus 33% on the remaining ₩${above.toLocaleString()} (= ₩${Math.round(aboveTax).toLocaleString()}). No further filing needed for this specific income.`
					: `Korea taxes lottery winnings at a flat 22% up to ₩300,000,000 as final withholding (분리과세) — no further filing needed for this specific income.`
			return { withheld, note }
		},
	},
	uk: {
		symbol: "£",
		defaultAmount: 1000000,
		sourceLabel: "HMRC guidance (via The Accountancy Partnership)",
		sourceUrl: "https://www.theaccountancy.co.uk/tax/paying-tax-on-lottery-winnings-279329.html",
		compute(amount) {
			return {
				withheld: 0,
				note: "UK National Lottery winnings are completely tax-free — HMRC treats it as gambling, not income. The lottery duty is already paid by the operator before the prize is ever offered.",
			}
		},
	},
	au: {
		symbol: "A$",
		defaultAmount: 1000000,
		sourceLabel: "The Lott Help Centre (ATO guidance)",
		sourceUrl: "https://help.thelott.com/hc/en-us/articles/115002565674-Do-I-need-to-pay-tax-on-my-winnings",
		compute(amount) {
			return {
				withheld: 0,
				note: "The ATO treats Australian lottery prizes as a windfall gain, not assessable income — so the prize itself is tax-free. Interest or investment income you later earn from it is still taxable.",
			}
		},
	},
}

function updateTaxCalculator() {
	const countrySelect = document.getElementById("taxCountry")
	const amountInput = document.getElementById("taxJackpotAmount")
	const grossEl = document.getElementById("taxGross")
	const withheldEl = document.getElementById("taxWithheld")
	const netEl = document.getElementById("taxNet")
	const noteEl = document.getElementById("taxNote")
	const finalEstimateBox = document.getElementById("taxFinalEstimateBox")
	const finalEstimateEl = document.getElementById("taxFinalEstimate")
	if (!countrySelect || !amountInput || !grossEl || !withheldEl || !netEl || !noteEl) return

	const rule = LOTTERY_TAX_RULES[countrySelect.value]
	if (!rule) return
	const amount = parseNumericField(amountInput, { min: 0 })
	if (amount === null) {
		showToast("Enter a valid jackpot amount.")
		return
	}
	const { withheld, note, finalEstimate } = rule.compute(amount)
	const net = amount - withheld

	grossEl.textContent = `${rule.symbol}${Math.round(amount).toLocaleString()}`
	withheldEl.textContent = `${rule.symbol}${Math.round(withheld).toLocaleString()}`
	netEl.textContent = `${rule.symbol}${Math.round(net).toLocaleString()}`
	noteEl.innerHTML = `${note} Source: <a href="${rule.sourceUrl}" target="_blank" rel="noopener">${rule.sourceLabel}</a>.`

	// "구간별 세율" 실제 최종세액 추정 — 지금은 미국만 별도 표기(withholding=단일세율 24%가
	// 실제 최종세액과 다르다는 걸 숫자로 보여준다). 다른 나라는 원천징수 자체가 이미 최종이라 불필요.
	if (finalEstimateBox && finalEstimateEl) {
		if (typeof finalEstimate === "number") {
			finalEstimateBox.hidden = false
			finalEstimateEl.textContent = `${rule.symbol}${Math.round(finalEstimate).toLocaleString()}`
		} else {
			finalEstimateBox.hidden = true
		}
	}
}
updateTaxCalculator()

/* ============================================================
   게임 선택 카드
   ============================================================ */
/* "Choose a Game" cards write to one hidden preset state so rendered controls and probability logic stay synchronized. */
const GAME_CARD_DESCRIPTIONS = {
	custom: "Make your own scratch ticket — set any top-prize probability by hand.",
	us_scratch5: "Official Texas Lottery Game 2755 printed prize distribution.",
	powerball: "Multi-state jackpot draw game — astronomically low odds.",
	speetto1000: "South Korea's high-denomination instant ticket.",
	speetto2000: "South Korea's icon-matching instant ticket.",
	lucky_fun: "A high-win demo mode — not modeled on any real game.",
}

const SECONDARY_PRESET_KEYS = new Set(["custom", "lucky_fun"])

function renderGameChoiceCards() {
	const primaryContainer = document.getElementById("gameChoiceGrid")
	const secondaryContainer = document.getElementById("secondaryGameChoiceGrid")
	if (!primaryContainer || !secondaryContainer || !$presetState) return
	primaryContainer.innerHTML = ""
	secondaryContainer.innerHTML = ""
	Object.keys(LOTTERY_PRESETS).forEach((key) => {
		const preset = LOTTERY_PRESETS[key]
		const card = document.createElement("button")
		card.type = "button"
		card.className = "game-card"
		card.dataset.presetKey = key
		card.innerHTML = `<span class="game-card-name">${preset.name}</span><span class="game-card-desc">${GAME_CARD_DESCRIPTIONS[key] || ""}</span>`
		card.addEventListener("click", () => {
			$presetState.value = key
			applyPreset(key)
		})
		;(SECONDARY_PRESET_KEYS.has(key) ? secondaryContainer : primaryContainer).appendChild(card)
	})
}

function highlightSelectedGameCard(presetKey) {
	document.querySelectorAll("#gameChoiceGrid .game-card, #secondaryGameChoiceGrid .game-card").forEach((card) => {
		card.classList.toggle("selected", card.dataset.presetKey === presetKey)
	})
	if (SECONDARY_PRESET_KEYS.has(presetKey)) {
		setDisclosureOpen(document.querySelector(".alternate-game-modes"), true)
	}
}

const DEFAULT_PRESET_KEY = "us_scratch5"

const $presetState = document.getElementById("lotteryPreset")
renderGameChoiceCards()

/* ============================================================
   빠른 시뮬레이션 (Fast Simulation)
   ============================================================ */
/* 시뮬레이션 결과 막대그래프 — 티켓 수가 많으면(>30) 막대가 안 읽히므로 집계 텍스트만 표시 */
// 로터리 로그(시계열 선+점)와는 다른 종류의 차트: 등수별 결과 빈도 히스토그램(범주형 분포).
// 개별 티켓 하나당 막대 하나가 아니라 "등수별로 몇 장 나왔는지"를 세므로, 10장이든 1000장이든
// 항상 막대 9개(1~8등 + 낙첨)로만 그려진다 — 배치 크기와 무관하게 항상 차트가 나온다.
// 로터리 로그와 완전히 같은 시각 언어(SVG 선+점, 클릭시 상세보기) — 배치가 커도(1000장) 항상
// 대표성 있게 보이도록, "최근 것만"이 아니라 전체 배치에서 고르게 샘플링한다.
const FAST_SIM_CHART_MAX_POINTS = 60
let fastSimTicketsFull = [] // 이번 배치 전체 티켓(샘플링 전) — 상세보기에서 정확한 회차 번호를 보여주기 위해 보관
let fastSimSampledTickets = [] // 실제로 차트에 그려진(샘플링된) 티켓들
let selectedFastSimIndex = null // fastSimTicketsFull 기준 인덱스

function sampleEvenly(arr, maxCount) {
	if (arr.length <= maxCount) return arr.map((item, i) => ({ item, originalIndex: i }))
	const step = arr.length / maxCount
	const sampled = []
	for (let i = 0; i < maxCount; i++) {
		const originalIndex = Math.min(arr.length - 1, Math.floor(i * step))
		sampled.push({ item: arr[originalIndex], originalIndex })
	}
	return sampled
}

function renderFastSimChart(tickets) {
	const container = document.getElementById("fastSimChart")
	if (!container) return
	fastSimTicketsFull = tickets

	if (!tickets.length) {
		container.innerHTML = `<p class="lottery-log-empty">Run a simulation to see results here.</p>`
		renderFastSimDetail(null)
		return
	}

	const sampled = sampleEvenly(tickets, FAST_SIM_CHART_MAX_POINTS)
	fastSimSampledTickets = sampled
	const values = sampled.map((s) => s.item.net)
	const maxAbs = Math.max(1, ...values.map((v) => Math.abs(v)))

	const width = 600
	const height = 140
	const padX = 16
	const padY = 16
	const midY = height / 2
	const stepX = sampled.length > 1 ? (width - padX * 2) / (sampled.length - 1) : 0

	const coords = values.map((v, i) => {
		const x = padX + stepX * i
		const y = midY - (v / maxAbs) * (midY - padY)
		return { x, y }
	})

	const linePath = coords.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")

	const circles = coords
		.map((p, i) => {
			const ticket = sampled[i].item
			const originalIndex = sampled[i].originalIndex
			const isWin = ticket.rank !== null
			return `<circle
				class="lottery-log-point ${isWin ? "is-win" : "is-lose"} ${originalIndex === selectedFastSimIndex ? "is-selected" : ""}"
				cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5"
				data-ticket-index="${originalIndex}"
				tabindex="0" role="button"
				aria-label="Ticket ${originalIndex + 1}: ${isWin ? `won ${currencySymbol}${ticket.rewardMoney.toLocaleString()}` : "no luck"}"
			><title>Ticket ${originalIndex + 1}: ${isWin ? `Won ${currencySymbol}${ticket.rewardMoney.toLocaleString()}` : "No luck"}</title></circle>`
		})
		.join("")

	container.innerHTML = `
		<svg viewBox="0 0 ${width} ${height}" class="lottery-log-svg" preserveAspectRatio="none" role="img" aria-label="Net result per simulated ticket">
			<line x1="${padX}" y1="${midY}" x2="${width - padX}" y2="${midY}" class="lottery-log-zero-line" />
			<path d="${linePath}" class="lottery-log-line" fill="none" />
			${circles}
		</svg>
		${tickets.length > sampled.length ? `<p class="lottery-log-note">Showing ${sampled.length} evenly sampled tickets out of ${tickets.length.toLocaleString()} simulated.</p>` : ""}
	`

	container.querySelectorAll(".lottery-log-point").forEach((el) => {
		const select = () => {
			selectedFastSimIndex = Number(el.dataset.ticketIndex)
			renderFastSimChart(fastSimTicketsFull)
		}
		el.addEventListener("click", select)
		el.addEventListener("keydown", (e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault()
				select()
			}
		})
	})

	renderFastSimDetail(selectedFastSimIndex)
}

function renderFastSimDetail(index) {
	const detail = document.getElementById("fastSimDetail")
	if (!detail) return
	const ticket = index === null || index === undefined ? null : fastSimTicketsFull[index]
	if (!ticket) {
		detail.innerHTML = ""
		return
	}
	detail.innerHTML = `
		<div class="lottery-log-detail-row"><span class="stat-label">Ticket</span><span>#${index + 1} of ${fastSimTicketsFull.length}</span></div>
		<div class="lottery-log-detail-row"><span class="stat-label">Result</span><span>${ticket.rank ? `${ticket.rank} Prize` : "No luck"}</span></div>
		<div class="lottery-log-detail-row"><span class="stat-label">Prize</span><span>${currencySymbol}${ticket.rewardMoney.toLocaleString()}</span></div>
		<div class="lottery-log-detail-row"><span class="stat-label">Net</span><span class="${ticket.net >= 0 ? "stat-profit-pos" : "stat-profit-neg"}">${ticket.net >= 0 ? "+" : ""}${currencySymbol}${ticket.net.toLocaleString()}</span></div>
	`
	animateSelectedDetail(detail)
}

// Fast Simulation Engine (Monte Carlo)
function clearSimulationOutputs() {
	const fastResult = document.getElementById("fastSimResult")
	const riskResult = document.getElementById("budgetRiskResult")
	const chart = document.getElementById("fastSimChart")
	const detail = document.getElementById("fastSimDetail")
	if (fastResult) {
		fastResult.style.display = "none"
		fastResult.innerHTML = ""
	}
	if (riskResult) {
		riskResult.hidden = true
		riskResult.innerHTML = ""
	}
	if (chart) chart.innerHTML = `<p class="lottery-log-empty">Run a simulation to see results here.</p>`
	if (detail) detail.innerHTML = ""
	fastSimTicketsFull = []
	fastSimSampledTickets = []
	selectedFastSimIndex = null
}

const FAST_SIM_MAX_TICKETS = 100000
const BUDGET_RISK_RUNS = 500
const BUDGET_RISK_MAX_TOTAL_DRAWS = 1000000
const BUDGET_RISK_MIN_RUNS = 50

function runFastSimulation(count, options = {}) {
	if (!Number.isInteger(count) || count < 1 || count > FAST_SIM_MAX_TICKETS) {
		showToast(`Choose between 1 and ${FAST_SIM_MAX_TICKETS.toLocaleString()} tickets.`)
		return false
	}

	const growthMode = options.source === "budget" ? "budget_simulation" : "fast_simulation"
	trackToolStarted(growthMode)

	const simCost = count * ticketCost
	let simPrize = 0
	const tierHits = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0, lose: 0 }
	const tickets = [] // 티켓별 상세(등수/상금/순손익) — 차트/클릭 상세보기용 실측값, 집계 아님
	selectedFastSimIndex = null // 새 배치를 돌리면 이전 선택은 초기화

	for (let i = 0; i < count; i++) {
		const wonRank = drawLotteryResult(prizeThresholds)
		if (wonRank) {
			tierHits[wonRank.rank]++
			simPrize += wonRank.rewardMoney
			tickets.push({ rank: wonRank.rank, rewardMoney: wonRank.rewardMoney, net: wonRank.rewardMoney - ticketCost })
		} else {
			tierHits.lose++
			tickets.push({ rank: null, rewardMoney: 0, net: -ticketCost })
		}
	}

	const netProfit = simPrize - simCost
	const observedReturnPercent = simCost > 0 ? (simPrize / simCost) * 100 : 0
	const { expectedReturnPerTicket, overallReturnPercent: theoreticalReturnPercent } = computeTheoreticalReturn()
	const expectedPrize = expectedReturnPerTicket * count
	const returnGap = observedReturnPercent - theoreticalReturnPercent
	const profitClass = netProfit >= 0 ? "stat-profit-pos" : "stat-profit-neg"
	const requestedBudget = Number(options.requestedBudget)
	const unusedBudget = Number.isFinite(requestedBudget) ? Math.max(0, requestedBudget - simCost) : null

	const resultDiv = document.getElementById("fastSimResult")
	if (resultDiv) {
		resultDiv.style.display = "block"
		resultDiv.innerHTML = `
			<div><strong>Simulated ${count.toLocaleString()} Tickets</strong>${options.source === "budget" ? " from your budget" : ""}</div>
			<div>Total Spent: ${currencySymbol} ${simCost.toLocaleString()}</div>
			${unusedBudget !== null ? `<div>Unused Budget: ${currencySymbol} ${unusedBudget.toLocaleString()}</div>` : ""}
			<div>Total Won: ${currencySymbol} ${simPrize.toLocaleString()}</div>
			<div>Net Profit: <span class="${profitClass}">${currencySymbol} ${netProfit.toLocaleString()}</span></div>
			<div>Observed Return: <strong>${observedReturnPercent.toFixed(1)}%</strong></div>
			<div>Theoretical Return (current model): <strong>${theoreticalReturnPercent.toFixed(1)}%</strong></div>
			<div>Expected Payout at Theoretical Return: ${currencySymbol} ${Math.round(expectedPrize).toLocaleString()}</div>
			<div>Observed vs. Theoretical: <strong>${returnGap >= 0 ? "+" : ""}${returnGap.toFixed(1)} pp</strong></div>
			<div class="fast-sim-tier-summary">
				1st Prize: ${tierHits[1]} | 2nd: ${tierHits[2]} | 3rd: ${tierHits[3]} | 4th+: ${tierHits[4] + tierHits[5] + tierHits[6] + tierHits[7] + tierHits[8]} | No luck: ${tierHits.lose}
			</div>
			<div class="sim-result-actions">
				<button type="button" class="text-link-btn" data-share-fast-sim>Share this simulation</button>
			</div>
		`
		const shareFastSim = resultDiv.querySelector("[data-share-fast-sim]")
		if (shareFastSim) {
			shareFastSim.addEventListener("click", () => {
				shareSimulationResult({
					count,
					simCost,
					simPrize,
					netProfit,
					observedReturnPercent,
					theoreticalReturnPercent,
				})
			})
		}
		offerExperimentSave(resultDiv, {
			type: "fast_simulation",
			params: { count },
			summary: `${count.toLocaleString()} tickets · net ${netProfit >= 0 ? "+" : "−"}${currencySymbol}${Math.abs(netProfit).toLocaleString()} · observed ${observedReturnPercent.toFixed(1)}% vs ${theoreticalReturnPercent.toFixed(1)}% theoretical`,
		})
	}
	renderFastSimChart(tickets)
	animateSimulationOutput()

	// Update cumulative balance as well
	totalCost += simCost
	totalPrize += simPrize
	totalAttempts += count
	saveState()
	updateDisplay()

	trackEvent("run_fast_simulation", {
		ticket_count: count,
		total_cost: simCost,
		total_prize: simPrize,
		observed_return_percent: Number(observedReturnPercent.toFixed(1)),
		theoretical_return_percent: Number(theoreticalReturnPercent.toFixed(1)),
		simulation_source: options.source || "fixed_batch",
	})
	trackValueCompleted(growthMode, {
		ticket_count: count,
		observed_return_percent: Number(observedReturnPercent.toFixed(1)),
	})
	setNextExperimentContext("fast")
	return true
}

function updateSimulationBudgetHint() {
	const input = document.getElementById("simBudgetInput")
	const hint = document.getElementById("simBudgetHint")
	if (!input || !hint) return
	input.placeholder = (ticketCost * 100).toLocaleString()
	hint.textContent = `Current ticket cost: ${currencySymbol}${ticketCost.toLocaleString()}. Budget runs are capped at ${FAST_SIM_MAX_TICKETS.toLocaleString()} tickets.`
}

function getBudgetTicketCount(budget) {
	if (!Number.isFinite(budget) || budget <= 0) {
		showToast("Enter a budget greater than zero.")
		return null
	}
	const count = Math.floor(budget / ticketCost)
	if (count < 1) {
		showToast(`That budget cannot buy one ${currencySymbol}${ticketCost.toLocaleString()} ticket.`)
		return null
	}
	if (count > FAST_SIM_MAX_TICKETS) {
		showToast(`That budget buys ${count.toLocaleString()} tickets. The fast-simulation limit is ${FAST_SIM_MAX_TICKETS.toLocaleString()}.`)
		return null
	}
	return count
}

function runBudgetSimulation() {
	const input = document.getElementById("simBudgetInput")
	if (!input) return
	const budget = parseNumericField(input, { min: 0.01 })
	const count = getBudgetTicketCount(budget)
	if (!count) return
	if (runFastSimulation(count, { source: "budget", requestedBudget: budget })) {
		trackEvent("run_budget_simulation", {
			requested_budget: budget,
			ticket_count: count,
			ticket_cost: ticketCost,
		})
	}
}

function percentileFromSorted(values, percentile) {
	if (!values.length) return 0
	const index = Math.min(values.length - 1, Math.max(0, Math.round((values.length - 1) * percentile)))
	return values[index]
}

function simulateBudgetNet(count) {
	let payout = 0
	for (let i = 0; i < count; i++) {
		const result = drawLotteryResult(prizeThresholds)
		if (result) payout += result.rewardMoney
	}
	return payout - count * ticketCost
}

function runBudgetRiskAnalysis() {
	const input = document.getElementById("simBudgetInput")
	const resultDiv = document.getElementById("budgetRiskResult")
	if (!input || !resultDiv) return
	const budget = parseNumericField(input, { min: 0.01 })
	const count = getBudgetTicketCount(budget)
	if (!count) return
	trackToolStarted("budget_risk")

	const runs = Math.min(BUDGET_RISK_RUNS, Math.floor(BUDGET_RISK_MAX_TOTAL_DRAWS / count))
	if (runs < BUDGET_RISK_MIN_RUNS) {
		const maxTickets = Math.floor(BUDGET_RISK_MAX_TOTAL_DRAWS / BUDGET_RISK_MIN_RUNS)
		showToast(`Risk analysis supports up to ${maxTickets.toLocaleString()} tickets per budget so it can run at least ${BUDGET_RISK_MIN_RUNS} independent budgets.`)
		return
	}

	const nets = new Array(runs)
	let profitable = 0
	let breakevenOrBetter = 0
	let netSum = 0
	for (let run = 0; run < runs; run++) {
		const net = simulateBudgetNet(count)
		nets[run] = net
		netSum += net
		if (net > 0) profitable++
		if (net >= 0) breakevenOrBetter++
	}
	nets.sort((a, b) => a - b)

	const { expectedReturnPerTicket, overallReturnPercent } = computeTheoreticalReturn()
	const spent = count * ticketCost
	const expectedNet = count * (expectedReturnPerTicket - ticketCost)
	const topPrizeProbability = prizeThresholds.length ? prizeThresholds[0].threshold : 0
	const anyPrizeProbability = prizeThresholds.length ? prizeThresholds[prizeThresholds.length - 1].threshold : 0
	const chanceTopPrize = LotteryMathCore.atLeastOne(topPrizeProbability, count)
	const chanceAnyPrize = LotteryMathCore.atLeastOne(anyPrizeProbability, count)
	const formatMoney = (value) => `${value >= 0 ? "+" : "−"}${currencySymbol}${Math.abs(Math.round(value)).toLocaleString()}`

	resultDiv.hidden = false
	resultDiv.innerHTML = `
		<div class="budget-risk-heading"><strong>${runs.toLocaleString()} independent budget runs</strong> · ${count.toLocaleString()} tickets each · ${currencySymbol}${spent.toLocaleString()} spent per run</div>
		<div class="budget-risk-grid">
			<div><span class="stat-label">Profit frequency</span><strong>${((profitable / runs) * 100).toFixed(1)}%</strong></div>
			<div><span class="stat-label">Break-even or better</span><strong>${((breakevenOrBetter / runs) * 100).toFixed(1)}%</strong></div>
			<div><span class="stat-label">Median net</span><strong>${formatMoney(percentileFromSorted(nets, 0.5))}</strong></div>
			<div><span class="stat-label">10th–90th percentile net</span><strong>${formatMoney(percentileFromSorted(nets, 0.1))} to ${formatMoney(percentileFromSorted(nets, 0.9))}</strong></div>
			<div><span class="stat-label">Mean simulated net</span><strong>${formatMoney(netSum / runs)}</strong></div>
			<div><span class="stat-label">Theoretical expected net</span><strong>${formatMoney(expectedNet)}</strong></div>
			<div><span class="stat-label">≥1 prize chance</span><strong>${(chanceAnyPrize * 100).toFixed(2)}%</strong></div>
			<div><span class="stat-label">≥1 top prize chance</span><strong>${(chanceTopPrize * 100).toFixed(6)}%</strong></div>
		</div>
		<p class="sim-budget-hint">Monte Carlo frequencies and percentile ranges are estimates from ${runs.toLocaleString()} independent runs. The theoretical return (${overallReturnPercent.toFixed(1)}%) and exact “at least one” probabilities come directly from the current prize model; none predicts a future ticket.</p>
		<div class="sim-result-actions">
			<button type="button" class="text-link-btn" data-share-budget-risk>Share this analysis</button>
		</div>
	`
	const shareBudgetRisk = resultDiv.querySelector("[data-share-budget-risk]")
	if (shareBudgetRisk) {
		shareBudgetRisk.addEventListener("click", () => {
			shareBudgetRiskResult({
				budget: spent,
				count,
				runs,
				profitFrequency: profitable / runs,
				breakevenFrequency: breakevenOrBetter / runs,
				medianNet: percentileFromSorted(nets, 0.5),
				expectedNet,
			})
		})
	}
	offerExperimentSave(resultDiv, {
		type: "budget_risk",
		params: { budget },
		summary: `${runs.toLocaleString()} runs · ${count.toLocaleString()} tickets each · profit ${((profitable / runs) * 100).toFixed(1)}% · median ${formatMoney(percentileFromSorted(nets, 0.5))}`,
	})

	trackEvent("run_budget_risk_analysis", {
		requested_budget: budget,
		ticket_count: count,
		runs,
		profit_frequency_percent: Number(((profitable / runs) * 100).toFixed(1)),
		breakeven_frequency_percent: Number(((breakevenOrBetter / runs) * 100).toFixed(1)),
	})
	trackValueCompleted("budget_risk", {
		ticket_count: count,
		runs,
	})
	setNextExperimentContext("budget_risk")
}

const $sim10 = document.getElementById("sim10Btn")
const $sim100 = document.getElementById("sim100Btn")
const $sim1000 = document.getElementById("sim1000Btn")
const $simBudget = document.getElementById("simBudgetBtn")
const $simBudgetRisk = document.getElementById("simBudgetRiskBtn")

if ($sim10) $sim10.addEventListener("click", () => runFastSimulation(10))
if ($sim100) $sim100.addEventListener("click", () => runFastSimulation(100))
if ($sim1000) $sim1000.addEventListener("click", () => runFastSimulation(1000))
if ($simBudget) $simBudget.addEventListener("click", runBudgetSimulation)
if ($simBudgetRisk) $simBudgetRisk.addEventListener("click", runBudgetRiskAnalysis)
updateSimulationBudgetHint()

/* ============================================================
   Experiment Lab — route existing verified tools into follow-up questions.
   No separate probability engine and no server-backed fake community data.
   ============================================================ */
const EXPERIMENT_LAB_STORAGE_KEY = "scratchLotteryExperimentsV1"
const EXPERIMENT_LAB_MAX_SAVED = 12
const EXPERIMENT_LABELS = Object.freeze({
	exact_odds: "Exact multi-ticket odds",
	fast_simulation: "Fast simulation",
	budget_risk: "Budget risk",
	long_run: "Long-run projection",
})

const NEXT_EXPERIMENT_CONTEXTS = Object.freeze({
	initial: {
		question: "What changes when one ticket becomes ten?",
		reason: "Start with exact probability, then compare it with a noisy simulated batch.",
		actions: [
			{ id: "exact10", label: "Calculate 10-ticket odds", primary: true },
			{ id: "fast100", label: "Run 100 tickets" },
		],
	},
	scratch: {
		question: "What changes when one ticket becomes ten?",
		reason: "Move from one random result to exact multi-ticket probability before drawing broader conclusions.",
		actions: [
			{ id: "exact10", label: "Calculate 10-ticket odds", primary: true },
			{ id: "fast100", label: "Run 100 tickets" },
		],
	},
	exact: {
		question: "Does the exact expectation show up in one random batch?",
		reason: "A simulated batch shows how far a short run can land from the exact expectation.",
		actions: [
			{ id: "fast100", label: "Run 100 tickets", primary: true },
			{ id: "budget10x500", label: "Repeat a 10-ticket budget 500 times" },
		],
	},
	fast: {
		question: "Was that batch typical, or just sampling noise?",
		reason: "Repeat the same-sized budget hundreds of times to see a distribution instead of one outcome.",
		actions: [
			{ id: "budget10x500", label: "Analyze 500 budget runs", primary: true },
			{ id: "exact10", label: "Check exact 10-ticket odds" },
		],
	},
	budget_risk: {
		question: "What does the same math look like over a real playing schedule?",
		reason: "Project a weekly habit into total spend, expected loss and top-prize probability.",
		actions: [
			{ id: "long5x1", label: "Project 5 tickets/week for 1 year", primary: true },
			{ id: "exact10", label: "Check exact 10-ticket odds" },
		],
	},
	long_run: {
		question: "How different can a short run look from that long-run expectation?",
		reason: "Run one finite batch, then compare its observed return with the model average.",
		actions: [
			{ id: "fast100", label: "Run 100 tickets", primary: true },
			{ id: "budget10x500", label: "Analyze 500 budget runs" },
		],
	},
})

function experimentPresetContext() {
	const presetKey = currentGrowthPreset()
	return {
		presetKey,
		presetName: LOTTERY_PRESETS[presetKey]?.name || "Current model",
		customProbabilityPercent: presetKey === "custom" ? Number((p1 * 100).toFixed(8)) : null,
	}
}

function normalizeSavedExperiment(item) {
	if (!item || typeof item !== "object" || !EXPERIMENT_LABELS[item.type]) return null
	if (!item.params || typeof item.params !== "object") return null
	if (!LOTTERY_PRESETS[item.presetKey]) return null
	return {
		id: typeof item.id === "string" ? item.id : "",
		version: 1,
		type: item.type,
		params: item.params,
		summary: typeof item.summary === "string" ? item.summary : "",
		presetKey: item.presetKey,
		presetName: typeof item.presetName === "string" ? item.presetName : LOTTERY_PRESETS[item.presetKey].name,
		customProbabilityPercent:
			item.customProbabilityPercent !== null &&
			item.customProbabilityPercent !== "" &&
			Number.isFinite(Number(item.customProbabilityPercent))
				? Number(item.customProbabilityPercent)
				: null,
		savedAt: typeof item.savedAt === "string" ? item.savedAt : "",
	}
}

function readSavedExperiments() {
	try {
		const raw = localStorage.getItem(EXPERIMENT_LAB_STORAGE_KEY)
		if (!raw) return []
		const parsed = JSON.parse(raw)
		if (!Array.isArray(parsed)) return []
		return parsed
			.map(normalizeSavedExperiment)
			.filter(Boolean)
			.slice(0, EXPERIMENT_LAB_MAX_SAVED)
	} catch {
		return []
	}
}

function persistSavedExperiments(items) {
	try {
		localStorage.setItem(EXPERIMENT_LAB_STORAGE_KEY, JSON.stringify(items.slice(0, EXPERIMENT_LAB_MAX_SAVED)))
		return true
	} catch {
		showToast("This browser could not save My Lab.")
		return false
	}
}

function enrichExperimentSnapshot(snapshot) {
	const context = snapshot.presetKey ? snapshot : { ...snapshot, ...experimentPresetContext() }
	return {
		...context,
		id: context.id || "exp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7),
		version: 1,
		savedAt: context.savedAt || new Date().toISOString(),
	}
}

function saveExperiment(snapshot) {
	if (!snapshot || !EXPERIMENT_LABELS[snapshot.type]) return false
	const saved = enrichExperimentSnapshot(snapshot)
	const items = readSavedExperiments().filter((item) => item.id !== saved.id)
	items.unshift(saved)
	if (!persistSavedExperiments(items)) return false
	renderSavedExperiments()
	trackEvent("experiment_saved", {
		experiment_type: saved.type,
		preset_name: saved.presetKey,
	})
	showToast("Saved to My Lab on this device.")
	return true
}

function formatSavedExperimentDate(value) {
	const date = new Date(value)
	if (Number.isNaN(date.getTime())) return "Saved locally"
	return "Saved " + date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
}

function renderSavedExperiments() {
	const list = document.getElementById("savedExperimentList")
	const count = document.getElementById("labSavedCount")
	const clear = document.getElementById("clearSavedExperiments")
	if (!list || !count || !clear) return

	const items = readSavedExperiments()
	count.textContent = items.length === 1 ? "1 saved on this device" : items.length + " saved on this device"
	clear.hidden = items.length === 0
	list.replaceChildren()

	if (!items.length) {
		const empty = document.createElement("p")
		empty.className = "lottery-log-empty"
		empty.textContent = "No saved experiments yet."
		list.appendChild(empty)
		return
	}

	items.forEach((item) => {
		const row = document.createElement("div")
		row.className = "saved-experiment-row"

		const copy = document.createElement("div")
		copy.className = "saved-experiment-copy"

		const title = document.createElement("strong")
		title.textContent = EXPERIMENT_LABELS[item.type]

		const meta = document.createElement("span")
		meta.className = "saved-experiment-meta"
		meta.textContent = item.presetName + " · " + formatSavedExperimentDate(item.savedAt)

		const summary = document.createElement("span")
		summary.className = "saved-experiment-summary"
		summary.textContent = item.summary

		copy.append(title, meta, summary)

		const actions = document.createElement("div")
		actions.className = "saved-experiment-actions"

		const restore = document.createElement("button")
		restore.type = "button"
		restore.className = "text-link-btn"
		restore.textContent = "Run again"
		restore.addEventListener("click", () => {
			runExperimentSnapshot(item, "saved")
		})

		const remove = document.createElement("button")
		remove.type = "button"
		remove.className = "text-link-btn"
		remove.textContent = "Remove"
		remove.addEventListener("click", () => {
			const next = readSavedExperiments().filter((saved) => saved.id !== item.id)
			if (!persistSavedExperiments(next)) return
			renderSavedExperiments()
			trackEvent("experiment_removed", { experiment_type: item.type })
		})

		actions.append(restore, remove)
		row.append(copy, actions)
		list.appendChild(row)
	})
}

function offerExperimentSave(container, snapshot) {
	if (!container || !snapshot || !EXPERIMENT_LABELS[snapshot.type]) return
	const existing = container.querySelector("[data-save-experiment]")
	if (existing) existing.remove()

	let actions = container.querySelector(".sim-result-actions")
	if (!actions) {
		actions = document.createElement("div")
		actions.className = "sim-result-actions"
		container.appendChild(actions)
	}

	const captured = enrichExperimentSnapshot({ ...snapshot, ...experimentPresetContext(), id: "", savedAt: "" })
	const button = document.createElement("button")
	button.type = "button"
	button.className = "text-link-btn"
	button.dataset.saveExperiment = captured.type
	button.textContent = "Save to My Lab"
	button.addEventListener("click", () => {
		if (!saveExperiment(captured)) return
		button.textContent = "Saved"
		button.disabled = true
	})
	actions.appendChild(button)
}

function restoreExperimentPreset(snapshot) {
	const presetKey = snapshot.presetKey
	if (!LOTTERY_PRESETS[presetKey]) return false

	if (presetKey === "custom" && Number.isFinite(snapshot.customProbabilityPercent)) {
		const input = document.getElementById("probabilityInput")
		const currentProbabilityPercent = p1 * 100
		const alreadyCurrent =
			currentGrowthPreset() === "custom" &&
			Math.abs(currentProbabilityPercent - snapshot.customProbabilityPercent) < 1e-10
		if (input) input.value = String(snapshot.customProbabilityPercent)
		if (alreadyCurrent) return true
		if ($presetState) $presetState.value = "custom"
		applyProbability({ activateCustom: true })
		return true
	}

	if (currentGrowthPreset() !== presetKey) {
		if ($presetState) $presetState.value = presetKey
		applyPreset(presetKey, false, false)
	}
	return true
}

function scrollExperimentTarget(id) {
	const target = document.getElementById(id)
	if (!target) return
	target.scrollIntoView({
		behavior: typeof motionEnabled === "function" && motionEnabled() ? "smooth" : "auto",
		block: "start",
	})
}

function runExperimentSnapshot(snapshot, source = "lab") {
	if (!snapshot || !EXPERIMENT_LABELS[snapshot.type]) return false
	if (!restoreExperimentPreset(snapshot)) return false

	let ran = false
	let targetId = "experimentLab"

	if (snapshot.type === "exact_odds") {
		const input = document.getElementById("exactOddsTicketsInput")
		const count = Number(snapshot.params.count)
		if (input && Number.isInteger(count) && count > 0) input.value = String(count)
		ran = updateExactMultiTicketOdds(true)
		targetId = "simCard"
	} else if (snapshot.type === "fast_simulation") {
		const count = Number(snapshot.params.count)
		ran = Number.isInteger(count) ? runFastSimulation(count) : false
		targetId = "simCard"
	} else if (snapshot.type === "budget_risk") {
		const input = document.getElementById("simBudgetInput")
		const budget = Number(snapshot.params.budget)
		if (input && Number.isFinite(budget) && budget > 0) input.value = String(budget)
		if (Number.isFinite(budget) && budget > 0) {
			runBudgetRiskAnalysis()
			ran = true
		}
		targetId = "simCard"
	} else if (snapshot.type === "long_run") {
		const perWeekInput = document.getElementById("longRunPerWeek")
		const yearsInput = document.getElementById("longRunYears")
		const perWeek = Number(snapshot.params.perWeek)
		const years = Number(snapshot.params.years)
		if (perWeekInput && Number.isInteger(perWeek) && perWeek > 0) perWeekInput.value = String(perWeek)
		if (yearsInput && Number.isInteger(years) && years > 0) yearsInput.value = String(years)
		if (Number.isInteger(perWeek) && Number.isInteger(years)) {
			updateLongRunProjection({ track: true })
			ran = true
		}
		targetId = "longRunCard"
	}

	if (!ran) return false

	trackEvent("experiment_run", {
		experiment_type: snapshot.type,
		experiment_source: source,
		preset_name: currentGrowthPreset(),
	})
	scrollExperimentTarget(targetId)
	return true
}

function curatedExperimentSnapshot(id) {
	if (id === "exact10") return { type: "exact_odds", params: { count: 10 } }
	if (id === "fast100") return { type: "fast_simulation", params: { count: 100 } }
	if (id === "budget10x500") return { type: "budget_risk", params: { budget: ticketCost * 10 } }
	if (id === "long5x1") return { type: "long_run", params: { perWeek: 5, years: 1 } }
	return null
}

function runCuratedExperiment(id, source = "lab") {
	const snapshot = curatedExperimentSnapshot(id)
	if (!snapshot) return false
	trackEvent("experiment_selected", {
		experiment_id: id,
		experiment_source: source,
		preset_name: currentGrowthPreset(),
	})
	return runExperimentSnapshot({ ...snapshot, ...experimentPresetContext() }, source)
}

function setNextExperimentContext(context) {
	const config = NEXT_EXPERIMENT_CONTEXTS[context] || NEXT_EXPERIMENT_CONTEXTS.initial
	const question = document.getElementById("nextExperimentQuestion")
	const reason = document.getElementById("nextExperimentReason")
	const actions = document.getElementById("nextExperimentActions")
	if (!question || !reason || !actions) return

	question.textContent = config.question
	reason.textContent = config.reason
	actions.replaceChildren()

	config.actions.forEach((action) => {
		const button = document.createElement("button")
		button.type = "button"
		button.className = action.primary ? "btn-secondary" : "text-link-btn"
		button.dataset.experimentId = action.id
		button.dataset.experimentSource = "next"
		button.textContent = action.label
		actions.appendChild(button)
	})
}

let clearSavedExperimentsTimer = null

function resetClearSavedExperimentsButton() {
	const button = document.getElementById("clearSavedExperiments")
	if (!button) return
	clearTimeout(clearSavedExperimentsTimer)
	clearSavedExperimentsTimer = null
	button.classList.remove("is-confirming")
	button.textContent = "Clear saved"
}

function requestClearSavedExperiments() {
	const button = document.getElementById("clearSavedExperiments")
	if (!button) return

	if (!button.classList.contains("is-confirming")) {
		button.classList.add("is-confirming")
		button.textContent = "Confirm clear"
		clearSavedExperimentsTimer = setTimeout(resetClearSavedExperimentsButton, 6000)
		return
	}

	resetClearSavedExperimentsButton()
	try {
		localStorage.removeItem(EXPERIMENT_LAB_STORAGE_KEY)
		renderSavedExperiments()
		trackEvent("experiment_lab_cleared")
		showToast("My Lab was cleared on this device.")
	} catch {
		showToast("This browser could not clear My Lab.")
	}
}

function initExperimentLab() {
	const lab = document.getElementById("experimentLab")
	if (lab) {
		lab.addEventListener("click", (event) => {
			const button = event.target.closest("[data-experiment-id]")
			if (!button || !lab.contains(button)) return
			runCuratedExperiment(button.dataset.experimentId, button.dataset.experimentSource || "lab")
		})
	}

	const clear = document.getElementById("clearSavedExperiments")
	if (clear) clear.addEventListener("click", requestClearSavedExperiments)

	const modalExperiment = document.getElementById("modalExperimentBtn")
	if (modalExperiment) {
		modalExperiment.addEventListener("click", () => {
			modalReturnFocus = document.getElementById("exactOddsTicketsInput")
			closeJackpotModal()
			runCuratedExperiment("exact10", "result_modal")
		})
	}

	setNextExperimentContext("initial")
	renderSavedExperiments()
}

// Search landing stays on the proven scratch-off intent. Attributable share links may
// restore a known non-custom preset so recipients see the context that was shared.
if ($presetState) {
	const requestedPreset = new URLSearchParams(window.location.search).get("preset")
	const landingPreset =
		requestedPreset && requestedPreset !== "custom" && LOTTERY_PRESETS[requestedPreset]
			? requestedPreset
			: DEFAULT_PRESET_KEY
	$presetState.value = landingPreset
	applyPreset(landingPreset, false, false)
}
initExperimentLab()

/* ============================================================
   결과 공유 — 가치 순간에서 바로 공유하고, 데스크톱에서는 링크를 복사한다.
   ============================================================ */
const SHARE_BASE_URL = "https://saramjh.github.io/scratchLottery/"

function shareReferralUrl(campaign) {
	const presetKey = currentGrowthPreset()
	const shareablePreset = presetKey !== "custom" && LOTTERY_PRESETS[presetKey] ? presetKey : null
	const presetParam = shareablePreset ? `preset=${encodeURIComponent(shareablePreset)}&` : ""
	return `${SHARE_BASE_URL}?${presetParam}utm_source=share&utm_medium=referral&utm_campaign=${encodeURIComponent(campaign)}&utm_content=${encodeURIComponent(presetKey)}`
}

async function copyShareText(text) {
	if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
		await navigator.clipboard.writeText(text)
		return true
	}
	const textarea = document.createElement("textarea")
	textarea.value = text
	textarea.setAttribute("readonly", "")
	textarea.style.position = "fixed"
	textarea.style.opacity = "0"
	document.body.appendChild(textarea)
	textarea.select()
	const copied = document.execCommand("copy")
	textarea.remove()
	return copied
}

async function shareResult({ text, campaign, blob = null, filename = "scratch-lottery-summary.png" }) {
	const url = shareReferralUrl(campaign)
	const presetName = currentGrowthPreset()
	trackEvent("share_attempt", { campaign, preset_name: presetName })

	try {
		if (blob && typeof File === "function" && navigator.share && navigator.canShare) {
			const file = new File([blob], filename, { type: blob.type || "image/png" })
			const fileData = { files: [file], title: "Scratch Off Simulator", text, url }
			if (navigator.canShare(fileData)) {
				await navigator.share(fileData)
				trackEvent("share_completed", { campaign, method: "native_file", preset_name: presetName })
				return true
			}
		}

		if (navigator.share) {
			await navigator.share({ title: "Scratch Off Simulator", text, url })
			trackEvent("share_completed", { campaign, method: "native_link", preset_name: presetName })
			return true
		}

		const copied = await copyShareText(`${text}\n${url}`)
		if (copied) {
			showToast("Result and referral link copied.")
			trackEvent("share_completed", { campaign, method: "clipboard", preset_name: presetName })
			return true
		}
	} catch (error) {
		if (error?.name === "AbortError") {
			trackEvent("share_cancelled", { campaign, preset_name: presetName })
			return false
		}
	}

	showToast("Sharing is unavailable in this browser.")
	trackEvent("share_failed", { campaign, preset_name: presetName })
	return false
}

function currentPresetDisplayName() {
	const preset = LOTTERY_PRESETS[currentGrowthPreset()]
	return preset?.name || "current scratch-off model"
}

function shareSimulationResult({ count, simCost, simPrize, netProfit, observedReturnPercent, theoreticalReturnPercent }) {
	const sign = netProfit >= 0 ? "+" : "−"
	const text = `I simulated ${count.toLocaleString()} ${currentPresetDisplayName()} tickets: spent ${currencySymbol}${simCost.toLocaleString()}, won ${currencySymbol}${simPrize.toLocaleString()}, net ${sign}${currencySymbol}${Math.abs(netProfit).toLocaleString()}, observed return ${observedReturnPercent.toFixed(1)}% vs ${theoreticalReturnPercent.toFixed(1)}% theoretical. Simulation only — no real money.`
	void shareResult({ text, campaign: "simulation_result" })
}

function shareBudgetRiskResult({ budget, count, runs, profitFrequency, breakevenFrequency, medianNet, expectedNet }) {
	const money = (value) => `${value >= 0 ? "+" : "−"}${currencySymbol}${Math.abs(Math.round(value)).toLocaleString()}`
	const text = `I tested ${runs.toLocaleString()} independent ${currencySymbol}${budget.toLocaleString()} budgets on ${currentPresetDisplayName()} (${count.toLocaleString()} tickets each): profit in ${(profitFrequency * 100).toFixed(1)}% of runs, break-even or better in ${(breakevenFrequency * 100).toFixed(1)}%, median net ${money(medianNet)}, theoretical expected net ${money(expectedNet)}. Simulation only — no real money.`
	void shareResult({ text, campaign: "budget_risk_result" })
}

async function generateShareCard() {
	const cardCanvas = document.createElement("canvas")
	cardCanvas.width = 600
	cardCanvas.height = 400
	const ctx = cardCanvas.getContext("2d")
	if (!ctx) return

	ctx.fillStyle = "#111"
	ctx.fillRect(0, 0, 600, 400)
	ctx.strokeStyle = "#e0b847"
	ctx.lineWidth = 4
	ctx.strokeRect(10, 10, 580, 380)

	ctx.fillStyle = "#e0b847"
	ctx.font = '700 26px "IBM Plex Sans", sans-serif'
	ctx.textAlign = "center"
	ctx.fillText("Scratch Off Simulator", 300, 60)
	ctx.font = "15px sans-serif"
	ctx.fillStyle = "#aaa"
	ctx.fillText(currentPresetDisplayName(), 300, 88)

	ctx.textAlign = "left"
	ctx.font = "20px sans-serif"
	ctx.fillStyle = "#fff"
	const totalProfit = totalPrize - totalCost
	const lines = [
		`Tickets Simulated: ${totalAttempts.toLocaleString()}`,
		`Total Spent: ${currencySymbol}${totalCost.toLocaleString()}`,
		`Total Won: ${currencySymbol}${totalPrize.toLocaleString()}`,
		`Net: ${totalProfit >= 0 ? "+" : "−"}${currencySymbol}${Math.abs(totalProfit).toLocaleString()}`,
		`Best Win: ${bestWinAmount > 0 ? `${bestWinLabel} — ${currencySymbol}${bestWinAmount.toLocaleString()}` : "—"}`,
	]
	lines.forEach((line, i) => ctx.fillText(line, 60, 150 + i * 40))

	ctx.font = "13px sans-serif"
	ctx.fillStyle = "#777"
	ctx.textAlign = "center"
	ctx.fillText("Simulation only · no real money · saramjh.github.io/scratchLottery", 300, 370)

	const blob = await new Promise((resolve) => cardCanvas.toBlob(resolve, "image/png"))
	const text = `My ${currentPresetDisplayName()} simulation session: ${totalAttempts.toLocaleString()} tickets, ${currencySymbol}${totalCost.toLocaleString()} spent, ${currencySymbol}${totalPrize.toLocaleString()} won, net ${totalProfit >= 0 ? "+" : "−"}${currencySymbol}${Math.abs(totalProfit).toLocaleString()}. Simulation only — no real money.`
	trackEvent("share_result_card", { total_attempts: totalAttempts })
	await shareResult({ text, campaign: "session_result", blob })
}

const $shareCardBtn = document.getElementById("shareCardBtn")
if ($shareCardBtn) $shareCardBtn.addEventListener("click", generateShareCard)

