#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
scrape_qatr_alnada.py
=====================
Fetches the bare matn of «قطر الندى وبل الصدى» (ابن هشام) from المكتبة الشاملة
(book id 11376, pages 1..33) and assembles it into the app's matn JSON schema.

IMPORTANT — run this where the network can reach shamela.ws (Claude Code env or
your machine). It will NOT run inside Claude's sandbox (shamela is not allow-listed).

    pip install requests beautifulsoup4
    python scrape_qatr_alnada.py            # -> qatr_alnada_full.json

It does NOT author or alter content: it copies the source text verbatim (tashkeel
preserved), strips only site chrome, groups paragraphs into the 16 أبواب, and emits
prose `paragraph` sections. Poetic شواهد are LEFT AS paragraphs (no sadr/ajz split)
and nothing is tagged — those are a later editorial pass (Claude).

VALIDATION: compare this script's first chapter against the hand-built reference
`qatr_alnada_ch1_partial.json`. If paragraphs come out merged/split differently,
tweak `extract_page_paragraphs()` (the only fragile part) until chapter 1 matches.
"""

import json
import re
import sys
import time

import requests
from bs4 import BeautifulSoup

BOOK_ID = 11376
FIRST_PAGE = 1
LAST_PAGE = 33                      # shamela's >> points to /34 (end marker)
BASE = "https://shamela.ws/book/{book}/{page}"
SLEEP_SECONDS = 1.0                 # be polite to shamela
TIMEOUT = 30

# The matn on each page sits between these two stable Arabic UI strings.
MARK_START = "تحميل الصفحة السابقة"
MARK_END = "تحميل الصفحة التالية"

# Chapter (باب) boundaries: the page on which each باب STARTS, taken from the
# book's فهرس. A page belongs to the most recent باب whose start-page <= page.
CHAPTERS = [
    (1,  "الكَلِمَةُ وَأَقْسَامُهَا"),
    (7,  "بَابُ المُبْتَدَأِ وَالخَبَرِ"),
    (9,  "بَابُ النَّوَاسِخِ"),
    (13, "بَابُ الفَاعِلِ"),
    (15, "بَابُ النَّائِبِ عَنِ الفَاعِلِ"),
    (16, "بَابُ الاشْتِغَالِ"),
    (18, "بَابُ التَّنَازُعِ"),
    (19, "بَابُ المَفْعُولِ (وَهُوَ خَمْسَةٌ)"),
    (22, "بَابُ الحَالِ"),
    (24, "بَابُ المَخْفُوضَاتِ"),
    (25, "بَابُ مَا يَعْمَلُ عَمَلَ فِعْلِهِ"),
    (27, "بَابُ التَّوَابِعِ"),
    (30, "بَابُ العَدَدِ"),
    (31, "بَابُ مَوَانِعِ الصَّرْفِ"),
    (32, "بَابُ التَّعَجُّبِ"),
    (33, "بَابُ الوَقْفِ"),
]


def chapter_for_page(page: int) -> str:
    title = CHAPTERS[0][1]
    for start, name in CHAPTERS:
        if page >= start:
            title = name
        else:
            break
    return title


def clean_paragraph(text: str) -> str:
    # remove paragraph/footnote anchors like "#p3", "[12]", stray markers
    text = re.sub(r"#\s*p\s*\d+", "", text)
    text = re.sub(r"\[\d+\]", "", text)
    text = re.sub(r"[ \t ]+", " ", text)
    return text.strip(" ‏‎\t")


# --- the only fragile part: turn one page's HTML into a list of paragraphs ----
# The matn lives in <p> tags inside the .nass container. Marker-slicing the
# whole-page text was unreliable (it leaked the nav + فهرس chrome into every
# chapter), so we read .nass directly. One <p> -> one paragraph.
def extract_page_paragraphs(html: str) -> list[str]:
    soup = BeautifulSoup(html, "html.parser")
    for bad in soup(["script", "style", "noscript"]):
        bad.decompose()
    nass = soup.find(class_="nass")
    if nass is None:
        print("  !! no .nass container on this page", file=sys.stderr)
        return []
    blocks = nass.find_all("p") or [nass]   # fall back to the whole block
    paras = []
    for block in blocks:
        p = clean_paragraph(block.get_text(" ", strip=True))
        # the page wraps quoted words in spans, so get_text leaves a stray
        # space before trailing punctuation ("ضربتُ" .) — pull it back tight.
        p = re.sub(r"\s+([،؛.:؟!])", r"\1", p)
        if not p or len(p) < 2:
            continue
        # drop residual UI lines that occasionally fall inside the slice
        if p in ("اذهب", "بحــث", "التشكيل", "+", "-", "ص:"):
            continue
        paras.append(p)
    return paras


def fetch_page(page: int) -> str:
    url = BASE.format(book=BOOK_ID, page=page)
    r = requests.get(url, timeout=TIMEOUT, headers={"User-Agent": "matn-scraper/1.0"})
    r.raise_for_status()
    r.encoding = "utf-8"
    return r.text


def main() -> int:
    # accumulate paragraphs per chapter, in page order
    chapter_paras: dict[str, list[str]] = {name: [] for _, name in CHAPTERS}
    report = []
    for page in range(FIRST_PAGE, LAST_PAGE + 1):
        try:
            html = fetch_page(page)
            paras = extract_page_paragraphs(html)
        except Exception as e:                       # noqa: BLE001
            print(f"  !! page {page} failed: {e}", file=sys.stderr)
            report.append((page, "FAILED", 0))
            continue
        bab = chapter_for_page(page)
        chapter_paras[bab].extend(paras)
        report.append((page, bab, len(paras)))
        print(f"  page {page:>2} -> {bab}  ({len(paras)} paragraphs)")
        time.sleep(SLEEP_SECONDS)

    units = []
    for order, (_, name) in enumerate(CHAPTERS, start=1):
        sections = [{"type": "paragraph", "text": t} for t in chapter_paras[name]]
        if not sections:
            print(f"  !! WARNING: chapter '{name}' has no paragraphs", file=sys.stderr)
        units.append({
            "order": order,
            "kind": "bab",
            "title": name,
            "body": {"sections": sections},
        })

    doc = {
        "_note": ("قطر الندى وبل الصدى — ابن هشام. مسحوب آلياً من الشاملة (book 11376). "
                  "نثرٌ يتخلّله شواهد شعرية تُركت كـ paragraphs (لم تُقسَّم sadr/ajz). "
                  "التشكيل مسوّدة من المصدر وتحتاج مراجعة. غير موسوم بعد."),
        "id": "qatr_alnada",
        "titleAr": "قَطْرُ النَّدَى وَبَلُّ الصَّدَى",
        "titleEn": "Qatr al-Nada wa-Ball al-Sada",
        "author": "ابن هشام الأنصاري",
        "era": "القرن الثامن الهجري (ت ٧٦١ هـ)",
        "level": "intermediate",
        "type": "prose",
        "units": units,
    }
    with open("qatr_alnada_full.json", "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, indent=2)

    total = sum(len(u["body"]["sections"]) for u in units)
    print("\n--- report ---")
    for page, bab, n in report:
        print(f"  p{page:>2}: {n:>2}  {bab}")
    print(f"\nunits: {len(units)} | total paragraphs: {total}")
    print("wrote qatr_alnada_full.json")
    print("\nNEXT: diff chapter 1 against qatr_alnada_ch1_partial.json to validate the parser,")
    print("then hand to Claude for شواهد-splitting, role-tagging, and tashkeel proofing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
