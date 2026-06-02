# Feature Specification: Launch Polish — Real Brand, Real App

**Feature Branch**: `005-launch-polish`
**Created**: 2026-04-11
**Status**: Draft
**Input**: User description: "Polish the Al-Nahw Al-Kafi marketing website so it accurately represents the real app and is ready for production launch. The site is currently complete but uses a placeholder brand name ('ArabSyntax') and contains content that doesn't match the real app."

## Summary

The marketing site's structure, sections, and visual design are complete, but
the content it presents to visitors is still a placeholder sketch. Every
visible surface refers to the project by an English working name ("ArabSyntax")
that has never been the real product, describes the app in generic terms that
do not mention its actual audiences, and makes claims about pricing and data
handling that contradict what the live Google Play listing declares. The legal
pages reference subscriptions and payment flows the app does not have.

This feature replaces every placeholder with the truth about the real app,
adds a small amount of trust signalling drawn from the live Play Store listing,
and hides one section (pricing) whose content is not yet decided. After this
feature is complete, the site can be linked from the two app store listings
without misrepresenting the product, and a visitor who compares the site against
the app and the Play Store listing will find them consistent.

Out of scope: redesigning any section, adding new sections or routes, capturing
real in-app screenshots, generating a new Open Graph image (documented and
deferred), implementing the freemium pricing logic behind the flag, and changing
the dark theme or color tokens.

## Clarifications

### Session 2026-04-11

All five questions from the clarify loop were resolved in-line by the
`/speckit.plan` hint that followed.

- Q: What is the real Google Play Android package ID for the app? → A:
  `com.etateck.arabsyntax`. This is the real Play Store identifier. The
  substring `arabsyntax` inside it is a legacy infrastructure identifier
  preserved exactly per FR-004 — it is not user-visible and is not fixed
  by this feature.
- Q: What is the canonical contact email for the Privacy Policy, Terms
  of Service, support page, and Resend sender? → A: `fady.fouad.a@gmail.com`.
  The placeholder `support@arabsyntax.com` currently wired through
  `app/[locale]/support/page.tsx` and `lib/email/resend.ts` is replaced by
  this address (plus the Resend from-name is rebranded).
- Q: Which price currency should the JSON-LD `offers.priceCurrency` use
  given the app is free? → A: `USD`. The offer price stays `"0"`; USD
  keeps the structured data portable across locales without implying a
  specific regional price for a free product.
- Q: When the pricing feature flag is `false`, how should the existing
  `#pricing` anchor behave? → A: The pricing nav link is removed from
  header + mobile menu + footer entirely (rendered conditionally from
  `featureFlags.showPricing`), its strings remain in the message files,
  and no replacement anchor is exposed. Flipping the flag to `true`
  restores the link automatically.
- Q: What is the composition of the free-to-download callout that
  replaces the hidden pricing section? → A: A small centered server
  component rendering a `SectionHeading` plus a single `PlayStoreBadge`
  CTA. Text-only would be weaker; a full card grid would duplicate the
  hero social proof. The middle ground keeps the section meaningful
  without rebuilding pricing.

## User Scenarios & Testing *(mandatory)*

### User Story 1 — A prospective learner sees the real product (Priority: P1)

An Arabic-speaking adult who has never heard of the app is searching for a way
to study Arabic grammar. They click a link to the website from a search result
or from an app store listing. The site they land on is in Arabic by default,
introduces itself as "النحو الكافي", explains in one sentence that it teaches
Arabic grammar through structured lessons and quizzes, mentions both general
learners and high school exam students, and immediately below the download
buttons displays a single line of trust signal showing the Play Store rating
and review count. The visitor can tap either the App Store or Google Play
badge and land on the real store listing.

**Why this priority**: This is the reason the site exists. If the hero,
download buttons, and store links are wrong on launch day, everything else is
wasted. The site is going to be linked from the app store listings themselves
and from social shares, so the hero is the first impression of the entire
product for a new visitor.

**Independent Test**: Load the root URL in a fresh browser with no language
preference set. The hero shows "النحو الكافي" (not "ArabSyntax"), reads in
natural Arabic, mentions both audience tracks, and shows one line of social
proof below the download buttons with the star rating, review count, and
source. Tapping each badge opens the correct store listing in a new tab.
Switching to `/en` shows the same information in English with the Latin
romanization "Al-Nahw Al-Kafi".

**Acceptance Scenarios**:

1. **Given** a first-time visitor with no language preference, **When** they
   load the root URL, **Then** the page `<title>`, the hero headline, the
   logo in the header, and the copyright line in the footer all say
   "النحو الكافي" (Arabic) and never say "ArabSyntax".
2. **Given** the Arabic hero is visible, **When** the visitor reads the
   copy, **Then** the tagline and value proposition together communicate
   (a) the brand name, (b) that the app teaches Arabic grammar through
   lessons, examples and quizzes, and (c) that it serves both general
   learners and ثانوية عامة exam students.
3. **Given** the hero download buttons are visible, **When** the visitor
   looks immediately below them, **Then** they see a single short line
   stating the star rating, the review count, and that the source is
   Google Play. The line is a trust signal, not a testimonials block.
4. **Given** the visitor switches the UI to English via `/en`, **When** the
   page reloads, **Then** the same three pieces of information appear in
   English prose using the brand form "Al-Nahw Al-Kafi" (with hyphens,
   never shortened, never spelled as one word).
5. **Given** the visitor taps the App Store badge or the Google Play badge,
   **When** the tap completes, **Then** a new tab opens at the real store
   listing for the app (not at a placeholder or example URL).

---

### User Story 2 — A search engine and a social share preview are accurate (Priority: P1)

A third party shares a link to the site in a chat app, on social media, or via
a search engine result snippet. The preview shown to the recipient reflects
the real product: the title uses "Al-Nahw Al-Kafi" or "النحو الكافي" depending
on locale, the description matches what the app actually does, the Open Graph
image does not show the wrong brand name, and the structured data surfaced to
search engines describes the correct app with the correct store URLs and the
correct aggregate rating.

**Why this priority**: The site will be linked from the app store listings
themselves, from the developer's own sharing, and eventually from search
results. Every one of those entry points preloads a preview or an SEO snippet.
Getting these wrong on day one would mean every shared link for the lifetime
of those caches advertises the wrong brand. This has to be right before launch.

**Independent Test**: Use any standard OG-tag previewer and any JSON-LD
validator against both the Arabic root URL and the English root URL. The
title, description, site name, Twitter card title, and og:image URL all
reflect the real brand. The JSON-LD `SoftwareApplication` block on the landing
page carries the real app name, both store URLs, a price of `0`, and an
`aggregateRating` of `4.7` with `ratingCount` at least `2600`. A full codebase
search for the literal string "ArabSyntax" returns zero matches in any
user-visible surface.

**Acceptance Scenarios**:

1. **Given** an OG-tag previewer fetches the Arabic root URL, **When** it
   renders the preview, **Then** `og:title`, `og:site_name`, and
   `og:description` all use "النحو الكافي" (not "ArabSyntax"), and the
   `og:image` URL returns a file whose visible contents do not show the
   placeholder brand.
2. **Given** a JSON-LD validator parses the landing page, **When** it
   reads the `SoftwareApplication` entity, **Then** `name` is "Al-Nahw
   Al-Kafi" (English) or "النحو الكافي" (Arabic), `offers.price` is `"0"`,
   `aggregateRating.ratingValue` is `"4.7"`, and `aggregateRating.ratingCount`
   is at least `"2600"`.
3. **Given** the JSON-LD block contains the `installUrl` / `downloadUrl`
   fields (or equivalent), **When** each URL is followed, **Then** it
   resolves to the real App Store or Google Play listing for the app.
4. **Given** the sitemap is fetched, **When** it is parsed, **Then** it
   lists every canonical route for both locales (`/`, `/en`, `/privacy`,
   `/en/privacy`, `/terms`, `/en/terms`, `/support`, `/en/support`), and
   no entry contains the word "arabsyntax" in its metadata.
5. **Given** a grep for the literal string "ArabSyntax" across the repo,
   **When** it is run, **Then** it returns zero matches inside any file
   that ships to the browser or to a crawler (components, messages,
   MDX content, metadata, sitemap, structured data, alt text). Matches
   inside historical spec documents under `specs/00[1-4]-*/` are
   acceptable and are not fixed.

---

### User Story 3 — A cautious visitor reads the legal pages and sees the truth (Priority: P1)

A privacy-conscious visitor, a parent of a student, or a compliance reviewer
opens the Privacy Policy and the Terms of Service before installing the app.
Each page is dated, is legible, matches the live Google Play Data Safety
declaration for the app, does not promise things the app does not do, and
does not reference any commercial concept that the app does not use. The
Privacy Policy explicitly addresses children because the app is suitable for
minors, and both pages include a working contact email.

**Why this priority**: Google Play requires the Privacy Policy link on the
listing to match the Data Safety form. A mismatch is a policy violation that
can remove the app from the store. The terms referencing subscriptions and
refunds describe a business model the app has never had — leaving them as-is
would confuse users and misrepresent the developer. This has to be correct
before the link is attached to the live listings.

**Independent Test**: Open `/privacy` and `/en/privacy`. The policy lists the
same three data categories that the live Google Play listing declares under
Data Safety (App activity, App info and performance, Device or other IDs),
states explicitly that the developer does not collect data, states that data
is not encrypted in transit, states that data cannot be deleted on request,
has a dedicated children's privacy section, and shows a contact email that
the visitor can copy. Open `/terms` and `/en/terms`. The terms contain the
words "free" or "at no cost" or equivalent, and contain zero occurrences of
"subscription", "refund", "billing", "auto-renew", "legacy", or "purchaser".
Both pages show a "last updated" date that is not older than the date of this
feature.

**Acceptance Scenarios**:

1. **Given** the English Privacy Policy is loaded, **When** its "Data we
   share" section is read, **Then** it lists exactly these three categories
   and only these three: App activity, App info and performance, Device or
   other IDs.
2. **Given** the Privacy Policy is loaded in either locale, **When** its
   "Data we collect" section is read, **Then** it states that the developer
   itself does not collect data from the visitor.
3. **Given** the Privacy Policy is loaded in either locale, **When** the
   reader looks for transport and deletion disclosures, **Then** the page
   states that shared data is not encrypted in transit and that users cannot
   request deletion of shared data.
4. **Given** the Privacy Policy is loaded in either locale, **When** the
   reader reaches the end, **Then** there is a clearly marked children's
   privacy section and a working contact email.
5. **Given** the Privacy Policy is loaded in either locale, **When** a grep
   is run against its rendered text, **Then** it contains no mention of
   Firebase Authentication, Firestore, in-app purchases, subscriptions,
   or any analytics vendor the app does not actually ship.
6. **Given** the Terms of Service are loaded in either locale, **When**
   searched, **Then** they contain no occurrences of "subscription",
   "auto-renew", "refund", "billing cycle", "legacy purchaser", or any
   equivalent phrase in Arabic.
7. **Given** the Terms of Service are loaded, **When** read top-to-bottom,
   **Then** they cover acceptance of terms, the license granted to use
   the app, intellectual property, disclaimer of warranties, limitation
   of liability, and contact information — in that order.

---

### User Story 4 — A visitor does not see pricing they cannot act on (Priority: P2)

A visitor who scrolls the landing page does not see a pricing section that
advertises plans the app does not yet offer. In its place, they see a small
callout that confirms the app is free to download. The underlying pricing
section code is still in the repository so that a later feature can re-enable
it once the freemium tiers are finalized.

**Why this priority**: Showing a pricing section with plans the app cannot
fulfil is worse than showing nothing. Removing it entirely, though, would
mean rebuilding it later when the plans are finalized. A feature flag solves
both problems.

**Independent Test**: Load the landing page in either locale. The pricing
section is not rendered and does not occupy vertical space in the DOM. In
its place is a small callout that states the app is free to download. Flip
the value of the feature flag constant to `true` in `lib/featureFlags.ts`,
rebuild, and reload — the original pricing section appears in its original
location with its original content. No other section is affected.

**Acceptance Scenarios**:

1. **Given** the feature flag for pricing is `false`, **When** the landing
   page is rendered in either locale, **Then** the pricing section is
   absent from the DOM and the small "free to download" callout is shown
   at its original vertical location.
2. **Given** the feature flag for pricing is flipped to `true`, **When**
   the landing page is rendered, **Then** the original pricing section
   appears at its original location and the small callout is hidden.
3. **Given** the pricing section is hidden, **When** the page's anchor
   navigation (`#pricing`) is tested, **Then** either the anchor is
   removed from nav links or it scrolls to the free-to-download callout.
4. **Given** the feature flag defaults in `lib/featureFlags.ts` are read,
   **When** no override is applied, **Then** the default for the pricing
   flag is `false`.

---

### User Story 5 — The audience section treats both audiences as equals (Priority: P2)

A visitor who scrolls past the hero reaches a section that describes who the
app is for. The section presents two audience tracks with equal visual
weight: general Arabic / Quran learners worldwide, and Egyptian ثانوية عامة
students preparing for exams. Neither track is visually larger, more
prominent, or written as an afterthought.

**Why this priority**: The app already serves both audiences today and the
exam-prep audience is responsible for much of the review count that the
hero is about to advertise. Underweighting either audience on the home page
would misrepresent the product and alienate whichever group feels relegated.
This is content correctness, not structural work.

**Independent Test**: Load the landing page. Scroll to the audience section.
Two cards appear side by side on desktop and stacked on mobile. The two
cards have the same width, the same height (or visually balanced heights),
and the same level of visual treatment. The first card describes general
learners worldwide; the second describes ثانوية عامة students. Swapping
their order does not make one look more important than the other.

**Acceptance Scenarios**:

1. **Given** the audience section is rendered at desktop width, **When**
   the two cards are inspected, **Then** they occupy the same column
   width and use the same card component.
2. **Given** the audience section is rendered at mobile width, **When**
   the cards stack, **Then** both cards use the same visual treatment
   and neither card is skipped or truncated.
3. **Given** the audience section content is read in Arabic, **When** the
   ثانوية عامة card is read, **Then** the Arabic copy uses natural Arabic
   terminology familiar to Egyptian exam students.

---

### User Story 6 — The FAQ answers match the real app (Priority: P2)

A visitor opens the FAQ looking for answers to the questions most likely to
block them from installing. The answers they find match the real app: the
app is free, it is available on both Google Play and the App Store, and it
is suitable for both general learners and exam students. No answer
references freemium plans, subscription tiers, or platform exclusivity that
does not exist.

**Why this priority**: The FAQ is where visitors verify what they suspect
from the hero. If it repeats outdated claims (freemium, subscription), it
contradicts the hero and the legal pages.

**Independent Test**: Load the landing page, scroll to the FAQ. Every
answer is consistent with: the app is free, the app is on both stores, the
app serves both audiences. No answer references a plan, subscription,
trial, refund, or coupon.

**Acceptance Scenarios**:

1. **Given** the FAQ is rendered in either locale, **When** a question
   about price is read, **Then** the answer states the app is free.
2. **Given** the FAQ is rendered, **When** a question about platforms
   is read, **Then** the answer confirms both Google Play and the App
   Store.
3. **Given** the FAQ is rendered, **When** a question about who the app
   is for is read, **Then** the answer mentions both general learners
   and exam-prep students.

---

### Edge Cases

- **The Open Graph image cannot be generated in this pass.** This is an
  explicit out-of-scope item. The site must still ship with a working
  `og:image` response. Until the real image is produced, the site must
  reference a path for the image and a `LAUNCH_TODO.md` (or equivalent)
  must document the exact asset path, target dimensions, and brand
  treatment so a designer can produce it before the link is published.
  The placeholder file at that path must not display the old "ArabSyntax"
  wordmark.
- **The pricing anchor (`#pricing`) is linked from the nav or footer.**
  When the pricing section is hidden by the feature flag, any internal
  anchor link that pointed to `#pricing` must either be removed or
  redirected to a still-visible element (for example, the free-to-download
  callout) so that clicking it does not scroll to nothing.
- **Google Play review count grows.** The hero social proof line uses
  "2,600+" (and the Arabic equivalent). The trailing `+` is deliberate so
  that the line stays accurate when the review count grows past `2,600`
  without an urgent copy edit. The structured-data `ratingCount` may be
  any integer ≥ `2600`.
- **The star rating changes.** `4.7` is the current value. If it drops to
  `4.6` or rises to `4.8`, the copy and the structured data must be
  updatable in a single place per locale (ideally a single config
  constant), not across multiple files.
- **"Al-Nahw Al-Kafi" is mis-spelled.** The hyphenated Latin form is
  non-negotiable. Any form without hyphens ("Al Nahw Al Kafi"), any
  concatenated form ("AlNahwAlKafi"), or any casual shortening ("Alkafi",
  "Nahw Kafi") is incorrect and must not appear anywhere in the site,
  including alt text and structured data.
- **The constitution says the brand exception is "ArabSyntax".** The
  project constitution currently allows "ArabSyntax" as a hardcoded
  non-translated string. This spec does not amend the constitution.
  A separate `/speckit.constitution` pass is expected to update the
  brand name exception to "Al-Nahw Al-Kafi" / "النحو الكافي" at or
  before the landing of this feature.
- **Lighthouse regressions.** Any change made here (additional
  structured-data block, additional OG tags, added JSON strings) must
  not drop Performance, Accessibility, Best Practices, or SEO below
  `95`. If a change would, it must be revised or reverted.

## Requirements *(mandatory)*

### Functional Requirements

#### Brand rename

- **FR-001**: The site MUST display the brand as "النحو الكافي" in the
  Arabic locale and as "Al-Nahw Al-Kafi" in the English locale, and MUST
  do so consistently in the header logo, page titles, metadata titles
  and descriptions, Open Graph tags, structured data, sitemap
  title/description fields (where present), hero headline, footer
  copyright line, email sender name (if rendered in the UI), and every
  other user-visible surface.
- **FR-002**: The English romanization MUST always be "Al-Nahw Al-Kafi"
  with hyphens between every segment. Forms without hyphens, concatenated
  forms, and casual shortenings ("Alkafi", "Nahw Kafi", "Kafi") MUST NOT
  appear anywhere in the site.
- **FR-003**: A codebase search for the literal string "ArabSyntax" across
  `messages/`, `components/`, `app/`, `content/`, `public/` (where text is
  embedded), and any other directory that ships to the browser MUST
  return zero matches. Matches inside `specs/00[1-4]-*/` historical
  documents are allowed.
- **FR-004**: The only acceptable references to the legacy placeholder
  inside infrastructure identifiers that visitors never see (for example,
  an Android application ID embedded inside a store URL) MAY remain as-is.
  Such references MUST be documented in the feature's research or
  quickstart notes so that a later audit understands why they persist.

#### Hero copy and social proof

- **FR-005**: The hero in each locale MUST communicate, in the space
  above the download buttons, (a) the brand name, (b) that the app
  teaches Arabic grammar through structured lessons, examples, and
  quizzes, and (c) that it serves both general Arabic / Quran learners
  and Egyptian ثانوية عامة exam students.
- **FR-006**: The Arabic hero copy MUST be written in natural, fluent
  Arabic. Diacritics MAY be used where they materially aid clarity;
  excessive diacritics are discouraged.
- **FR-007**: Immediately below the hero download buttons, the page MUST
  display a single-line trust signal containing the star rating, the
  review count, and the source. In English this reads as, or is
  functionally equivalent to, "4.7 stars · 2,600+ reviews on Google Play".
  In Arabic it reads as an equivalent natural-Arabic phrasing.
- **FR-008**: The hero trust-signal line MUST NOT be styled or laid out
  as a full testimonials section. It is a small text element, not a
  composite card block.

#### Store links

- **FR-009**: The App Store badge MUST link to the real Apple App Store
  listing for the app (the listing URL currently hard-coded in
  `AppStoreBadge.tsx` is the correct one and does not require change as
  part of this feature).
- **FR-010**: The Google Play badge MUST link to the real Google Play
  listing for the app. The current value in `PlayStoreBadge.tsx` is a
  placeholder marked with a TODO comment and MUST be replaced with the
  real store URL before this feature is complete.

#### Audience section

- **FR-011**: The audience section MUST present exactly two audience
  cards of equal visual weight: one for general Arabic / Quran learners
  worldwide and one for Egyptian ثانوية عامة exam-prep students.
- **FR-012**: Both audience cards MUST use the same card component,
  occupy the same column width on desktop, and stack identically on
  mobile.

#### Pricing feature flag

- **FR-013**: The repository MUST contain a file `lib/featureFlags.ts`
  exporting a constant (for example, `PRICING_SECTION_ENABLED`) whose
  default value is `false`.
- **FR-014**: The landing page MUST render the existing pricing section
  only when the pricing feature flag is truthy. When the flag is
  falsy, the landing page MUST render, in the pricing section's
  original vertical location, a small callout that states the app is
  free to download in both locales.
- **FR-015**: When the pricing feature flag is falsy, any internal
  anchor navigation entry that points to `#pricing` MUST be removed or
  redirected to the free-to-download callout.
- **FR-016**: The existing `components/sections/Pricing.tsx` file and
  the pricing copy keys in `messages/ar.json` and `messages/en.json`
  MUST NOT be deleted. Flipping the feature flag to `true` MUST restore
  the previous rendering without any other code change.

#### Privacy Policy

- **FR-017**: The Privacy Policy (Arabic and English) MUST state
  explicitly that the developer does not collect data from the visitor.
- **FR-018**: The Privacy Policy MUST list, as the full set of data
  categories shared with third parties, exactly: (1) App activity,
  (2) App info and performance, (3) Device or other IDs. No other
  category may be named in that list.
- **FR-019**: The Privacy Policy MUST state that shared data is not
  encrypted in transit.
- **FR-020**: The Privacy Policy MUST state that shared data cannot be
  deleted on request.
- **FR-021**: The Privacy Policy MUST contain a dedicated children's
  privacy section that confirms the app is suitable for minors and
  explains, in plain language, what that means for the child user's
  data handling.
- **FR-022**: The Privacy Policy MUST contain a visible, copy-able
  contact email address for privacy inquiries.
- **FR-023**: The Privacy Policy MUST NOT reference Firebase
  Authentication, Firestore, Cloud Functions, or any other backend
  vendor the app does not actually use. It MUST NOT reference in-app
  purchases or subscription billing.
- **FR-024**: The Privacy Policy MUST show a "last updated" date that
  is equal to or later than the date this feature is merged.

#### Terms of Service

- **FR-025**: The Terms of Service (Arabic and English) MUST cover, in
  order and at minimum: acceptance of terms, license to use the app,
  intellectual property, disclaimer of warranties, limitation of
  liability, and contact information.
- **FR-026**: The Terms of Service MUST NOT reference subscriptions,
  billing cycles, auto-renewal, refunds, trial periods, coupons,
  legacy purchasers, or any other commercial concept that does not
  apply to a free app.
- **FR-027**: The Terms of Service MUST state that the app is free to
  use.
- **FR-028**: The Terms of Service MUST show a "last updated" date that
  is equal to or later than the date this feature is merged.

#### SEO metadata and structured data

- **FR-029**: Every page that exports `generateMetadata` MUST produce a
  `title` and `description` that reference the real brand name and
  reflect the page's actual content. Placeholder descriptions referencing
  the old brand are not acceptable.
- **FR-030**: Each page MUST export an `openGraph` metadata block
  containing at minimum `title`, `description`, `siteName`, `url`,
  `locale`, and `images` entries. The `siteName` MUST be the
  locale-appropriate brand form.
- **FR-031**: A sitemap and a robots configuration MUST exist at the
  conventional Next.js App Router locations and MUST list every
  canonical route for both locales. No sitemap entry may reference the
  old brand.
- **FR-032**: The landing page MUST embed a JSON-LD `SoftwareApplication`
  structured-data block whose `name` uses the locale-appropriate brand
  form, whose `applicationCategory` is educational, whose `offers.price`
  is `"0"` and `priceCurrency` is set (for example, `USD`), and whose
  `aggregateRating` contains `ratingValue` `"4.7"` and `ratingCount` of
  at least `"2600"`. The block MUST include links to both the Apple App
  Store and Google Play listings.
- **FR-033**: The structured-data aggregate-rating values (star rating
  and review count) and the social-proof copy MUST both be sourced from
  a single config module so that updating the rating in one place
  updates every surface that displays it.

#### Open Graph image

- **FR-034**: The Open Graph image referenced by the site's metadata
  MUST NOT visibly display the old "ArabSyntax" wordmark.
- **FR-035**: If a brand-correct Open Graph image cannot be produced in
  this feature, the repository MUST contain a `LAUNCH_TODO.md` (or
  equivalent) file that records (a) the path where the final image is
  expected, (b) its target dimensions (1200×630), (c) the required
  brand treatment in both locales, and (d) the fact that this item is
  blocking before the first public share of the site URL. A stand-in
  image at that path is acceptable as long as it does not display the
  wrong brand.

#### FAQ

- **FR-036**: The FAQ MUST contain answers consistent with: the app is
  free; it is available on both Google Play and the Apple App Store;
  it serves both general Arabic / Quran learners and Egyptian ثانوية
  عامة exam-prep students.
- **FR-037**: No FAQ answer may reference subscription tiers, freemium
  plans, trial periods, refunds, coupons, or platform exclusivity.

#### Footer

- **FR-038**: The footer MUST display the real brand name and a
  copyright line containing the developer identity ("ETA TECH" /
  "Fady Fouad") and the current year. The developer identity form is
  up to the implementation — ETA TECH alone, Fady Fouad alone, or
  both — but it must be present.

#### Accessibility and internationalization discipline

- **FR-039**: Every change introduced by this feature MUST respect the
  existing RTL / LTR discipline defined in the constitution. Physical
  direction Tailwind utilities (`pl-*`, `pr-*`, `ml-*`, `mr-*`, etc.)
  MUST NOT be introduced.
- **FR-040**: Every visible string added by this feature (including the
  social-proof line, the free-to-download callout, the rewritten privacy
  text, the rewritten terms text, the rewritten FAQ text, and the new
  metadata) MUST be sourced from `messages/{locale}.json` or from an
  equivalent per-locale source. Hardcoded user-visible English strings
  in JSX are forbidden except for brand forms.

### Key Entities

- **Brand identity**: The canonical Arabic form "النحو الكافي" and the
  canonical English romanization "Al-Nahw Al-Kafi". Both forms are
  referenced anywhere the site names the product. The English form is
  always hyphenated.
- **Aggregate rating**: A pair `{ ratingValue, ratingCount, source }`
  sourced from the live Google Play listing. Default seed values are
  `4.7`, `2600+`, and `Google Play`. Used by both the hero social
  proof line and the structured data block on the landing page.
- **Pricing feature flag**: A boolean constant in `lib/featureFlags.ts`
  (default `false`) that gates whether the landing page renders the
  existing pricing section or the free-to-download callout.
- **Data Safety declaration**: The three shared-data categories from
  the live Google Play Data Safety form (App activity, App info and
  performance, Device or other IDs) plus the three flags (no developer
  collection, not encrypted in transit, not deletable on request).
  Used by both the English and Arabic Privacy Policy.
- **Launch TODO record**: A tracked markdown file enumerating the
  explicit launch-blocking items that this feature deliberately
  deferred — currently only the real Open Graph image — and the exact
  asset path, dimensions, and brand treatment needed for each.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A full-text search for the literal string "ArabSyntax"
  across `app/`, `components/`, `content/`, `messages/`, `public/`
  (text-embedded assets), and the site's generated metadata returns
  zero matches. The only acceptable remaining matches are inside
  historical spec documents under `specs/00[1-4]-*/`.
- **SC-002**: A first-time Arabic-locale visitor can, within five
  seconds of landing on the root URL and without scrolling past the
  first viewport, identify (a) the brand name "النحو الكافي", (b)
  that it teaches Arabic grammar, and (c) that there is a trust signal
  giving the star rating and review count.
- **SC-003**: The English-locale hero communicates the same three
  facts (brand, what the app does, social proof) in equivalent first-
  viewport space.
- **SC-004**: The JSON-LD `SoftwareApplication` block on the landing
  page validates without errors in a standard JSON-LD validator and
  contains `aggregateRating.ratingValue` `"4.7"`, `aggregateRating
  .ratingCount` ≥ `"2600"`, `offers.price` `"0"`, and URLs resolving
  to the real App Store and Google Play listings.
- **SC-005**: The Privacy Policy, when diffed against the live Google
  Play Data Safety declaration, matches on all six claims (zero
  developer collection, three specific shared data categories, not
  encrypted in transit, not deletable on request).
- **SC-006**: The Terms of Service contain zero occurrences of
  "subscription", "refund", "billing", "auto-renew", "trial", "coupon",
  or "legacy" (and their Arabic equivalents).
- **SC-007**: With the pricing feature flag at its default `false`
  value, the pricing section does not appear in the rendered HTML of
  the landing page in either locale, and the free-to-download callout
  does appear at the section's original vertical location.
- **SC-008**: Flipping the pricing feature flag constant to `true`
  and rebuilding restores the pricing section to the landing page
  in both locales with no other change required.
- **SC-009**: Lighthouse audits of the Arabic landing page, the
  English landing page, and `/en/support` each score at least `95`
  on Performance, Accessibility, Best Practices, and SEO after this
  feature is merged.
- **SC-010**: The OG tags for every page render in a standard OG-tag
  previewer with (a) the correct locale-specific brand title, (b) a
  description reflecting the real app, and (c) an image URL that
  resolves to a file not displaying the placeholder wordmark.
- **SC-011**: Manual visual QA at 320 px, 768 px, and 1440 px in both
  Arabic and English locales shows the hero, the audience section,
  the free-to-download callout, the FAQ, and the footer rendering
  correctly with no layout regression relative to the pre-feature site.

## Assumptions

- The live Google Play Data Safety declaration for the app currently
  lists data sharing under the three categories in the spec (App
  activity, App info and performance, Device or other IDs), declares
  zero developer collection, declares data as not encrypted in transit,
  and declares data as not deletable on request. If this declaration
  changes before merge, the Privacy Policy in this feature must be
  updated to match the new declaration at the time of merge.
- The real Google Play Store listing URL for the app is available and
  can be substituted for the placeholder value currently in
  `components/ui/PlayStoreBadge.tsx`. If the URL is not yet available,
  the feature cannot complete — there is no acceptable placeholder
  for a production launch.
- The app's current star rating on Google Play is `4.7` and the
  review count is at least `2,600`. These values are used in both the
  hero social-proof line and the structured-data block. The feature
  uses a single config source so both can be updated atomically.
- The developer identity displayed in the footer is "ETA TECH" /
  "Fady Fouad". The exact presentation (trading name first, personal
  name first, or both) is a small editorial decision and does not
  require a clarifying question.
- The Open Graph image replacement is deliberately out of scope for
  this feature; a stand-in that does not display the wrong brand, plus
  a `LAUNCH_TODO.md` entry with the exact asset specifications, is
  acceptable for this feature's completion.
- The project constitution currently lists "ArabSyntax" as an allowed
  hardcoded non-translatable brand name. A separate
  `/speckit.constitution` pass is expected to update the exception to
  the new brand forms. This spec does not amend the constitution and
  does not block on that amendment, but the implementer should note
  that a brand-name exception update is required for constitutional
  consistency after merge.
- The FAQ section already exists with the current set of questions;
  this feature rewrites only the answers (and, where required for
  accuracy, the questions themselves) and does not add or remove
  questions.
- Pricing, when it eventually re-enables, will re-use the existing
  `Pricing.tsx` section component unchanged. This feature's only
  obligation to pricing is to hide the section behind the flag and
  preserve its code.
- No new routes are created by this feature. All edits are to existing
  routes, existing components, existing message files, existing legal
  MDX files, and a small set of new SEO surface files (sitemap,
  robots, structured-data helper, featureFlags, rating config,
  LAUNCH_TODO) that are conventional infrastructure and not
  user-visible "pages".
