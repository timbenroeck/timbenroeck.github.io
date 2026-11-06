#!/usr/bin/env python3
"""Fetch OBOB questions with all books in each request (so in-which-book questions
are included), then merge with the per-book content responses from fetch_questions.py.

The API returns a random sample per request, so the full book list is requested
repeatedly until several consecutive requests return no new questions.

Usage: python3 fetch_all_books.py
Output:
  responses_all/all_<n>.json   raw responses from this script
  bob2027_all.json             merged unique questions from responses/ and responses_all/
"""
import json
import time
import urllib.request
from collections import Counter
from pathlib import Path

from fetch_questions import API_URL, BOOK_IDS, HEADERS, QUESTION_COUNT

MAX_REQUESTS = 100           # safety cap
STOP_AFTER_NO_NEW = 5        # stop after this many requests with nothing new
DELAY_SECONDS = 0.5

HERE = Path(__file__).resolve().parent
PER_BOOK_DIR = HERE / "responses"
ALL_BOOKS_DIR = HERE / "responses_all"
OUTPUT_FILE = HERE / "bob2027_all.json"


def fetch():
    body = json.dumps({
        "bookIds": BOOK_IDS,
        "questionCount": QUESTION_COUNT,
        "questionType": "both",
        "personalized": False,
        "mode": "solo",
    }).encode()
    req = urllib.request.Request(API_URL, data=body, headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def fetch_all_books():
    ALL_BOOKS_DIR.mkdir(exist_ok=True)
    seen = set()
    no_new = 0
    for n in range(1, MAX_REQUESTS + 1):
        data = fetch()
        (ALL_BOOKS_DIR / f"all_{n}.json").write_text(json.dumps(data, indent=2))

        before = len(seen)
        seen.update(q["id"] for q in data.get("questions", []))
        added = len(seen) - before
        print(f"request {n}: {len(data.get('questions', []))} returned, {added} new, {len(seen)} total")

        no_new = 0 if added else no_new + 1
        if no_new >= STOP_AFTER_NO_NEW:
            break
        time.sleep(DELAY_SECONDS)


def merge():
    questions = {}
    for folder in (PER_BOOK_DIR, ALL_BOOKS_DIR):
        for path in sorted(folder.glob("*.json")):
            for q in json.loads(path.read_text()).get("questions", []):
                questions[q["id"]] = q

    merged = sorted(questions.values(),
                    key=lambda q: (q["book"]["title"], q["type"], q.get("page") or 0, q["id"]))
    OUTPUT_FILE.write_text(json.dumps({"questions": merged}, indent=2))

    print("\nBy type:", dict(Counter(q["type"] for q in merged)))
    for title, count in sorted(Counter(q["book"]["title"] for q in merged).items()):
        print(f"  {title}: {count}")
    print(f"Total unique questions: {len(merged)} -> {OUTPUT_FILE.name}")


if __name__ == "__main__":
    fetch_all_books()
    merge()
