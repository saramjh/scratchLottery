var NUMBER_OF_STARS = 200

// 별을 추가하는 함수
var addStars = function () {
	// 기존 별 제거
	var existingStars = document.querySelectorAll(".star")
	existingStars.forEach(function (star) {
		document.body.removeChild(star)
	})

	for (var jess = 0; jess < NUMBER_OF_STARS; jess++) {
		var aStar = document.createElement("div")
		aStar.className = "star"

		var windowWidth = window.innerWidth - 5
		var windowHeight = window.innerHeight - 5

		var x = Math.random() * windowWidth
		aStar.style.left = x + "px"
		document.body.appendChild(aStar)

		var y = Math.random() * windowHeight
		aStar.style.top = y + "px"

		addPulse(aStar)
	}
}

// 별에 펄스를 추가하는 함수
var addPulse = function (element) {
	var pulseTime = Math.random() * 4000
	setTimeout(function () {
		element.className += " pulse"
	}, pulseTime)
}

// 초기 별 생성
addStars()

// 창 크기 조정 시 별 재생성
window.addEventListener("resize", addStars)
