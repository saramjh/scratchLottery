# Scratch Lottery Simulator

**[English](#english)** | **[한국어](#한국어)**

A free scratch-off lottery simulator. It reproduces the tactile "scratching" experience using the published odds of real lotteries (Powerball, US $5 scratch-offs, Korea's Speetto 1000/2000) — no real money is ever involved.

Try it → <https://saramjh.github.io/scratchLottery/>

![Desktop screenshot](docs/screenshots/desktop.png)

---

## English

### What is this

- Tickets modeled after real formats as closely as possible: Powerball draws 5 white balls + 1 red bonus ball (in a fixed order), Speetto 1000 matches two rows (LUCKY NUMBER / MY NUMBER), and Speetto 2000 has you scratch two symbols per panel to find a match.
- Each cell scratches independently via its own `<canvas>`, so you can drag across multiple cells and scratch them in one continuous motion.
- The odds engine draws a single result per ticket from a CDF (cumulative distribution), so a single ticket can never win multiple prize tiers at once, and a jackpot can never get silently overwritten by a lower prize. Choosing "Custom Odds" lets you build your own ticket with any jackpot probability you want.
- Every scratch is logged to a time-series chart; clicking a node shows that ticket's full detail. Fast-forward simulations (10x/100x/1,000x) let you watch the law of large numbers converge on the theoretical odds table in real time.
- Cost / winnings / profit / attempt count are saved to your device automatically, so your record picks up where you left off next time you visit.

### Screenshots

| Powerball (5+1 bonus ball) | Speetto 2000 (symbol matching) |
| --- | --- |
| ![Powerball ticket](docs/screenshots/powerball-ticket.png) | ![Speetto 2000 ticket](docs/screenshots/speetto2000-ticket.png) |

| Fast-simulation chart | Mobile view |
| --- | --- |
| ![Fast simulation](docs/screenshots/fast-simulation.png) | <img src="docs/screenshots/mobile.png" width="280" alt="Mobile view"> |

### How odds/RTP are calculated

Each preset only defines a jackpot probability (`p1`) and a prize table (`rewards`) per tier. The ratio between tiers' marginal probabilities follows a fixed Fibonacci-like shape shared across all presets. On every scratch, `drawLotteryResult` draws a single random number in [0, 1) and matches it against the cumulative probability ranges to pick a result — the same mechanism a real printed lottery ticket relies on (a fixed, predetermined probability distribution). Lower-tier prize amounts are calibrated so the resulting RTP lands in the range real lotteries typically use (roughly 50–70%).

### Tech stack

No build tools or frameworks — plain HTML/CSS/JS, deployed as-is via GitHub Pages.

- `index.html` — page structure (SEO meta, ticket UI, odds/simulation panels, FAQ)
- `css/style.css` — all styling
- `js/script.js` — odds engine, ticket generation/rendering, scratch interaction, charts, localStorage persistence, GA4 event tracking

### Running locally

There's no build step — just serve the files statically.

```bash
git clone <repo-url>
cd scratchLottery
python3 -m http.server 8000
# open http://localhost:8000
```

Double-clicking `index.html` to open it directly as a file mostly works too, but some browsers restrict relative-path fetches under the `file://` protocol, so a local server is recommended.

### Credits

The initial idea for the scratch (canvas-erasing) implementation came from [this article](https://velog.io/@aromahyang/%EB%8F%99%EC%A0%84-%EA%B8%80%EA%B8%B0-%EC%95%A0%EB%8B%88%EB%A9%94%EC%9D%B4%EC%85%98/).

### Disclaimer

This site is a pure simulation. No real money is wagered, and no real lottery tickets are bought or sold. Odds/RTP figures are based on the public information each preset references, and are not guaranteed to exactly match any specific lottery operator's official figures.

### License

This project is licensed under the [MIT License](LICENSE).

---

## 한국어

### 이게 뭔가요

- 게임마다 실제 형식을 최대한 흉내낸 티켓: 파워볼은 흰 공 5개 + 빨간 보너스 볼 1개(고정 순서), 스피또 1000은 LUCKY NUMBER/MY NUMBER 두 줄 매칭, 스피또 2000은 게임칸마다 심볼 2개를 긁어서 맞추는 형식.
- 자리마다 독립된 `<canvas>`로 은박을 긁는 방식이라, 여러 칸을 한 번에 드래그해서 연속으로 긁을 수 있습니다.
- 확률 엔진은 CDF(누적분포) 기반 단일 추첨이라 한 장이 여러 등수에 동시 당첨되거나 잭팟이 다른 당첨으로 덮어써지는 일이 없습니다. "Custom Odds"를 고르면 원하는 1등 확률로 직접 나만의 티켓을 만들 수도 있습니다.
- 스크래치할 때마다 결과가 로터리 로그(시계열 차트)에 쌓이고, 노드를 클릭하면 그 티켓의 상세 정보를 볼 수 있습니다. 빠른 시뮬레이션(10x/100x/1,000x)으로 대수의 법칙이 실제로 확률표에 수렴하는 과정도 확인할 수 있습니다.
- 비용/당첨금/손익/횟수는 기기에 자동 저장되어 다시 방문해도 이어집니다.

### 스크린샷

| 파워볼 (5+1 보너스 볼) | 스피또 2000 (심볼 매칭) |
| --- | --- |
| ![파워볼 티켓](docs/screenshots/powerball-ticket.png) | ![스피또 2000 티켓](docs/screenshots/speetto2000-ticket.png) |

| 빠른 시뮬레이션 차트 | 모바일 화면 |
| --- | --- |
| ![빠른 시뮬레이션](docs/screenshots/fast-simulation.png) | <img src="docs/screenshots/mobile.png" width="280" alt="모바일 화면"> |

### 확률/RTP는 어떻게 계산되나요

각 프리셋은 1등 확률(`p1`)과 등수별 상금표(`rewards`)만 정의합니다. 등수별 한계확률(marginal probability)의 비율은 모든 프리셋이 공유하는 고정된 피보나치 비율 형태이고, 스크래치할 때마다 `drawLotteryResult`가 0~1 사이 난수를 한 번 뽑아 그 값이 어느 등수의 누적확률 구간에 속하는지로 결과를 정합니다 — 실제 인쇄복권의 고정된 확률 분포와 같은 방식입니다. 낮은 등수 상금은 이 확률 모델에서 계산되는 실제 RTP가 진짜 복권 수준(대략 50~70%)이 되도록 보정되어 있습니다.

### 기술 스택

빌드 도구나 프레임워크 없이 순수 HTML/CSS/JS로만 만들어졌고, GitHub Pages로 그대로 배포됩니다.

- `index.html` — 페이지 구조 (SEO 메타, 티켓 UI, 확률/시뮬레이션 패널, FAQ)
- `css/style.css` — 스타일 전체
- `js/script.js` — 확률 엔진, 티켓 생성/렌더링, 스크래치 인터랙션, 차트, localStorage 영속화, GA4 이벤트 트래킹

### 로컬에서 열어보기

빌드 과정이 없어서 그냥 정적 파일 서버로 열면 됩니다.

```bash
git clone <저장소 URL>
cd scratchLottery
python3 -m http.server 8000
# http://localhost:8000 접속
```

`index.html`을 파일로 직접 더블클릭해서 열어도 대부분 동작하지만, 상대 경로 fetch 등에서 브라우저 제약이 있을 수 있어 로컬 서버 사용을 권장합니다.

### 참고

스크래치(캔버스 지우기) 구현의 초기 아이디어는 [이 글](https://velog.io/@aromahyang/%EB%8F%99%EC%A0%84-%EA%B8%80%EA%B8%B0-%EC%95%A0%EB%8B%88%EB%A9%94%EC%9D%B4%EC%85%98/)을 참고했습니다.

### 주의 사항

이 사이트는 순수 시뮬레이션입니다. 실제 돈을 걸지 않고, 실제 복권을 구매하거나 판매하지 않습니다. 확률/RTP 수치는 각 프리셋이 참고한 공개 정보를 기반으로 하며, 특정 로또 사업자의 공식 수치와 100% 일치함을 보장하지 않습니다.

### 라이센스

이 프로젝트는 [MIT 라이센스](LICENSE)를 따릅니다.
