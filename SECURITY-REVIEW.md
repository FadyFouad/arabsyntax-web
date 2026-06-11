# Security Review — Google Safe Browsing "Deceptive pages"

- **Date:** 2026-06-12
- **Domain:** alnahwalkafi.com (Cloudflare Workers / OpenNext)
- **Production version reviewed:** `c3fd4413` (main @ `653ad7b`)
- **Trigger:** Google Search Console → Security Issues → **"Deceptive pages"**, with **Sample URLs: N/A**

## Verdict

**Not a compromise. Not current deceptive content.** The live site is clean across every
surface tested. The flag *is* present in Google's Safe Browsing data, but no production
content substantiates it (hence `Sample URLs: N/A`). Most consistent with a **stale /
false-positive flag on a brand-new domain**, awaiting re-evaluation. **Safe to request a
review.**

| Hypothesis | Verdict | Basis |
| --- | --- | --- |
| Current issue in production | **No** | No deceptive content/scripts/redirects on any page |
| Historical, not re-evaluated | **Likely** | Flag in Google data + `Sample URLs: N/A` + clean current content |
| False positive | **Likely** | 2-day-old domain, app-marketing pattern, crawled mid-launch |
| Compromised (page/script/asset/dependency/redirect) | **Ruled out** | First-party-only scripts, SRI-locked beacon, strict CSP, no injection, clean git history |

## Decisive context: the domain is 2 days old

RDAP (Verisign, authoritative for `.com`): **registered `2026-06-10T21:14:57Z`**, expires
2027-06-10. A brand-new domain has zero reputation and is treated with maximal suspicion by
Safe Browsing. The site was **actively deployed and hardened during those same 48 hours**
(~12 security/launch commits on 2026-06-11: static sitemap/robots/favicon migration,
security headers, edge 404 guards, secure cookies, CSP). Google likely crawled the domain
while it was in flux — plausibly catching a **registrar parking page** (a classic
"deceptive/social-engineering" false-positive trigger on freshly-registered domains before
DNS is fully pointed at the real host). This is the leading benign explanation and fits all
observations: new domain, `N/A` sample URLs, clean current content, flag pending review.

## Evidence (verified against live production as Googlebot)

**Indexed routes** — all 170 sitemap URLs enumerated; representative pages of every type
fetched. Deceptive/phishing keyword scan (EN + AR — "verify account", "virus detected",
"فيروس", "جائزة", …) → **clean on every page**.

**Scripts / third-party / ads / injection** — every `<script src>` is **first-party**
(`/_next/static/chunks/*`) except one: `static.cloudflareinsights.com/beacon.min.js`
(Cloudflare's official Web Analytics, loaded with an **SRI `integrity` hash**). No ad
networks, no trackers, **no iframes, no `meta refresh`, no inline `on*` handlers, no
obfuscation** (`eval`/`atob`/`document.write`/`fromCharCode`/miners). CSP is restrictive
(`default-src 'self'`; scripts limited to self + that one Cloudflare host).

**Redirects / external links** — no redirects/rewrites configured. **No open redirect**:
`?next=https://evil…` is ignored (200, no redirect); `//evil.example.com` normalizes to the
**same-origin** path `/evil.example.com` → **404** (never leaves the domain). External links
go **only** to the real App Store (`id6448959921`) and Play Store (`com.etateck.arabsyntax`).

**robots / sitemap / manifest / service worker / assets** — `robots.txt` = `Allow: /`
(nothing hidden); sitemap = 170 valid URLs; manifest legit; **no service worker** (0
registration refs); `public/` holds only expected static assets (app-store badges, favicons,
logos, OG image, screenshots, `security.txt`) — **no uploads, no stray HTML/PHP/JS**.

**Cloudflare** — Worker routes to the custom domain only; security headers applied; beacon is
the official SRI-locked Cloudflare script; no edge redirects to foreign hosts.

**Git history (entire repo, all branches)** — **never** contained an `<iframe>`, `eval`,
`document.write`, `atob`, or any third-party script host. The only non-store/non-self
external strings ever committed are dependency **funding URLs in `package-lock.json`**
(`paypal.me`, `opencollective.com`, … — not executed, not served) and **honeypot test
fixtures** (`http://spam.example`). Pre-rebrand `arabsyntax.com` also appears — benign.

## Safe Browsing transparency report (calibrated)

The undocumented status response was calibrated against known sites:

```
example.com (clean)                 -> [..., false,false,false,false,false, <ts> ]   all-clear
wikipedia.org (clean)               -> [..., false,false,false,false,false, <ts> ]   all-clear
malware.testing.google.test (BAD)   -> [..., TRUE, false,false,false,false, <ts> ]   flagged
alnahwalkafi.com                    -> [..., false,false,TRUE, false,false, 0  ]      flagged (diff. category)
```

alnahwalkafi.com is **not** in the all-clear state clean sites show — it carries a threat
flag (a different position than malware, consistent with the social-engineering category
Search Console reports). Its **timestamp is `0`** (every other site had a real timestamp),
consistent with a **provisional/auto flag** rather than a substantiated, dated determination.

## Limitations

- Google's internal classifier reasoning is not exposed; "Deceptive pages" with `N/A` URLs
  gives no specific trigger.
- The transparency-report API is undocumented; the read above is *calibrated* (clean vs.
  known-bad). What is **confirmed** is "non-clean status / flag present," not the exact label.
- Current production + full git history are verifiable, but not whatever a transient
  registrar/parking page may have served in the domain's first hours before the real deploy.

## Recommendation — request the review

The precondition for a Safe Browsing review ("the site is clean now") is met.

1. Confirm the clean build is live (verified: deploy `c3fd4413`).
2. Search Console → **Security Issues → "Deceptive pages" → Request Review.** Note that the
   site is the **official marketing site** for the published app (Play `com.etateck.arabsyntax`,
   App Store `id6448959921`), recently launched on a new domain, with no deceptive content,
   strict CSP, and first-party resources only.
3. Optionally URL-Inspect → Request Indexing on `/` to nudge a fresh crawl.
4. Reviews typically clear within a few days when the site is clean.

## How to re-verify (reproduce this audit)

- Routes/scripts/links/forms: fetch each sitemap URL as Googlebot and inspect `<script src>`
  hosts, external link hosts, iframes, `meta refresh`, inline `on*`, and obfuscation patterns.
- Redirects: request `?next=…` and `//host` variants without following redirects; confirm
  same-origin landing.
- Headers: verify **case-insensitively** (Cloudflare HTTP/2 lowercases worker headers).
- Safe Browsing: compare the transparency-report status against a known-clean and a
  known-bad (`malware.testing.google.test`) site.
- Domain age: RDAP `https://rdap.verisign.com/com/v1/domain/ALNAHWALKAFI.COM`.
