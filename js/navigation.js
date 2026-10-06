"use strict";

(function initProductNavigation() {
	const toggle = document.getElementById("navToggle")
	const nav = document.getElementById("topbarNav")
	if (!toggle || !nav) return

	function setProductNavOpen(open, { restoreFocus = false } = {}) {
		toggle.setAttribute("aria-expanded", String(open))
		toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu")
		nav.classList.toggle("is-open", open)
		if (!open && restoreFocus) toggle.focus()
	}

	toggle.addEventListener("click", () => {
		setProductNavOpen(toggle.getAttribute("aria-expanded") !== "true")
	})

	nav.addEventListener("click", (event) => {
		if (!event.target.closest("a")) return
		setProductNavOpen(false)
	})

	document.addEventListener("keydown", (event) => {
		if (event.key !== "Escape" || toggle.getAttribute("aria-expanded") !== "true") return
		event.preventDefault()
		setProductNavOpen(false, { restoreFocus: true })
	})
})()
