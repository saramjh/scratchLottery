#!/usr/bin/env node
// 빌드 도구가 없는 순수 정적 사이트라, 이 스크립트가 CI에서 도는 유일한 게이트다.
// 매 세션마다 수동으로 하던 검증(문법/브레이스/ID 정합성)을 그대로 코드로 옮긴 것.
const fs = require("fs")
const path = require("path")
const { execFileSync } = require("child_process")

const root = path.join(__dirname, "..")
let failed = false

function fail(message) {
	console.error(`✗ ${message}`)
	failed = true
}

function ok(message) {
	console.log(`✓ ${message}`)
}

// 1) JS 문법 검사
try {
	execFileSync(process.execPath, ["--check", path.join(root, "js/script.js")], { stdio: "pipe" })
	ok("js/script.js syntax OK")
} catch (e) {
	fail(`js/script.js syntax error:\n${e.stderr?.toString() || e.message}`)
}

// 2) CSS 중괄호 균형
const css = fs.readFileSync(path.join(root, "css/style.css"), "utf8")
const openCount = (css.match(/{/g) || []).length
const closeCount = (css.match(/}/g) || []).length
if (openCount === closeCount) {
	ok(`css/style.css braces balanced (${openCount})`)
} else {
	fail(`css/style.css braces unbalanced: ${openCount} '{' vs ${closeCount} '}'`)
}

// 3) JS의 모든 getElementById(...)가 HTML의 id="..."와 대응하는지 확인
const html = fs.readFileSync(path.join(root, "index.html"), "utf8")
const js = fs.readFileSync(path.join(root, "js/script.js"), "utf8")
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]))
const referencedIds = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map((m) => m[1])
const missingIds = referencedIds.filter((id) => !htmlIds.has(id))
if (missingIds.length === 0) {
	ok(`all ${new Set(referencedIds).size} getElementById() targets exist in index.html`)
} else {
	fail(`getElementById() references missing from index.html: ${[...new Set(missingIds)].join(", ")}`)
}

process.exit(failed ? 1 : 0)
