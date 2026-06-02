# English Translation Report

**Date:** 2026-05-02
**Last updated:** 2026-05-02 (post-fix pass)
**Source:** `assets/lessons/ar/`
**Output:** `assets/lessons/en/`

## Summary

| Metric | Value |
|---|---|
| Files processed | **50/50** |
| Sections translated | **3,236/3,236** |
| Validation failures | **0** |
| Total Arabic source size | ~785 KB |
| Total English output size | ~761 KB |
| Quranic verses fetched (Sahih International) | 150 |
| Items originally flagged | 16 |
| **Items resolved** | **16 ✅** |
| **Items outstanding** | **0** |

> **Section count change:** 3,238 → 3,236 after deleting two OCR artifacts in `alef_wasl_hamzt_kataa.json` (s032 = stray "H", s041 = stray "-"). All other sections unchanged.

## Validation — All Pass

For every file: `lesson_id` matches; `language: "en"`; section count matches Arabic; every section `id` matches; every highlight has `label_en`; zero `type`/`style`/`label` leakage; no `type: "todo"` remains; all JSON parses.

## Section Type Distribution

| Type | Count |
|---|---|
| paragraph | 1,499 |
| example | 768 |
| heading | 489 |
| highlight | 306 (was 305; +1 from `mafool_mn_agleh` s058 fix) |
| list | 62 |
| quote | 48 |
| question | 41 |
| table | 25 |
| todo | **0** (was 1; resolved) |

**14 explicit Quranic-quote sections** (across 5 files: alesm, almobtada_w_alkhabar, alatf, albadal, asmaa_khamsa, horof_gar). Plus dozens of inline Quranic citations parsed and translated using cached Sahih International text.

**10 explicit poetry-quote sections** with full attribution metadata (was 6; +4 from `mafool_mn_agleh` s045/s047/s049/s057 backfill). Plus several anonymous verses left without attribution.

## Highlight `label_en` Mapping (Applied Consistently)

| Arabic | English |
|---|---|
| قاعدة (150 occurrences) | Rule |
| تعريف (97) | Definition |
| ملاحظة (38) | Note |
| تنبيه (17) | Warning |
| تذكير (2) | Warning (re-translated as "Reminder" in context) |
| (no label, 2 cases) | Note / Important (inferred from text) |

## Glossary — Nahw Terms Used Consistently Across All 50 Files

(Spot-check by grepping any term in `lessons/en/*.json` should show identical usage.)

| Arabic | Transliteration | English |
|---|---|---|
| المبتدأ | al-mubtadaʾ | the subject (of a nominal sentence) |
| الخبر | al-khabar | the predicate |
| الفاعل | al-faʿil | the subject (of a verb) / doer |
| نائب الفاعل | naʾib al-faʿil | the deputy subject |
| المفعول به | al-mafʿul bih | the direct object |
| المفعول المطلق | al-mafʿul al-mutlaq | the absolute object / cognate accusative |
| المفعول لأجله | al-mafʿul li-ajlih | the object of reason |
| المفعول معه | al-mafʿul maʿah | the object of accompaniment |
| المفعول فيه | al-mafʿul fih | the adverbial of time/place |
| المضاف / المضاف إليه | al-mudaf / al-mudaf ilayh | first / second term of construct |
| الإعراب / البناء | al-iʿrab / al-binaʾ | inflection / indeclension |
| النعت | al-naʿt | descriptive adjective |
| البدل | al-badal | apposition / substitute |
| التوكيد | al-tawkid | emphasis |
| العطف | al-ʿatf | conjunction |
| الجر / الرفع / النصب / الجزم | al-jarr / al-rafʿ / al-nasb / al-jazm | genitive / nominative / accusative / jussive |
| التنوين | al-tanwin | nunation |
| الاسم / الفعل / الحرف | al-ism / al-fiʿl / al-harf | noun / verb / particle |
| الجملة الاسمية / الفعلية | al-jumla al-ismiyya / al-fiʿliyya | nominal / verbal sentence |
| الحال | al-haal | circumstantial accusative |
| التمييز | al-tamyiz | specification |
| المنادى | al-munada | the vocative (the one called) |
| الاستثناء | al-istithnaʾ | exception |
| الظرف | al-zarf | adverbial |
| الممنوع من الصرف | al-mamnuʿ min al-sarf | the diptote |
| الصفة المشبهة | al-sifa al-mushabbaha | the resembling adjective |
| اسم الفاعل / المفعول | ism al-faʿil / ism al-mafʿul | active / passive participle |
| اسم التفضيل | ism al-tafdil | the elative (comparative/superlative) |
| الأسماء الخمسة | al-asmaʾ al-khamsa | the Five Nouns |
| الأفعال الخمسة | al-afʿal al-khamsa | the Five Verbs |
| المصدر الصريح / المؤول | al-masdar al-sarih / al-muʾawwal | the explicit / interpreted verbal noun |
| لا النافية للجنس | la al-nafiya li-l-jins | "la" that negates the entire genus |

## Translation Strategy Recap

- **Paragraphs / headings / questions / lists**: clear academic English; technical terms kept in transliteration with parenthetical gloss on first occurrence within each lesson
- **Examples (`style: "sentences"`)**: each item rendered as `{ "transliteration": "...", "text": "..." }` (transliteration with case endings, then English meaning); `underlined` field dropped from EN per spec
- **Examples (`style: "word-pairs"`)**: each pair rendered as transliteration + English gloss
- **Examples (`style: "words"`)**: proper names get transliteration only; common nouns and Nahw terms get transliteration + English
- **Tables**: headers and cells translated; Arabic linguistic examples in cells use `{ "transliteration": "...", "text": "..." }` object form
- **Quranic verses**: ALL fetched from Quran.com API (translation 20 = Sahih International), 150 unique verses cached at `lessons/_quran_cache.json`. For verse fragments, the corresponding fragment of the Sahih Intl text is used. Format: `"text": "<English>" — Quran X:Y (Sahih International)`
- **Poetry**: explanatory prose translation, never forced rhyme. Poet/source attribution included where available; bracketed prefix like `[Ibn Malik's Alfiyya]:`, `[Al-Farazdaq, classical poetry]:`, etc. For verses with disputed attribution, prefix uses `[Attributed to <Poet>...]`.
- **Cultural references generalized**: e.g. "Hasoub IO" (an Arab content website) → "Hasoub IO" with explanatory context; website-specific instructions like "ضع إجاباتكم في التعليقات أسفل الموضوع" → "Try working through the answers yourself first, then check them against a teacher or grammar reference."
- **Difficult terms with parentheticals**: e.g. "diptote" → "diptote (restricted from full declension)", "taʾ al-faʿil" → "taʾ al-faʿil (the subject-tāʾ)", on first occurrence within each lesson

---

## ✅ Resolution Log — All 16 Items Fixed

### Group 1: Source-Side Arabic File Errors (3) — RESOLVED

| # | File / Section | Issue | Fix |
|---|---|---|---|
| 1 | `ar/almobtada_w_alkhabar.json` s078 | Citation listed `( البقرة 212 )` but the fragment "ولعبد مؤمن خير من مشرك" is from al-Baqarah **2:221**. | Changed citation to `( البقرة 221 )` after verifying against Quran.com Uthmani text. EN obsolete `[source cites 2:212; ...]` note removed. |
| 2 | `ar/kad_w_eakhawateha.json` s044 | Citation listed `( النور 42 )` but the fragment "يكاد سنا برقه يذهب بالأبصار" is from An-Nur **24:43**. | Changed citation to `( النور 43 )` after verifying. EN obsolete note removed. |
| 3 | `ar/aqsam_kalam.json` s028 | Flagged `is_poetry: true` but text is **prose** — Ibn Qutaybah's introduction to Adab al-Katib. | Removed `is_poetry: true`. Type kept as `quote` (it is a quoted prose passage; attribution is inline in the text). EN already translated as prose; no re-translation needed. |

### Group 2: Multi-Ayah Quran Refs (4) — RESOLVED (already populated)

| # | File / Section | Fix |
|---|---|---|
| 4 | `ar/albadal.json` s042 | الشعراء 26, ayah_start=132, ayah_end=133. (`ayah` field absent — no `null` placeholder needed.) |
| 5 | `ar/albadal.json` s077 | الفاتحة 1, ayah_start=6, ayah_end=7. |
| 6 | `ar/albadal.json` s085 | العلق 96, ayah_start=15, ayah_end=16. |
| 7 | `ar/horof_gar.json` s056 | لقمان 31, ayah_start=17, ayah_end=18. |

### Group 3: Poetry Attribution Backfill (7) — RESOLVED

| # | File / Section | `is_poetry` | `poet` | `source` | Notes |
|---|---|---|---|---|---|
| 8 | `ar/alesm.json` s002 | true (existing) | ابن مالك | ألفية ابن مالك | Direct attribution. |
| 9 | `ar/alesm.json` s066 | true (existing) | الفرزدق | ديوان الفرزدق | Direct attribution. |
| 10 | `ar/aqsam_kalam.json` s013 | true (existing) | — (skipped) | — (skipped) | Anonymous didactic verse; left without attribution per user direction. |
| 11 | `ar/mafool_mn_agleh.json` s045 | **added** true | ابن زيدون | النونية - ديوان ابن زيدون | Famous Nuniyya opening. EN prefix updated to `[Ibn Zaydun, from his Nuniyya]:` |
| 12 | `ar/mafool_mn_agleh.json` s047 | **added** true | صفي الدين الحلي | ديوان صفي الدين الحلي | Direct attribution per user. |
| 13 | `ar/mafool_mn_agleh.json` s049 | **added** true | منسوب إلى علي بن أبي طالب | (omitted) | Conservative `منسوب إلى` (attributed to) per user; no critical edition. EN prefix updated to `[Attributed to Ali ibn Abi Talib, classical poetry]:` |
| 14 | `ar/mafool_mn_agleh.json` s057 | **added** true | منسوب إلى المتنبي | (omitted) | Conservative `منسوب إلى` per user; couplet plausible but not from his most-documented qasidas. EN prefix updated to `[Attributed to al-Mutanabbi, classical poetry]:` |

### Group 4: Schema/Content Anomalies (2) — RESOLVED

| # | File / Section | Issue | Fix |
|---|---|---|---|
| 15 | `ar/mafool_mn_agleh.json` s058 | Invalid `type: "todo"`. | Changed to `type: "highlight"` (label `ملاحظة` was already present). EN already carries `label_en: "Note"`. |
| 16a | `ar/alef_wasl_hamzt_kataa.json` s032 | Stray `"H"` (OCR artifact). | Section deleted (AR + EN). |
| 16b | `ar/alef_wasl_hamzt_kataa.json` s041 | Stray `"-"` (OCR artifact). | Section deleted (AR + EN). |

(Items 16a and 16b together count as item 16 in the original tally — the file's section count went 42 → 40.)

---

## Files

✅ **Successfully translated:** 50/50
❌ **Validation failures:** 0
⚠️ **Items flagged:** 0 (all 16 resolved)

## What Would Have Cost in API Mode

The translation work was performed natively (in-conversation by Claude Opus 4.7), not via separate Anthropic API calls — so there is no separate API bill for the translation itself. For reference, an equivalent batch via the prompt's Python+SDK approach (Sonnet 4.5 for paragraphs/examples, Opus 4.1 for poetry, Quran.com API for verses) would have projected to roughly **$5–8 USD** for all 50 files based on average input/output token estimates.
