# Feature Specification: Marketing Landing Page

**Feature Branch**: `002-landing-page`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Build the marketing landing page for the ArabSyntax website."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Arabic Visitor Discovers the App and Downloads It (Priority: P1)

An Arabic-speaking student or learner arrives at the root URL of the ArabSyntax
website — from a search result, a social media link, or word of mouth. They
scroll through the page in Arabic, reading about the app's features, how it
works, and pricing. Convinced, they tap the Google Play badge and are taken
directly to the app's Play Store listing.

**Why this priority**: This is the primary conversion flow. If an Arabic visitor
cannot read the page clearly, understand the value, and reach the download button,
the entire site fails its purpose. Every other story depends on this one working.

**Independent Test**: Load the root URL. Confirm the page renders in Arabic RTL.
Scroll through all eight sections. Tap the Google Play badge in the hero — a new
tab or window opens on the Play Store listing. Tap the badge in the final CTA —
same result.

**Acceptance Scenarios**:

1. **Given** a visitor loads the root URL, **When** the page renders, **Then**
   all eight sections are visible, all copy is in Arabic, layout is RTL, and the
   Cairo typeface is active.
2. **Given** a visitor taps the Google Play badge in the hero, **When** the link
   is activated, **Then** the browser opens the ArabSyntax Play Store listing.
3. **Given** a visitor taps the Google Play badge in the final CTA, **When** the
   link is activated, **Then** the browser opens the same Play Store listing.
4. **Given** a visitor is at the bottom of the page, **When** they scroll back up,
   **Then** the header navigation links (#features, #pricing, #faq) scroll
   smoothly to their respective sections.

---

### User Story 2 — English Visitor Discovers the App (Priority: P2)

An English-speaking visitor navigates to `/en`. They see the same eight sections
in English with LTR layout. They can download the app and understand all content
without any Arabic visible (except the brand name and in-section Arabic
typography samples if present).

**Why this priority**: The English audience is secondary but the page must be
fully functional and translated — not a stub.

**Independent Test**: Load `/en`. Confirm RTL is off, all section headings and
body copy are in English, the Inter typeface is active, and the Play Store badge
links correctly.

**Acceptance Scenarios**:

1. **Given** a visitor loads `/en`, **When** the page renders, **Then** all eight
   sections are visible in English with LTR layout and the Inter typeface.
2. **Given** a visitor taps either Google Play badge on the English page, **When**
   the link is activated, **Then** the Play Store listing opens.

---

### User Story 3 — Visitor Explores Features and How It Works (Priority: P2)

A visitor who is undecided reads the Features section (six feature cards) and the
"How it works" section (three numbered steps) to understand what the app offers
and how to use it.

**Why this priority**: These sections address the visitor's primary question:
"What does this app actually do?" Without them, the page cannot convert
undecided visitors.

**Independent Test**: Load the page, scroll to the Features section, and confirm
six distinct feature cards are visible with an icon (or illustration), a heading,
and a short description each. Continue scrolling to "How it works" and confirm
three numbered steps are visible.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the Features section, **When** the section
   renders, **Then** exactly six feature cards are visible, each with a heading
   and a description, in both locales.
2. **Given** a visitor scrolls to "How it works", **When** the section renders,
   **Then** three steps are visible, numbered and in order, in both locales.
3. **Given** the header navigation link #features is clicked, **When** the page
   scrolls, **Then** the Features section heading comes into view.

---

### User Story 4 — Visitor Reviews Pricing Before Downloading (Priority: P2)

A visitor who wants to know the cost before committing scrolls to the Pricing
section. They see a free tier description and three paid tiers (monthly, yearly,
lifetime). They see a note that previous purchasers keep all premium features.
Each paid tier has a button that takes them to the Play Store (purchases happen
in-app, not on the website).

**Why this priority**: Pricing is a key decision point. The absence of clear
pricing information or a confusing "buy" flow would cause visitor drop-off.

**Independent Test**: Scroll to the Pricing section. Confirm four offerings are
visible (free + three paid). Confirm the legacy purchaser note is present. Tap
any paid tier button — the Play Store listing opens. The page does not have any
in-page payment form.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to Pricing, **When** the section renders, **Then**
   one free tier and three paid tiers (monthly, yearly, lifetime) are displayed
   in both locales.
2. **Given** a visitor reads the Pricing section, **When** they look for legacy
   purchaser information, **Then** a clearly visible note states that users who
   previously purchased the app retain all premium features permanently.
3. **Given** a visitor taps a paid tier button, **When** the action is triggered,
   **Then** the Play Store listing opens — no in-page checkout or payment form
   appears.
4. **Given** the header navigation link #pricing is clicked, **When** the page
   scrolls, **Then** the Pricing section heading comes into view.

---

### User Story 5 — Visitor Gets Questions Answered via FAQ (Priority: P2)

A visitor with specific questions (about pricing, iOS availability, offline use,
or exam prep) scrolls to the FAQ section and uses the expandable accordion to
find answers without leaving the page.

**Why this priority**: Unanswered questions cause abandonment. The FAQ covers
the most common objections and prevents the visitor from bouncing to search for
answers elsewhere.

**Independent Test**: Scroll to the FAQ section. Confirm at least six questions
are listed. Click the first question — its answer expands. Click it again — it
collapses. Press Tab to focus the second question and press Enter — it expands.
Confirm a screen reader announces the expanded/collapsed state.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the FAQ section, **When** the section renders,
   **Then** at least six questions are visible in both locales, initially
   collapsed.
2. **Given** a visitor clicks an FAQ question, **When** the action completes,
   **Then** the answer expands below the question without a page reload.
3. **Given** an FAQ item is expanded, **When** the visitor clicks the same
   question again, **Then** the answer collapses.
4. **Given** a keyboard user focuses an FAQ question button and presses Enter or
   Space, **When** the action completes, **Then** the answer expands or collapses
   correctly.
5. **Given** a screen reader user navigates the FAQ, **When** they reach a
   question, **Then** the assistive technology announces whether the item is
   expanded or collapsed.
6. **Given** the header navigation link #faq is clicked, **When** the page
   scrolls, **Then** the FAQ section heading comes into view.

---

### User Story 6 — Visitor Sees Who the App Is For (Priority: P3)

A visitor who is unsure if the app applies to them reads the Target Audience
section, which presents two distinct groups: ثانوية عامة students and general
Arabic grammar learners. Each callout describes how the app helps that specific
audience.

**Why this priority**: The audience section reduces friction for visitors who
do not immediately self-identify as the app's target user. It is lower priority
because most visitors will have already decided by the time they reach this
section.

**Independent Test**: Scroll to the Target Audience section. Confirm two distinct
callout cards are visible side by side (or stacked on mobile), each with a
heading and a short description tailored to that audience, in both locales.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the Target Audience section, **When** the
   section renders, **Then** two distinct audience callouts are visible in both
   locales.
2. **Given** a visitor is a ثانوية عامة student, **When** they read the first
   callout, **Then** the content explicitly addresses exam preparation relevance.
3. **Given** a visitor is a general Arabic learner, **When** they read the second
   callout, **Then** the content addresses their general learning goals.

---

### User Story 7 — Visitor Views App Screenshots (Priority: P3)

A visitor who wants to see what the app looks like before downloading scrolls to
the Screenshots section and browses a gallery of real app screenshots.

**Why this priority**: Screenshots provide social proof without requiring
testimonials. They are lower priority than the conversion-critical sections but
increase confidence.

**Independent Test**: Scroll to the Screenshots section. Confirm a gallery of at
least three app screenshots is visible. Each screenshot has descriptive alt text
appropriate to the active locale.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls to the Screenshots section, **When** the section
   renders, **Then** at least three app screenshot images are visible with
   appropriate alt text in the active locale.
2. **Given** a visitor using a screen reader reaches the Screenshots section,
   **When** they navigate to each image, **Then** the screen reader announces
   the alt text describing what the screenshot shows.

---

### Edge Cases

- What happens when a screenshot image fails to load? A placeholder or the
  `next/image` default placeholder must appear — no broken image icons.
- What happens when a visitor arrives via a header anchor link (e.g., `/en#faq`)?
  The page must scroll to the correct section in the correct locale.
- What happens on a 320 px viewport? All sections must be single-column, no
  horizontal overflow. The two-column Audience section stacks vertically.
- What happens when the visitor has prefers-reduced-motion enabled? Any scroll
  animation or section entrance animation must be disabled or reduced.
- What happens with very long Arabic text in a feature card? Cards must not
  break layout — they must wrap text gracefully.
- What happens when a visitor opens multiple FAQ items? Any number of items can
  be open simultaneously (no forced single-open behavior required).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The landing page MUST render all eight sections in the correct order:
  Hero, Features, How It Works, Screenshots, Pricing, Target Audience, FAQ,
  Final CTA.
- **FR-002**: Every section MUST render correctly in both Arabic (RTL) and English
  (LTR) with no layout defects caused by direction changes.
- **FR-003**: The Hero section MUST display: the app name, a tagline, a one-sentence
  value proposition, a Google Play badge linking to the Play Store listing, and
  an app screenshot in a phone mockup.
- **FR-004**: The Features section MUST display exactly six feature cards: audio
  lessons, structured content, interactive quizzes, exam prep for ثانوية عامة,
  worked examples with إعراب, and offline access. Each card MUST have a heading
  and a description.
- **FR-005**: The "How It Works" section MUST display exactly three numbered steps:
  pick a lesson, listen and learn, test yourself.
- **FR-006**: The Screenshots section MUST display a gallery of at least three app
  screenshots, each with locale-appropriate alt text.
- **FR-007**: The Pricing section MUST display one free tier and three paid tiers:
  monthly, yearly, and lifetime. Each paid tier MUST have a label, a feature list,
  and a button that opens the Play Store listing. There MUST be no in-page payment
  or checkout flow.
- **FR-008**: The Pricing section MUST include a clearly visible notice that users
  who previously purchased the app (legacy purchasers) retain all premium features
  permanently.
- **FR-009**: The Target Audience section MUST display two callouts: one for
  ثانوية عامة students and one for general Arabic grammar learners.
- **FR-010**: The FAQ section MUST contain at least six questions covering: the
  difference between free and paid tiers, offline use, iOS availability, legacy
  purchaser status, exam prep relevance, and at least one additional topic.
- **FR-011**: Each FAQ item MUST expand to show its answer when activated and
  collapse when activated again. Multiple items MAY be open simultaneously.
- **FR-012**: The Final CTA section MUST contain a closing headline and a Google
  Play badge linking to the Play Store listing.
- **FR-013**: The Google Play badge MUST appear in at least the Hero section and
  the Final CTA section, and MUST link to the same Play Store URL in both
  locations.
- **FR-014**: The page MUST support smooth scrolling to anchor targets
  (#features, #pricing, #faq) when the corresponding header navigation links
  are activated.
- **FR-015**: Every user-visible string on the page MUST come from locale message
  files. No text may be hardcoded in components except the brand name "ArabSyntax"
  and non-translatable proper nouns.
- **FR-016**: All page images MUST have descriptive alt text in the active locale.
  Decorative images MUST use an empty alt attribute.
- **FR-017**: The FAQ accordion MUST be operable by keyboard (Tab to focus, Enter
  or Space to activate) and MUST expose its expanded/collapsed state to assistive
  technologies.
- **FR-018**: The page MUST be fully responsive from 320 px to 1920 px viewport
  widths with no horizontal scrollbar at any breakpoint.
- **FR-019**: The two-column Target Audience layout MUST collapse to a single
  column on viewports below the tablet breakpoint.
- **FR-020**: The page MUST have one `<h1>` element (the hero heading). Section
  headings MUST use `<h2>`. No heading levels may be skipped.

### Key Entities *(include if feature involves data)*

- **Section**: A named content block on the landing page (Hero, Features, etc.).
  Ordered, static content — no dynamic data source.
- **Feature card**: A content unit with an icon identifier, heading, and
  description. Six instances, defined statically in message files.
- **Pricing tier**: A content unit with a tier name, price label, feature list,
  and a CTA button URL. Four instances (free + three paid), defined statically.
- **FAQ item**: A content unit with a question and an answer. Minimum six
  instances, expandable/collapsible.
- **App screenshot**: An image with a filename, dimensions, and locale-appropriate
  alt text. Minimum three instances.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: The landing page renders all eight sections in the correct order in
  both Arabic and English with zero layout defects caused by RTL/LTR switching.
- **SC-002**: Both Google Play badge instances link to the same Play Store URL —
  verified by inspecting both `href` values and confirming they match.
- **SC-003**: All six FAQ items expand and collapse correctly via mouse click and
  keyboard (Tab + Enter/Space) — 100% of items must respond correctly in both
  locales.
- **SC-004**: The page renders without horizontal scroll at 320 px, 768 px,
  1280 px, and 1920 px viewport widths in both locales.
- **SC-005**: Lighthouse Accessibility score is 95 or higher on the landing page
  in both locales.
- **SC-006**: Lighthouse Performance score is 95 or higher on the landing page
  in both locales.
- **SC-007**: The anchor navigation links (#features, #pricing, #faq) each scroll
  the page to their target section — verified in both locales.
- **SC-008**: Zero user-visible strings are hardcoded in landing page components
  (verified by code review — all copy sourced from locale message files, except
  "ArabSyntax").
- **SC-009**: The Pricing section prominently displays the legacy purchaser notice
  — visible without scrolling within the section on a desktop viewport.
- **SC-010**: All screenshots have non-empty, locale-appropriate alt text.

## Assumptions

- The Play Store URL for ArabSyntax is a single fixed URL used in all badge
  links across the page. The exact URL is to be provided by the project owner
  before implementation; a placeholder URL is acceptable during development.
- App screenshots are real image assets available in `public/screenshots/`
  before the Screenshots section is implemented. Placeholder images are
  acceptable during development but must be replaced with real assets before
  the feature is marked done.
- The phone mockup in the Hero section is an image asset (provided by the
  project owner) or a CSS-only dark-rounded frame around a screenshot.
  Either approach is acceptable; the choice is deferred to the implementation plan.
- Pricing tier names and prices are defined in message files and are
  intentionally left as placeholders (e.g., "X ريال / month") until finalized.
  The page structure and layout are not blocked by final pricing numbers.
- The six FAQ questions and answers provided in message files will be written
  with real content (no Lorem Ipsum), because FAQ quality directly impacts
  conversion.
- The Screenshots section displays images statically — there is no carousel or
  swipe interaction in v1. A horizontal scroll or grid layout is acceptable.
- The Google Play badge image is available in `public/badges/` as a standard
  Google Play badge asset. An App Store badge is NOT included (iOS is out of
  scope for v1).
- The landing page does not require a sitemap entry beyond what is already
  covered by the foundation's sitemap.ts; the landing page is the root page and
  will be included automatically.
- Social proof (testimonials, ratings) is explicitly out of scope per the
  feature description. A placeholder section slot is NOT needed.
- SEO metadata (title, description, Open Graph) for the landing page is in scope
  for this feature and is part of the page's `metadata` export, since it
  directly impacts the app's discoverability and is required by the constitution.
