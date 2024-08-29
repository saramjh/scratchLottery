// 모달 요소
// 모달 관련 요소 선택
const modal = document.getElementById("jackpotModal")
const closeModal = document.querySelector(".modal .close")
const jackpotMessage = document.getElementById("jackpotMessage")
/* 스크래치 커버 만들기 시작 */

const $canvas = document.getElementById("greyCover")
const context = $canvas.getContext("2d")
const WIDTH = 400
const HEIGHT = 200
const dpr = window.devicePixelRatio

const ERASE_RADIUS = 30
const ERASE_DISTANCE = ERASE_RADIUS / 2

const col = Math.ceil(WIDTH / (ERASE_RADIUS * 2 + ERASE_DISTANCE))
const row = Math.ceil(HEIGHT / (ERASE_RADIUS * 2 + ERASE_DISTANCE))

let thresholdOfEraseCount = col * row
let erasedList = []
let isDrawing = false
let isRevealed = false
let isPrizeAwarded = false

const initCanvas = () => {
	$canvas.style.width = `${WIDTH}px`
	$canvas.style.height = `${HEIGHT}px`
	$canvas.width = WIDTH * dpr
	$canvas.height = HEIGHT * dpr
	context.scale(dpr, dpr)

	context.strokeStyle = "#999"
	context.fillStyle = "#999"
	context.beginPath()
	context.roundRect(0, 0, WIDTH, HEIGHT, 8)
	context.stroke()
	context.fill()

	context.font = "20px neodgm"
	context.fillStyle = "#000"
	context.textAlign = "center"
	context.textBaseline = "middle"
	context.fillText("여기를 긁어보세요", WIDTH / 2, HEIGHT / 2)
}

initCanvas()

const { top: canvasTop, left: canvasLeft } = $canvas.getBoundingClientRect()

const drawTransparentCircle = (x, y) => {
	context.save()
	context.globalCompositeOperation = "destination-out"
	context.beginPath()
	context.arc(x, y, ERASE_RADIUS, 0, 2 * Math.PI, false)
	context.fill()
	context.closePath()
	context.restore()

	const checkList = erasedList.filter(({ x: posX, y: posY }) => {
		const distX = posX - x
		const distY = posY - y
		return Math.sqrt(distX * distX + distY * distY) < ERASE_RADIUS + ERASE_DISTANCE
	})

	if (!checkList.length) {
		erasedList.push({ x, y })
	}
}

const handleDrawingStart = (event) => {
	isDrawing = true
	const { offsetX, offsetY } = getMouseOrTouchPosition(event)
	drawTransparentCircle(offsetX, offsetY)
	// 터치가 시작될 때 스크롤 비활성화
	document.body.style.overflow = "hidden"
}

const handleDrawing = (event) => {
	if (!isDrawing) return
	const { offsetX, offsetY } = getMouseOrTouchPosition(event)
	drawTransparentCircle(offsetX, offsetY)

	if (erasedList.length >= thresholdOfEraseCount) {
		if (!isRevealed && !isPrizeAwarded) {
			context.clearRect(0, 0, WIDTH, HEIGHT)
			isRevealed = true
			isPrizeAwarded = true
			updateDisplay()
			showJackpotModal(jackpotLevel)
			totalCost += 1000
		}
	}
}

const handleDrawingEnd = () => {
	isDrawing = false
	// 터치가 끝나면 스크롤 활성화
	document.body.style.overflow = "auto"
}

const getMouseOrTouchPosition = (event) => {
	let offsetX, offsetY
	if (event.touches) {
		const touch = event.touches[0]
		offsetX = touch.pageX - canvasLeft
		offsetY = touch.pageY - canvasTop
	} else {
		offsetX = event.offsetX
		offsetY = event.offsetY
	}
	return { offsetX, offsetY }
}

// 마우스 이벤트 추가
$canvas.addEventListener("mousedown", handleDrawingStart)
$canvas.addEventListener("mousemove", handleDrawing)
$canvas.addEventListener("mouseup", handleDrawingEnd)

// 터치 이벤트 추가
$canvas.addEventListener("touchstart", handleDrawingStart)
$canvas.addEventListener("touchmove", handleDrawing)
$canvas.addEventListener("touchend", handleDrawingEnd)

/* 스크래치 커버 만들기 끝 */
function calculatePrizeProbabilities(P1) {
	const remainingProbability = 1 - parseFloat(P1) // 나머지 확률
	const fibonacci = [1, 2, 3, 5, 8, 13, 21, 34] // 1단계를 제외한 피보나치수열
	const T = fibonacci.reduce((sum, f) => sum + f, 0) // 피보나치 수열의 총합

	const probabilities = fibonacci.map((f, index) => {
		// 각 등수별 당첨확률 계산해서 배열에 저장
		// 1등의 확률은 P1로 설정
		if (index === 0) {
			return P1
		} else {
			// 2등부터의 확률 계산
			return P1 + (remainingProbability * f) / T
		}
	})

	// 확률 적용
	for (let i = 0; i < prizeThresholds.length; i++) {
		prizeThresholds[i].threshold = probabilities[i]
	}
}

// 등수별 확률계산
let prizeThresholds = [
	{ rank: 1, rewardMoney: 1000000000, threshold: 0.2 }, // 1등 20% 확률
	{ rank: 2, rewardMoney: 100000000, threshold: 0.2113 }, // 2등 21.13% 확률
	{ rank: 3, rewardMoney: 11000000, threshold: 0.217 }, // 3등 21.70% 확률
	{ rank: 4, rewardMoney: 20000, threshold: 0.284 }, // 4등 22.84% 확률
	{ rank: 5, rewardMoney: 4000, threshold: 0.2452 }, // 5등 24.52% 확률
	{ rank: 6, rewardMoney: 2000, threshold: 0.2738 }, // 6등 27.38% 확률
	{ rank: 7, rewardMoney: 1000, threshold: 0.3191 }, // 7등 31.91% 확률
	{ rank: 8, rewardMoney: 500, threshold: 0.3926 }, // 8등 39.26% 확률
]

function getRandomPrize(prizeThresholds) {
	// 각 등수의 threshold에 대해 랜덤 함수를 적용
	for (let i = 0; i < prizeThresholds.length; i++) {
		const threshold = prizeThresholds[i].threshold
		const randomNumber = Math.random() // 0과 1 사이의 랜덤 숫자 생성
		if (randomNumber < threshold) {
			// 당첨된 경우
			jackpot[i].rank = prizeThresholds[i].rank
			jackpot[i].jackpot = 1
		} else {
			// 당첨안된 경우
			jackpot[i].rank = prizeThresholds[i].rank
			jackpot[i].jackpot = 0
		}
	}
}

// 당첨결과를 담을 jackopt
let jackpot = [
	{ rank: 1, num: 10, rewardMoney: 1000000000, jackpot: 0 }, // 1등 20% 확률
	{ rank: 2, num: 8, rewardMoney: 100000000, jackpot: 0 }, // 2등 21.13% 확률
	{ rank: 3, num: 7, rewardMoney: 11000000, jackpot: 0 }, // 3등 21.70% 확률
	{ rank: 4, num: 6, rewardMoney: 20000, jackpot: 0 }, // 4등 22.84% 확률
	{ rank: 5, num: 5, rewardMoney: 4000, jackpot: 0 }, // 5등 24.52% 확률
	{ rank: 6, num: 4, rewardMoney: 2000, jackpot: 0 }, // 6등 27.38% 확률
	{ rank: 7, num: 3, rewardMoney: 1000, jackpot: 0 }, // 7등 31.91% 확률
	{ rank: 8, num: 2, rewardMoney: 500, jackpot: 0 }, // 8등 39.26% 확률
]

// 가장 높은 등수 추출
function findLowestRankWithJackpotOne(jackpot) {
	// jackpot 값이 1인 객체들만 필터링
	const filteredPrizes = jackpot.filter((prize) => prize.jackpot === 1)
	console.log(filteredPrizes)
	// jackpot 값이 1인 객체가 하나도 없으면 null 반환
	if (filteredPrizes.length === 0) {
		return null
	}

	// rank 8인 객체만 jackpot 값이 1인 경우
	const rank8Prize = filteredPrizes.find((prize) => prize.rank === 8)
	if (filteredPrizes.length === 1 && rank8Prize) {
		return rank8Prize
	}

	// rank가 연속적으로 증가하는지 확인하는 함수
	const isConsecutiveRanks = (prizes) => {
		const sortedPrizes = prizes.slice().sort((a, b) => a.rank - b.rank)
		for (let i = 1; i < sortedPrizes.length; i++) {
			if (sortedPrizes[i].rank !== sortedPrizes[i - 1].rank + 1) {
				return false
			}
		}
		return true
	}

	// rank가 8인 객체를 포함하고, 모든 rank가 연속적으로 증가하는지 확인
	if (rank8Prize && isConsecutiveRanks(filteredPrizes)) {
		// 가장 낮은 rank 값을 가진 객체 찾기
		const lowestRankPrize = filteredPrizes.reduce((min, prize) => {
			return prize.rank < min.rank ? prize : min
		})
		return lowestRankPrize
	}

	// 위 조건에 맞지 않는 경우 null 반환
	return null
}

const numSup = { 1: "일", 2: "이", 3: "삼", 4: "사", 5: "오", 6: "육", 7: "칠", 8: "팔", 9: "구", 0: "영" }

function populateGridCells(jackpotLevel) {
	const gridCells = document.querySelectorAll(".grid-cell") // 10개의 그리드셀을 선택
	const availableNumbers = Array.from({ length: 10 }, (_, i) => i) // 0부터 9까지의 숫자 배열

	if (jackpotLevel) {
		// 당첨된 경우
		const chosenNumber = Math.floor(Math.random() * 10) // 0~9 중 랜덤한 숫자 선택
		const chosenIndices = [] // 선택된 셀의 인덱스를 저장

		// jackpotLevel.num의 수만큼 그리드 셀에 chosenNumber 배치
		for (let i = 0; i < jackpotLevel.num; i++) {
			let randomIndex
			do {
				randomIndex = Math.floor(Math.random() * gridCells.length)
			} while (chosenIndices.includes(randomIndex)) // 중복된 인덱스가 나오지 않도록 처리

			gridCells[randomIndex].innerHTML = `<span>${chosenNumber}<sup>${numSup[chosenNumber]}</sup></span>` // 선택된 숫자 삽입
			gridCells[randomIndex].classList.add("chosen")

			chosenIndices.push(randomIndex) // 선택된 인덱스 저장
		}

		// 나머지 셀에 중복되지 않는 숫자들 배치
		const remainingNumbers = availableNumbers.filter((num) => num !== chosenNumber) // chosenNumber 제외한 숫자들
		let remainingIndex = 0
		for (let i = 0; i < gridCells.length; i++) {
			if (!chosenIndices.includes(i)) {
				gridCells[i].innerHTML = `<span>${remainingNumbers[remainingIndex]}<sup>${numSup[remainingNumbers[remainingIndex]]}</sup></span>`
				gridCells[i].classList.remove("chosen")
				remainingIndex++
			}
		}
	} else {
		// 당첨되지 않은 경우: 중복되지 않는 숫자들만 랜덤하게 배치
		availableNumbers.sort(() => Math.random() - 0.5) // 숫자들을 랜덤하게 섞기

		for (let i = 0; i < gridCells.length; i++) {
			gridCells[i].innerHTML = `<span>${availableNumbers[i]}<sup>${numSup[availableNumbers[i]]}</sup></span>`
			gridCells[i].classList.remove("chosen")
		}
	}
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
	rankHeader.textContent = "등수"
	const probabilityHeader = document.createElement("th")
	probabilityHeader.textContent = "당첨확률"
	const rewardHeader = document.createElement("th")
	rewardHeader.textContent = "당첨금"

	headerRow.appendChild(rankHeader)
	headerRow.appendChild(probabilityHeader)
	headerRow.appendChild(rewardHeader)
	thead.appendChild(headerRow)
	table.appendChild(thead)

	// 테이블 바디 생성
	const tbody = document.createElement("tbody")

	// prizeThresholds 데이터를 순회하면서 각 등수와 확률 및 당첨금을 테이블에 추가
	prizeThresholds.forEach((tier) => {
		const row = document.createElement("tr")

		const rankCell = document.createElement("td")
		rankCell.textContent = `${tier.rank}등`

		const probabilityCell = document.createElement("td")
		probabilityCell.textContent = `${tier.threshold * 100}%`

		const rewardCell = document.createElement("td")
		rewardCell.textContent = `₩ ${tier.rewardMoney.toLocaleString()}` // 금액을 천 단위로 구분하여 표시

		row.appendChild(rankCell)
		row.appendChild(probabilityCell)
		row.appendChild(rewardCell)
		tbody.appendChild(row)
	})

	table.appendChild(tbody)
	prizeTierDiv.appendChild(table) // 생성한 테이블을 'div.prize-tier'에 추가
}

// 등수별 당첨확률계산
calculatePrizeProbabilities(0.000002) // 20% 당첨확률 입력 초기값

// 각 당첨확률을 적용하여 각 등수별 추첨하여 jackpot에 기록
getRandomPrize(prizeThresholds)

// 가장 높은 등수 추출
let jackpotLevel = findLowestRankWithJackpotOne(jackpot)
// 예시: jackpotLevel을 얻고 그리드셀에 숫자를 배치
populateGridCells(jackpotLevel)

displayPrizeProbabilities(prizeThresholds)

// 이벤트 핸들러 추가: 사용자가 버튼을 클릭했을 때 실행
document.getElementById("applyProbability").addEventListener("click", () => {
	const probabilityInput = document.getElementById("probabilityInput").value
	// 사용자 입력값을 calculatePrizeProbabilities 함수에 전달
	const p1 = parseFloat(probabilityInput) / 100
	if (isNaN(p1) || p1 <= 0 || p1 >= 1) {
		alert("올바른 확률 값을 입력하세요. (0과 99 사이의 값)")
		return
	}

	// 새로운 확률로 당첨 확률 계산
	calculatePrizeProbabilities(p1)
	getRandomPrize(prizeThresholds)
	// 가장 높은 등수 추출
	jackpotLevel = findLowestRankWithJackpotOne(jackpot)
	// 예시: jackpotLevel을 얻고 그리드셀에 숫자를 배치
	populateGridCells(jackpotLevel)
	// 업데이트된 확률로 당첨 확률표 업데이트
	displayPrizeProbabilities(prizeThresholds)

	// 다음 복권 준비
	initCanvas()
	erasedList = []
	isRevealed = false
	isDrawing = false // 복권 긁기 상태 초기화
	isPrizeAwarded = false

	closeJackpotModal()
})

function updateDisplay() {
	const costDisplay = document.getElementById("costDisplay")
	const prizeDisplay = document.getElementById("prizeDisplay")
	const profitDisplay = document.getElementById("profitDisplay")

	// 총 비용 표시
	if (!costDisplay) {
		const newCostDisplay = document.createElement("div")
		newCostDisplay.id = "costDisplay"
		newCostDisplay.textContent = `총 비용: ₩${totalCost.toLocaleString()}`
		document.getElementById("lotteryBalance").appendChild(newCostDisplay)
	} else {
		costDisplay.textContent = `총 비용: ₩${totalCost.toLocaleString()}`
	}

	// 총 당첨금액 표시
	if (!prizeDisplay) {
		const newPrizeDisplay = document.createElement("div")
		newPrizeDisplay.id = "prizeDisplay"
		newPrizeDisplay.textContent = `총 당첨금액: ₩${totalPrize.toLocaleString()}`
		document.getElementById("lotteryBalance").appendChild(newPrizeDisplay)
	} else {
		prizeDisplay.textContent = `총 당첨금액: ₩${totalPrize.toLocaleString()}`
	}

	// 총 손익 계산 및 표시
	const totalProfit = totalPrize - totalCost
	if (!profitDisplay) {
		const newProfitDisplay = document.createElement("div")
		newProfitDisplay.id = "profitDisplay"
		newProfitDisplay.textContent = `총 손익: ₩${totalProfit.toLocaleString()}`
		document.getElementById("lotteryBalance").appendChild(newProfitDisplay)
	} else {
		profitDisplay.textContent = `총 손익: ₩${totalProfit.toLocaleString()}`
	}
}

let totalAttempts = 0 // 총 시도 횟수

// 모달을 표시하고 내용을 업데이트하는 함수
function showJackpotModal(jackpotLevel) {
	totalAttempts++ // 시도 횟수 증가
	updateDisplay()
	updateLotteryRecord(jackpotLevel)
	const totalProfit = totalPrize - totalCost // 총 손익 계산

	if (jackpotLevel) {
		jackpotMessage.innerHTML = `축하합니다!<br>${jackpotLevel.rank}등 당첨!<br>
                                    <span>₩ ${jackpotLevel.rewardMoney.toLocaleString()}원 수령!</span>
                                    <br> 총 손익: ₩ ${totalProfit.toLocaleString()}<br>
                                    총 시도 횟수: ${totalAttempts}회`
		totalPrize += jackpotLevel.rewardMoney
	} else {
		jackpotMessage.innerHTML = `꽝!<br> 총 손익: ₩${totalProfit.toLocaleString()}<br>
                                    총 시도 횟수: ${totalAttempts}회`
	}

	isRevealed = true
	modal.style.display = "flex"
}

// 모달을 닫는 함수
function closeJackpotModal() {
	modal.style.display = "none"
}

// 모달 닫기 버튼 클릭 시 모달 닫기
closeModal.addEventListener("click", closeJackpotModal)

// 모달 외부 클릭 시 모달 닫기
window.addEventListener("click", (event) => {
	if (event.target === modal) {
		closeJackpotModal()
	}
})

// 모달 요소 끝

// 복권 긁기 버튼
const $scratchButton = document.getElementById("scratch")
$scratchButton.addEventListener("click", () => {
	if (!isDrawing && !isPrizeAwarded) {
		// 긁기 시작
		isDrawing = true
		context.clearRect(0, 0, WIDTH, HEIGHT)
		isRevealed = true
		isPrizeAwarded = true
		// 현재 총 비용과 당첨금액을 표시하는 함수 호출
		updateDisplay()
		// 모달 표시
		showJackpotModal(jackpotLevel)
		// 긁기 비용 추가
		totalCost += 1000 // 한 번 긁기 당 1000원 비용 추가
	}
})

let totalCost = 0 // 총 비용
let totalPrize = 0 // 총 당첨금

// 리셋 버튼 이벤트 핸들러
document.getElementById("resetLottery").addEventListener("click", () => {
	initCanvas()
	lotteryRecord = [] // 기록 초기화
	totalAttempts = 0 // 총 시도 횟수 초기화
	erasedList = []

	let totalCost = 0 // 총 비용
	let totalPrize = 0 // 총 당첨금

	isRevealed = false
	isDrawing = false // 복권 긁기 상태 초기화
	isPrizeAwarded = false

	document.getElementById("recordDisplay").innerHTML = `<h3>당첨 내역</h3>`
	// 새로운 확률로 당첨 확률 계산
	calculatePrizeProbabilities(p1)
	// 새 복권을 위한 새로운 당첨번호 생성
	getRandomPrize(prizeThresholds)

	jackpotLevel = findLowestRankWithJackpotOne(jackpot)
	updateDisplay()
	populateGridCells(jackpotLevel)
	displayPrizeProbabilities(prizeThresholds)

	closeJackpotModal()
})

document.getElementById("nextLottery").onclick = () => {
	if (!isRevealed) {
		alert("복권을 긁어야 합니다.")
	} else {
		// 다음 복권 준비
		initCanvas()
		erasedList = []
		isRevealed = false
		isDrawing = false // 복권 긁기 상태 초기화
		isPrizeAwarded = false

		// 새 복권을 위한 새로운 당첨번호 생성
		getRandomPrize(prizeThresholds)

		jackpotLevel = findLowestRankWithJackpotOne(jackpot)
		populateGridCells(jackpotLevel)

		// 화면 업데이트
		updateDisplay()
		// 당첨율표 표시
		displayPrizeProbabilities(prizeThresholds)
	}
	closeJackpotModal()
}

let lotteryRecord = []

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
		result = `${jackpotLevel.rank}등 당첨 - ₩ ${jackpotLevel.rewardMoney.toLocaleString()}`
	} else {
		result = "꽝"
	}

	// 기록을 lotteryRecord 배열에 추가
	lotteryRecord.push({ time: formattedTime, result: result })

	// 기록을 화면에 표시
	displayLotteryRecord()
}

function displayLotteryRecord() {
	const recordDisplay = document.getElementById("recordDisplay")

	// 기록 표시 영역이 없다면 생성
	if (!recordDisplay) {
		const newRecordDisplay = document.createElement("div")
		newRecordDisplay.id = "recordDisplay"
		document.querySelector("main").appendChild(newRecordDisplay)
	}

	// 기록을 HTML로 변환하여 표시
	const recordHtml = lotteryRecord.map((record) => `<div>${record.time} - ${record.result}</div>`).join("")

	recordDisplay.innerHTML = `<h3>당첨 내역</h3>${recordHtml}`
}
