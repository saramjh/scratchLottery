#!/usr/bin/env python3
# Refresh a small official Texas scratch-off watchlist and its on-page archive.
# Stdlib only. Data is descriptive claimed-prize history and never changes
# simulator probabilities or represents current remaining-ticket odds.

from __future__ import annotations

import html
import json
import re
import sys
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_PATH = ROOT / "data" / "live" / "texas-scratch-watch.json"
INDEX_PATH = ROOT / "index.html"
SITEMAP_PATH = ROOT / "sitemap.xml"
START_MARKER = "        <!-- TEXAS_PRIZE_TRACKER_DATA_START -->"
END_MARKER = "        <!-- TEXAS_PRIZE_TRACKER_DATA_END -->"
USER_AGENT = "ScratchLotteryDataBot/1.0 (+https://saramjh.github.io/scratchLottery/)"
TIMEOUT = 25
ALL_GAMES_URL = "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/all.html"

@dataclass(frozen=True)
class Source:
    game_number: str
    name: str
    price: int
    url: str

SOURCES = (
    Source("2755", "Houston Texans", 5, "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/details.html_252698616.html"),
    Source("2751", "Azulejos", 5, "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/details.html_252698620.html"),
    Source("2712", "50X The Cash", 5, "https://www.texaslottery.com/export/sites/lottery/Games/Scratch_Offs/details.html_252698743.html"),
)

def fetch(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=TIMEOUT) as response:
        if response.status != 200:
            raise RuntimeError(f"{url}: HTTP {response.status}")
        return response.read().decode("utf-8", "replace")

def text_only(fragment: str) -> str:
    value = re.sub(r"<[^>]+>", " ", fragment)
    return " ".join(html.unescape(value).split())

def one(pattern: str, raw: str, label: str) -> str:
    match = re.search(pattern, raw, re.I | re.S)
    if not match:
        raise RuntimeError(f"Could not parse {label}")
    return text_only(match.group(1))

def validate_registry_entry(source: Source, raw: str) -> None:
    needle = f">{source.game_number}</a>"
    position = raw.find(needle)
    if position < 0:
        raise RuntimeError(f"Game {source.game_number}: current-games entry not found")
    row_start = raw.rfind("<tr", 0, position)
    row_end = raw.find("</tr>", position)
    if row_start < 0 or row_end < 0:
        raise RuntimeError(f"Game {source.game_number}: current-games row bounds not found")
    row_html = raw[row_start : row_end + len("</tr>")]
    cells = [text_only(cell) for cell in re.findall(r"<td[^>]*>(.*?)</td>", row_html, re.I | re.S)]
    if len(cells) < 5:
        raise RuntimeError(f"Game {source.game_number}: current-games row shape changed")
    if cells[2] != f"${source.price}" or cells[4].casefold() != source.name.casefold():
        raise RuntimeError(
            f"Game {source.game_number}: registry mismatch, expected ${source.price} {source.name!r}, "
            f"got {cells[2]!r} {cells[4]!r}"
        )


def parse_source(source: Source, raw: str) -> dict:
    title_match = re.search(rf"Game No\.\s*{re.escape(source.game_number)}\s*-\s*([^<]+)", raw, re.I | re.S)
    parsed_name = text_only(title_match.group(1)) if title_match else source.name
    if parsed_name.casefold() != source.name.casefold():
        raise RuntimeError(f"Game {source.game_number}: expected {source.name!r}, got {parsed_name!r}")

    source_date_text = one(
        r"Scratch Ticket Prizes Claimed as of\s+([A-Za-z]+ \d{1,2}, \d{4})",
        raw,
        f"source date for {source.game_number}",
    )
    source_date = datetime.strptime(source_date_text, "%B %d, %Y").date().isoformat()
    ticket_count = int(one(r"There are approximately\s+([\d,]+)\*\s+tickets", raw, f"ticket count for {source.game_number}").replace(",", ""))
    overall_odds = float(one(r"Overall odds of winning any prize in .*? are 1 in ([\d.]+)", raw, f"overall odds for {source.game_number}"))

    start = raw.find("Prizes Printed")
    end = raw.find("</table>", start)
    if start < 0 or end < 0:
        raise RuntimeError(f"Game {source.game_number}: prize table not found")

    prizes = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", raw[start:end], re.I | re.S):
        cells = re.findall(r"<td[^>]*>(.*?)</td>", row, re.I | re.S)
        if len(cells) != 3:
            continue
        amount_text, printed_text, claimed_text = map(text_only, cells)
        amount_match = re.fullmatch(r"\$([\d,]+)", amount_text)
        if not amount_match:
            continue
        printed = int(printed_text.replace(",", ""))
        claimed = int(claimed_text.replace(",", ""))
        if printed < 0 or claimed < 0 or claimed > printed:
            raise RuntimeError(f"Game {source.game_number}: invalid prize counts {amount_text} {printed}/{claimed}")
        prizes.append({
            "amount": int(amount_match.group(1).replace(",", "")),
            "printed": printed,
            "claimed": claimed,
            "unclaimed": printed - claimed,
        })

    if not prizes:
        raise RuntimeError(f"Game {source.game_number}: no prize rows parsed")

    total_printed = sum(row["printed"] for row in prizes)
    total_claimed = sum(row["claimed"] for row in prizes)
    top = prizes[0]
    return {
        "sourceDate": source_date,
        "ticketCount": ticket_count,
        "overallOdds": overall_odds,
        "topPrize": {"amount": top["amount"], "printed": top["printed"], "claimed": top["claimed"], "unclaimed": top["unclaimed"]},
        "totalPrizes": {"printed": total_printed, "claimed": total_claimed, "unclaimed": total_printed - total_claimed},
        "prizes": prizes,
    }

def snapshot_signature(snapshot: dict) -> str:
    stable = {"ticketCount": snapshot["ticketCount"], "overallOdds": snapshot["overallOdds"], "prizes": snapshot["prizes"]}
    return json.dumps(stable, sort_keys=True, separators=(",", ":"))

def load_existing() -> dict:
    if not DATA_PATH.exists():
        return {"schemaVersion": 1, "provider": "Texas Lottery", "games": {}}
    return json.loads(DATA_PATH.read_text())

def update_data() -> tuple[dict, bool]:
    data = load_existing()
    data.setdefault("schemaVersion", 1)
    data.setdefault("provider", "Texas Lottery")
    games = data.setdefault("games", {})
    changed = False
    all_games_raw = fetch(ALL_GAMES_URL)
    for source in SOURCES:
        validate_registry_entry(source, all_games_raw)
        parsed = parse_source(source, fetch(source.url))
        game = games.get(source.game_number, {})
        history = list(game.get("history", []))
        previous = history[-1] if history else None
        if previous is None or snapshot_signature(previous) != snapshot_signature(parsed):
            history.append(parsed)
            changed = True
        elif previous.get("sourceDate") != parsed["sourceDate"]:
            history[-1] = {**previous, "sourceDate": parsed["sourceDate"]}
            changed = True

        current = history[-1]
        next_game = {
            "gameNumber": source.game_number,
            "name": source.name,
            "price": source.price,
            "sourceUrl": source.url,
            "current": current,
            "history": history,
        }
        if game != next_game:
            games[source.game_number] = next_game
            changed = True
    if changed:
        data["updatedAt"] = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return data, changed

def money(value: int) -> str:
    return f"${value:,}"

def pct(numerator: int, denominator: int) -> str:
    return "0%" if denominator <= 0 else f"{numerator / denominator * 100:.1f}%"

def render_game(game: dict) -> str:
    current = game["current"]
    top = current["topPrize"]
    total = current["totalPrizes"]
    source_url = html.escape(game["sourceUrl"], quote=True)
    name = html.escape(game["name"])
    return f'''          <article class="tracker-row">
            <div class="tracker-game">
              <strong>{name} · Game {game["gameNumber"]}</strong>
              <span>${game["price"]} ticket · published overall odds 1 in {current["overallOdds"]:g}</span>
            </div>
            <div class="tracker-measures">
              <span><strong>{top["unclaimed"]} of {top["printed"]}</strong> {money(top["amount"])} top prizes unclaimed</span>
              <span><strong>{total["claimed"]:,}</strong> of {total["printed"]:,} printed prizes claimed ({pct(total["claimed"], total["printed"])})</span>
            </div>
            <a href="{source_url}" target="_blank" rel="noopener">Texas Lottery source</a>
          </article>'''

def render_history(data: dict) -> str:
    rows = []
    for game_number in (source.game_number for source in SOURCES):
        game = data["games"][game_number]
        history = game["history"]
        if len(history) < 2:
            continue
        current, previous = history[-1], history[-2]
        top_delta = previous["topPrize"]["unclaimed"] - current["topPrize"]["unclaimed"]
        claimed_delta = current["totalPrizes"]["claimed"] - previous["totalPrizes"]["claimed"]
        if top_delta == 0 and claimed_delta == 0:
            continue
        top_text = (
            f"{top_delta} top prize{'s' if top_delta != 1 else ''} claimed"
            if top_delta > 0
            else "top prizes unchanged"
        )
        rows.append(
            f'''            <li><strong>{html.escape(game["name"])}</strong>: +{claimed_delta:,} printed prizes claimed; {top_text} since {previous["sourceDate"]}.</li>'''
        )
    if rows:
        return '''          <div class="tracker-change-log">
            <h3>Since the previous official snapshot</h3>
            <ul>
%s
            </ul>
          </div>''' % "\n".join(rows)

    first_date = min(game["history"][0]["sourceDate"] for game in data["games"].values() if game["history"])
    return f'''          <p class="tracker-archive-note">Archive starts with the {first_date} official snapshot. Changes will accumulate here as Texas Lottery updates claimed-prize counts.</p>'''

def render_section(data: dict) -> str:
    latest_date = max(game["current"]["sourceDate"] for game in data["games"].values())
    game_rows = "\n".join(render_game(data["games"][source.game_number]) for source in SOURCES)
    history = render_history(data)
    return f'''{START_MARKER}
        <div class="tracker-source-line">Texas Lottery claimed-prize tables · latest source date {latest_date}</div>
        <div class="tracker-list">
{game_rows}
        </div>
{history}
{END_MARKER}'''

def update_index(data: dict) -> bool:
    text = INDEX_PATH.read_text()
    if START_MARKER not in text or END_MARKER not in text:
        raise RuntimeError("Prize tracker markers missing from index.html")
    start = text.index(START_MARKER)
    end = text.index(END_MARKER, start) + len(END_MARKER)
    next_text = text[:start] + render_section(data) + text[end:]
    if next_text == text:
        return False
    INDEX_PATH.write_text(next_text)
    return True

def update_sitemap(meaningful_change: bool) -> bool:
    if not meaningful_change:
        return False
    text = SITEMAP_PATH.read_text()
    today = datetime.now(timezone.utc).date().isoformat()
    next_text, count = re.subn(
        r"<lastmod>\d{4}-\d{2}-\d{2}</lastmod>",
        f"<lastmod>{today}</lastmod>",
        text,
        count=1,
    )
    if count != 1:
        raise RuntimeError("Expected exactly one sitemap lastmod entry")
    if next_text == text:
        return False
    SITEMAP_PATH.write_text(next_text)
    return True


def main() -> int:
    data, data_changed = update_data()
    DATA_PATH.parent.mkdir(parents=True, exist_ok=True)
    serialized = json.dumps(data, indent=2, sort_keys=True) + "\n"
    file_changed = not DATA_PATH.exists() or DATA_PATH.read_text() != serialized
    if file_changed:
        DATA_PATH.write_text(serialized)
    meaningful_change = data_changed or file_changed
    index_changed = update_index(data)
    sitemap_changed = update_sitemap(meaningful_change)
    print(
        f"Texas watchlist: data_changed={meaningful_change} "
        f"index_changed={index_changed} sitemap_changed={sitemap_changed} games={len(data['games'])}"
    )
    for source in SOURCES:
        current = data["games"][source.game_number]["current"]
        print(f"- {source.game_number} {source.name}: source {current['sourceDate']}, top {current['topPrize']['unclaimed']}/{current['topPrize']['printed']}, claimed {current['totalPrizes']['claimed']:,}/{current['totalPrizes']['printed']:,}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
