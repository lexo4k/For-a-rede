#!/usr/bin/env python3
"""GENESE: scan public GitHub issues for potential paid open-source tasks.

A stated bounty is only a lead, never proof of reserved funds or payment.
This script never claims tasks, posts comments, uses credentials, or transfers money.
"""
from __future__ import annotations
import json
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any

API = "https://api.github.com/search/issues"
QUERIES = ['is:issue is:open "bounty"', 'is:issue is:open "paid bounty"']
AMOUNT_PATTERNS = [
    re.compile(r"(?:\$|USD\s*)\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)", re.I),
    re.compile(r"(?:bounty|reward|pays|payment)\s*[:\-]?\s*(?:USD\s*)?\$?\s*([0-9][0-9,]*(?:\.[0-9]{1,2})?)\s*(USD|US\$|dollars?)?", re.I),
]

@dataclass
class Candidate:
    title: str
    url: str
    repository: str
    stated_reward: str
    status: str = "CANDIDATE_UNVERIFIED"
    note: str = "Public text mentions an amount; funding, eligibility, assignment and payout are not verified."

def extract_amount(text: str) -> str:
    for pattern in AMOUNT_PATTERNS:
        for match in pattern.finditer(text or ""):
            raw = match.group(1).replace(",", "")
            try:
                value = float(raw)
            except ValueError:
                continue
            if 1 <= value <= 1_000_000:
                label = match.group(2) if len(match.groups()) > 1 else None
                return f"${raw} {label or 'USD (inferred from $)'}"
    return "No explicit amount found"

def parse_items(items: list[dict[str, Any]]) -> list[Candidate]:
    out, seen = [], set()
    for item in items:
        if item.get("pull_request") or item.get("state") not in (None, "open"):
            continue
        title, body = str(item.get("title") or ""), str(item.get("body") or "")
        if not re.search(r"bounty|reward|paid|payment", title + "\n" + body, re.I):
            continue
        url = str(item.get("html_url") or item.get("url") or "")
        if not url or url in seen:
            continue
        seen.add(url)
        repo = url.split("/issues/")[0] if "/issues/" in url else "unknown"
        out.append(Candidate(title, url, repo, extract_amount(title + "\n" + body)))
    return out

def fetch(query: str, per_page: int = 30) -> list[dict[str, Any]]:
    params = urllib.parse.urlencode({"q": query, "per_page": per_page, "sort": "updated", "order": "desc"})
    request = urllib.request.Request(
        f"{API}?{params}",
        headers={"Accept": "application/vnd.github+json", "User-Agent": "GENESE-public-bounty-scanner/1.0"},
    )
    with urllib.request.urlopen(request, timeout=15) as response:
        return json.loads(response.read().decode("utf-8")).get("items", [])

def main() -> int:
    items, errors = [], []
    for query in QUERIES:
        try:
            items.extend(fetch(query))
        except Exception as exc:
            errors.append(f"{query}: {type(exc).__name__}: {exc}")
    candidates = parse_items(items)
    result = {
        "scanner": "GENESE public bounty scan",
        "source": API,
        "queries": QUERIES,
        "candidates_found": len(candidates),
        "confirmed_payments": 0,
        "candidates": [asdict(candidate) for candidate in candidates[:20]],
        "errors": errors,
        "safety": "Listed amount is not proof of funded money. Human review and acceptance are required. No claims or transfers were made.",
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if candidates else (2 if errors else 0)

if __name__ == "__main__":
    sys.exit(main())
