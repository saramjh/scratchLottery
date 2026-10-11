#!/usr/bin/env node
// No-browser regression for native-currency per-game ledgers and v3 migration.
const assert = require("node:assert/strict")
const fs = require("node:fs")
const path = require("node:path")
const vm = require("node:vm")
const source = fs.readFileSync(path.join(__dirname, "../js/script.js"), "utf8")
const start = source.indexOf('const STORAGE_KEY = "scratchLotteryState"')
const end = source.indexOf("/* ============================================================\n   스크래치 캔버스", start)
assert(start > 0 && end > start)
const block = source.slice(start, end) + `
module.exports = {
  inspect: () => ({ preset: activeLedgerPreset, cost: totalCost, prize: totalPrize, attempts: totalAttempts, records: lotteryRecord.length }),
  put: (cost, prize, attempts) => { totalCost=cost; totalPrize=prize; totalAttempts=attempts },
  switchPreset: selectPresetLedger,
  persist: saveState,
}
`
function initialize(raw) {
 const store = new Map(raw ? [["scratchLotteryState", JSON.stringify(raw)]] : [])
 const localStorage = {getItem: k => store.get(k) || null, setItem: (k,v)=>store.set(k,v)}
 const module = {exports:{}}
 vm.runInNewContext(block, {localStorage, prizeVTScroll:{innerHTML:""}, module})
 return {api:module.exports,store}
}
const us = {time:"10.11",currency:"$",cost:5,rewardMoney:0,rank:null,result:"No luck",net:-5,isWin:false}
const kr = {time:"10.11",currency:"₩",cost:1000,rewardMoney:0,rank:null,result:"No luck",net:-1000,isWin:false}
const legacy = {version:3,totalCost:5005,totalPrize:0,totalAttempts:4,lotteryRecord:[us,kr],bestWinAmount:0,bestWinLabel:""}
const state = initialize(legacy)
assert.equal(state.api.inspect().cost,5)
assert.equal(state.api.inspect().records,1)
assert.deepEqual(JSON.parse(state.store.get("scratchLotteryStateV3Backup")), legacy)
state.api.switchPreset("speetto1000")
assert.equal(state.api.inspect().cost,1000)
assert.equal(state.api.inspect().records,1)
state.api.put(2000,0,2)
state.api.persist()
state.api.switchPreset("us_scratch5")
assert.equal(state.api.inspect().cost,5)
const updated=JSON.parse(state.store.get("scratchLotteryState"))
assert.equal(updated.version,4)
assert.equal(updated.ledgers.us_scratch5.totalCost,5)
assert.equal(updated.ledgers.speetto1000.totalCost,2000)
const reloaded=initialize(updated)
reloaded.api.switchPreset("speetto1000")
assert.equal(reloaded.api.inspect().cost,2000)
assert.equal(reloaded.api.inspect().attempts,2)
assert.equal(initialize().api.inspect().cost,0)
console.log("✓ USD/KRW per-game balances, migration backup and reload remain isolated")
