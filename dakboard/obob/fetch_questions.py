#!/usr/bin/env python3
"""Fetch OBOB questions book by book, save each response, and merge unique questions.

The API appears to cap/sample results per request, so each book is requested
repeatedly until several consecutive requests return no new questions.

Usage: python3 fetch_questions.py
Output:
  responses/<bookId>_<n>.json   raw responses
  bob2027_all.json              merged unique questions
"""
import json
import time
import urllib.request
from pathlib import Path

API_URL = "https://obob.dog/api/beta/questions"
BOOK_IDS = [
    "729ef1fc-b78d-4790-b8b9-7f45fe327220",
    "0e3fcd65-3efd-487b-841c-f2d4c0e8c222",
    "d887afa4-1e1b-4a02-b419-542508f5dc09",
    "cc2b4f3f-5de1-4e10-a68b-d0cffb9f49e1",
    "8a47b26e-4fd1-40d9-acf3-8b85f90d8dfd",
    "daa60ea0-5444-4d40-98d8-5f13ba093f23",
    "0277005f-b8d8-4859-a6f0-2b9b7bbc1582",
    "4ff5c561-6ac2-431b-9047-2c7c401c72c5",
    "0f7a3e93-cc63-464a-bb83-9b34f023eccd",
    "5c7a7186-d9be-4cbb-8526-141507b9bf63",
    "29647fdd-a9d6-4914-bcc7-f750e5a3fae3",
    "9a8ae617-2f52-4d3a-8f1c-b4cfed58bf0e",
    "5162102c-4172-419d-ad93-eade7f779b93",
    "79de9e3a-f6e2-491a-b595-70862372db1b",
    "65ccdb46-db31-4c3c-927f-01d2f1d40a32",
    "f66beada-e501-492a-a39a-12647f133f3f",
]
QUESTION_COUNT = 1500
MAX_REQUESTS_PER_BOOK = 30   # safety cap
STOP_AFTER_NO_NEW = 3        # stop a book after this many requests with nothing new
DELAY_SECONDS = 0.5

HEADERS = {
    "accept": "*/*",
    "content-type": "application/json",
    "origin": "https://obob.dog",
    "referer": "https://obob.dog/battles/3-5/solo",
    "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36",
}

HERE = Path(__file__).resolve().parent
RESPONSES_DIR = HERE / "responses"
OUTPUT_FILE = HERE / "bob2027_all.json"


def fetch(book_id):
    body = json.dumps({
        "bookIds": [book_id],
        "questionCount": QUESTION_COUNT,
        "questionType": "in-which-book",
        "personalized": False,
        "mode": "solo",
    }).encode()
    req = urllib.request.Request(API_URL, data=body, headers=HEADERS, method="POST")
    with urllib.request.urlopen(req, timeout=60) as resp:
        return json.load(resp)


def main():
    RESPONSES_DIR.mkdir(exist_ok=True)
    all_questions = {}

    for book_id in BOOK_IDS:
        book_questions = {}
        no_new = 0
        for n in range(1, MAX_REQUESTS_PER_BOOK + 1):
            data = fetch(book_id)
            (RESPONSES_DIR / f"{book_id}_{n}.json").write_text(json.dumps(data, indent=2))

            before = len(book_questions)
            for q in data.get("questions", []):
                book_questions[q["id"]] = q
            added = len(book_questions) - before

            no_new = 0 if added else no_new + 1
            if no_new >= STOP_AFTER_NO_NEW:
                break
            time.sleep(DELAY_SECONDS)

        title = next(iter(book_questions.values()), {}).get("book", {}).get("title", book_id)
        print(f"{title}: {len(book_questions)} unique questions ({n} requests)")
        all_questions.update(book_questions)

    questions = sorted(all_questions.values(),
                       key=lambda q: (q["book"]["title"], q.get("page") or 0, q["id"]))
    OUTPUT_FILE.write_text(json.dumps({"questions": questions}, indent=2))
    print(f"\nTotal unique questions: {len(questions)} -> {OUTPUT_FILE.name}")


if __name__ == "__main__":
    main()
