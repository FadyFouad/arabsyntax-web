# Feature Specification: Site Foundation — Bilingual Shell

**Feature Branch**: `001-site-foundation`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Build the foundation for a bilingual marketing website for ArabSyntax, an Arabic grammar learning mobile app."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Arabic Default Experience (Priority: P1)

An Arabic-speaking student or learner visits the website for the first time by
typing the root URL into their browser. Without any language selection on their
part, the entire site is displayed in Arabic: the page direction is right-to-left,
the typeface is suited for Arabic script, and all navigation labels, footer copy,
and layout reflect an Arabic-first experience.

**Why this priority**: Arabic is the primary audience. If the default experience
is broken or mis-directed, every Arabic user is immediately lost. This is the
single most important correctness gate for the whole site.

**Independent Test**: Navigate to the root URL in a fresh browser session.
The page renders with RTL layout, Arabic text throughout, and an Arabic-friendly
typeface — with no English text visible except the brand name "ArabSyntax".

**Acceptance Scenarios**:

1. **Given** a user has no stored locale preference and navigates to the root
   URL, **When** the page loads, **Then** the page direction is right-to-left,
   all visible labels are in Arabic, and the body typeface is Arabic.
2. **Given** the page is loaded in Arabic, **When** a screen reader announces
   the page language, **Then** it reports Arabic (`ar`).
3. **Given** the root URL is loaded, **When** the layout renders at any
   viewport from 320 px to 1920 px wide, **Then** there is no horizontal
   scroll and all content is fully visible.

---

### User Story 2 — English Locale Experience (Priority: P2)

An English-speaking visitor navigates directly to the `/en` path. They see the
site in English: left-to-right layout, an English typeface, and all copy in
English including navigation and footer.

**Why this priority**: The English audience is secondary but the `/en` path must
be fully functional as a distinct locale — not a degraded fallback.

**Independent Test**: Navigate to `/en` in a fresh browser session. The page
renders with LTR layout, English text throughout, and an English typeface.

**Acceptance Scenarios**:

1. **Given** a user navigates directly to `/en`, **When** the page loads,
   **Then** the layout direction is left-to-right, all visible labels are in
   English, and the body typeface is English.
2. **Given** the `/en` page is loaded, **When** a screen reader announces the
   page language, **Then** it reports English (`en`).
3. **Given** `/en` is loaded, **When** the layout renders at any viewport from
   320 px to 1920 px wide, **Then** there is no horizontal scroll and all
   content is fully visible.

---

### User Story 3 — Language Switcher Preserves Current Page (Priority: P1)

A visitor who is on any page of the site (e.g., the FAQ page in Arabic) clicks
or taps the language switcher. The site immediately reloads in the other
language, and the visitor remains on the same page — they are not redirected
to the home page.

**Why this priority**: Losing the user's place when switching languages creates
confusion and increases bounce rate. The switcher must be both visible and
reliable.

**Independent Test**: Navigate to any deep path (e.g., `/faq`) in Arabic.
Activate the language switcher. Confirm the browser URL changes to `/en/faq`
and the page content is in English. Activate again — URL changes back to `/faq`
and content returns to Arabic.

**Acceptance Scenarios**:

1. **Given** a user is on the Arabic version of any page, **When** they
   activate the language switcher, **Then** the same page loads in English and
   the URL reflects the English locale path.
2. **Given** a user is on the English version of any page, **When** they
   activate the language switcher, **Then** the same page loads in Arabic and
   the URL no longer includes the `/en` prefix.
3. **Given** the language switcher is present in both the header and footer,
   **When** either instance is activated, **Then** both perform the same
   page-preserving switch.
4. **Given** the language switcher is a button or link, **When** a keyboard
   user focuses it, **Then** a visible focus indicator is present and the
   element is activatable via the Enter or Space key.

---

### User Story 4 — Shared Header on Every Page (Priority: P2)

Every page on the site displays a consistent header containing: the ArabSyntax
logo, navigation links to Features, Pricing, FAQ, and Support, and the language
switcher. The header adapts correctly to RTL and LTR layouts without any
visual defects.

**Why this priority**: The header is present on every page; a bug here affects
the entire site. It must render correctly in both directions before any page
content is built.

**Independent Test**: Load any page in both Arabic and English. Confirm the
header is visible, the logo appears on the correct side for each direction,
the navigation items are ordered and aligned correctly, and the language
switcher is accessible.

**Acceptance Scenarios**:

1. **Given** any page is loaded in Arabic, **When** the header renders,
   **Then** the logo appears at the right (start) side and navigation links
   flow from right to left.
2. **Given** any page is loaded in English, **When** the header renders,
   **Then** the logo appears at the left (start) side and navigation links
   flow from left to right.
3. **Given** a viewport narrower than the header's desktop breakpoint,
   **When** the header renders, **Then** it collapses to a mobile layout
   (e.g., hamburger menu) without horizontal overflow.
4. **Given** the header is rendered, **When** a keyboard user tabs through it,
   **Then** all links and the language switcher are reachable in a logical
   order with visible focus states.
5. **Given** any directional icons (arrows, chevrons) are used in the header,
   **When** the locale is Arabic, **Then** those icons are visually mirrored
   compared to the English layout.

---

### User Story 5 — Shared Footer on Every Page (Priority: P2)

Every page displays a consistent footer containing: product links, legal links,
support links, the language switcher, and a copyright notice. The footer
mirrors the header's RTL/LTR adaptation and is fully accessible.

**Why this priority**: The footer carries legal links (Privacy, Terms) that must
be reachable on every page. It must work in both locales before the legal pages
are built.

**Independent Test**: Load any page in both Arabic and English. Scroll to the
footer and confirm all link groups are present, aligned to the correct side for
each direction, and that the copyright text is visible.

**Acceptance Scenarios**:

1. **Given** any page is loaded, **When** the footer renders, **Then** it
   contains product links, legal links, support links, the language switcher,
   and a copyright notice.
2. **Given** the footer is rendered in Arabic, **When** a user inspects the
   layout, **Then** link groups are aligned to the right (start) and text flows
   right-to-left.
3. **Given** the footer is rendered in English, **When** a user inspects the
   layout, **Then** link groups are aligned to the left (start) and text flows
   left-to-right.
4. **Given** a keyboard user is navigating the footer, **When** they tab
   through all footer links, **Then** every link is reachable and shows a
   visible focus indicator.

---

### Edge Cases

- What happens when a user navigates to a path that doesn't include a valid
  locale prefix? The default Arabic locale must be applied and the content
  served without a redirect loop.
- What happens when JavaScript is disabled? The header, footer, and correct
  `lang`/`dir` attributes must still render correctly (server-rendered output).
- What happens on extremely narrow viewports (320 px)? The header and footer
  must not overflow horizontally; the mobile navigation must be usable.
- What happens when an icon that indicates direction (chevron, arrow) is used
  in the header or footer? The icon must flip visually in the RTL locale.
- What happens when a system font fails to load? The site must remain legible
  with a suitable system font fallback.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST serve Arabic content with right-to-left layout at
  the root URL, with no locale prefix in the URL.
- **FR-002**: The site MUST serve English content with left-to-right layout at
  the `/en` URL path.
- **FR-003**: The page's language and direction metadata MUST reflect the active
  locale on every page so that assistive technologies announce the correct
  language.
- **FR-004**: Every user-visible text string MUST be sourced from locale message
  files — one file per locale. No text may be hardcoded in page components,
  except the brand name "ArabSyntax" and non-translatable proper nouns.
- **FR-005**: The language switcher MUST appear in both the header and the
  footer on every page.
- **FR-006**: The language switcher MUST navigate the user to the equivalent
  page in the other locale, preserving the current page path.
- **FR-007**: The header MUST display the ArabSyntax logo, navigation links to
  Features, Pricing, FAQ, and Support, and the language switcher.
- **FR-008**: The footer MUST display product links, legal links, support links,
  the language switcher, and a copyright notice.
- **FR-009**: The header and footer layout MUST adapt correctly to right-to-left
  and left-to-right directions — no physical-direction positioning may be used.
- **FR-010**: Directional icons in the header and footer MUST be visually
  mirrored in the right-to-left locale compared to the left-to-right locale.
- **FR-011**: The layout MUST be fully responsive from 320 px to 1920 px
  viewport widths with no horizontal scroll at any breakpoint.
- **FR-012**: Every interactive element in the header and footer (links, language
  switcher, mobile menu toggle) MUST be keyboard-reachable and MUST display a
  visible focus indicator when focused.
- **FR-013**: The Arabic locale MUST use an Arabic-optimised typeface; the
  English locale MUST use an English-optimised typeface. Both typefaces MUST be
  loaded reliably via the project's approved font mechanism.
- **FR-014**: The site MUST use a dark color theme throughout, with a teal
  accent color, matching the visual identity of the mobile app.
- **FR-015**: The shared layout shell MUST support placement of arbitrary page
  content between the header and footer without requiring layout changes.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor who navigates to the root URL without any stored
  preference sees the site entirely in Arabic with right-to-left layout — zero
  English copy is visible except "ArabSyntax".
- **SC-002**: A visitor who navigates to `/en` sees the site entirely in English
  with left-to-right layout, with no Arabic copy visible.
- **SC-003**: Switching languages from any page preserves the current page —
  the visitor is never redirected to the home page as a result of the switch.
  100% of tested page paths must exhibit this behavior.
- **SC-004**: The header and footer render visually correctly in both locales
  with zero instances of elements positioned using physical-direction rules
  that produce mirroring defects.
- **SC-005**: The layout is fully usable with a keyboard alone in both locales —
  all interactive elements are reachable by Tab and activatable by Enter/Space,
  with a visible focus indicator present at all times.
- **SC-006**: The shared layout passes a Lighthouse Accessibility audit with a
  score of 95 or higher when tested on a blank page that uses only the header,
  footer, and locale shell.
- **SC-007**: The layout renders correctly at all tested viewport widths from
  320 px to 1920 px with no horizontal scroll.
- **SC-008**: The header and footer display real copy (not placeholder text)
  in both Arabic and English.

## Assumptions

- The ArabSyntax logo asset (SVG or equivalent) will be available in the
  project before implementation begins. If not ready, a text-only logotype
  is acceptable as a placeholder during development.
- "Features", "Pricing", "FAQ", and "Support" are the four navigation
  destinations defined for v1. Adding or reordering these requires a spec
  amendment.
- The copyright year in the footer is the current calendar year and is
  rendered dynamically by the server.
- The footer's "product links", "legal links", and "support links" refer to
  three distinct groups of links. The exact link targets (Privacy, Terms,
  Support page, etc.) will be defined when those destination pages are built;
  placeholder links pointing to `#` are acceptable during foundation
  development.
- The dark color theme tokens and teal accent values are documented in
  `design-tokens.md` in the repository root and are considered authoritative.
  This spec does not define specific color values.
- There is no user authentication or session management in v1. The language
  preference set by the switcher is reflected in the URL path only — there is
  no cookie or localStorage persistence required.
- The mobile navigation pattern (e.g., slide-out drawer vs. bottom sheet vs.
  dropdown) is a design decision left to the implementation plan. Any pattern
  is acceptable provided it is keyboard-accessible and works in both locales.
- This feature delivers the layout shell only. No landing page content,
  legal page content, or contact form is in scope.
