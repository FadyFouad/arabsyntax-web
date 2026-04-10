# Feature Specification: Legal Pages (Privacy Policy & Terms of Service)

**Feature Branch**: `003-legal-pages`
**Created**: 2026-04-10
**Status**: Draft

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Developer submits Privacy Policy URL to Google Play (Priority: P1)

The developer needs to provide a publicly accessible, stable URL for the app's
privacy policy to Google Play Console before the app can be published or updated.
The privacy policy page must be live, readable, and accurately describe what the
app collects.

**Why this priority**: Without a valid privacy policy URL, the app cannot be listed
on Google Play. This is a hard prerequisite for distribution.

**Independent Test**: Navigate to `https://arabsyntax.com/privacy` — the page loads
in Arabic, contains accurate data-collection disclosures, and is readable without
logging in. This URL can be pasted into Google Play Console immediately.

**Acceptance Scenarios**:

1. **Given** the developer opens Google Play Console privacy policy field,
   **When** they enter `https://arabsyntax.com/privacy`,
   **Then** Google Play Console accepts the URL (page is publicly accessible, non-empty, and not behind a login wall).

2. **Given** a visitor navigates to `/privacy`,
   **Then** the full Arabic privacy policy text is visible including: anonymous ID generation, entitlement storage, ad serving (AdMob), children's privacy, and no personal data collection.

3. **Given** a visitor navigates to `/en/privacy`,
   **Then** the same policy is displayed in English with identical content.

---

### User Story 2 — User reads Privacy Policy before using the app (Priority: P1)

A user (or parent of a minor) wants to understand what data the app collects,
whether it is safe for children, and who to contact with concerns.

**Why this priority**: Equally critical as US1 — the policy protects users and is
required for legal compliance. Children's privacy section is specifically required
because the app targets ثانوية عامة students who may be minors.

**Independent Test**: A non-technical reader (or a parent) can read the privacy
policy and clearly answer: (a) Does the app collect my name or email? (b) Is it
safe for my child? (c) How do I contact the developer?

**Acceptance Scenarios**:

1. **Given** a parent navigates to `/privacy`,
   **When** they read the children's privacy section,
   **Then** the section clearly states: the app does not knowingly collect personal
   information from children, anonymous IDs do not identify individuals, and parents
   may contact the developer to request data deletion.

2. **Given** a user asks "does this app collect my location or contacts?",
   **When** they read the privacy policy,
   **Then** the policy clearly states the app does not request access to location,
   contacts, photos, microphone, or any other sensitive device permissions.

3. **Given** a user in the European Economic Area reads the policy,
   **When** they look for ad-related disclosures,
   **Then** the policy explains that a consent form appears before personalized ads
   are shown to EEA users, and that Google AdMob is the ad provider.

---

### User Story 3 — User reads Terms of Service before subscribing (Priority: P2)

A user considering a paid subscription wants to understand the billing terms,
what happens if they cancel, and whether their previous one-time purchase is honored.

**Why this priority**: Important for purchase confidence and dispute prevention,
but the app already works without the ToS being read — it is not a checkout gate.

**Independent Test**: A user can navigate to `/terms` and `/en/terms` and answer:
(a) What is the refund policy? (b) Does my legacy purchase still give me access?
(c) Who governs these terms?

**Acceptance Scenarios**:

1. **Given** a legacy purchaser visits `/terms`,
   **When** they read the subscriptions section,
   **Then** there is a clear, prominent clause stating users who purchased the app
   under the previous one-time-payment model keep all premium features permanently
   at no additional cost.

2. **Given** a user asks about refunds,
   **When** they read the Terms of Service,
   **Then** the terms clearly state that billing and refunds are governed by Google
   Play (and Apple when iOS is available) and direct the user to those platforms.

3. **Given** a dispute arises,
   **When** the terms are consulted,
   **Then** the governing law clause and developer contact information are clearly stated.

---

### User Story 4 — Footer navigation to legal pages (Priority: P2)

A visitor on any page of the site can reach the Privacy Policy and Terms of Service
through the footer, in the current locale.

**Why this priority**: Discoverability of legal pages is a standard web convention
and may be required by app store reviewers who check the website.

**Independent Test**: On the Arabic homepage, click the Privacy Policy link in the
footer — opens `/privacy` in Arabic. On the English page, click it — opens `/en/privacy`.
Same for Terms of Service.

**Acceptance Scenarios**:

1. **Given** a visitor is on the Arabic homepage (`/`),
   **When** they click "سياسة الخصوصية" in the footer,
   **Then** they are taken to `/privacy` (Arabic policy).

2. **Given** a visitor is on the English page (`/en`),
   **When** they click "Privacy Policy" in the footer,
   **Then** they are taken to `/en/privacy` (English policy).

3. **Given** a visitor navigates to the privacy or terms page,
   **When** they want to switch language,
   **Then** the language switcher in the header/footer takes them to the same page in the other locale.

---

### Edge Cases

- What if the user navigates to `/privacy` with no locale prefix while using an English browser? The site serves Arabic by default; English requires `/en/privacy`.
- What if a search engine indexes the privacy policy? The page must be publicly accessible (no `noindex` directive) so Google Play Console can verify it.
- What if the "Last updated" date needs to be changed? The date must be stored in a single, easily editable location — not duplicated across the Arabic and English files.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The site MUST serve a Privacy Policy page at `/privacy` (Arabic) and `/en/privacy` (English).
- **FR-002**: The site MUST serve a Terms of Service page at `/terms` (Arabic) and `/en/terms` (English).
- **FR-003**: Both pages MUST be publicly accessible without authentication or JavaScript.
- **FR-004**: The Privacy Policy MUST disclose: anonymous user ID generation via Firebase, entitlement storage keyed by anonymous ID, in-app purchases processed entirely by Google Play/Apple (no payment data seen by the app), ad serving via Google AdMob with EEA consent form, device-local audio caching, and no access to contacts/photos/location/microphone.
- **FR-005**: The Privacy Policy MUST include a dedicated Children's Privacy section explaining that anonymous IDs do not identify individuals, and providing a developer contact for parental deletion requests.
- **FR-006**: The Terms of Service MUST include: acceptance of terms, personal non-commercial license, subscription/billing/refund clause deferring to Google Play and Apple, a prominent legacy purchaser clause, disclaimer of warranties, limitation of liability, governing law, and developer contact.
- **FR-007**: The Terms of Service MUST contain a clearly visible clause stating that users who purchased the app under the previous one-time-payment model retain all premium features permanently at no additional cost.
- **FR-008**: Both pages MUST display a "Last updated" date that is stored in a single location and easy to update without modifying the policy prose.
- **FR-009**: The footer on every page MUST include links to both the Privacy Policy and Terms of Service in the current locale.
- **FR-010**: Both pages MUST render within the existing site shell (header, footer, dark theme) and be fully responsive from 320px to 1920px.
- **FR-011**: Long-form text on both pages MUST use a comfortable reading layout: maximum line length of approximately 70 characters, generous line height, and readable font size.
- **FR-012**: Both pages MUST be available in Arabic (RTL) and English (LTR) with accurate translations — no machine-translated or placeholder text.
- **FR-013**: Each page MUST have locale-appropriate `<title>` and `<meta description>` SEO metadata.
- **FR-014**: The Arabic privacy policy URL (`https://arabsyntax.com/privacy`) MUST be submittable to Google Play Console — publicly reachable, stable, and containing the actual policy text.

### Key Entities

- **Privacy Policy**: A legal document with sections (data collected, third-party services, children's privacy, user rights, contact). Has a single "last updated" date. Available in two locales.
- **Terms of Service**: A legal document with sections (license, subscriptions, legacy purchasers, warranties, liability, governing law, contact). Has a single "last updated" date. Available in two locales.
- **Last Updated Date**: A single value shared across both locales per document. Changing it requires editing one place only.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: `/privacy` and `/en/privacy` are publicly reachable and return HTTP 200 with non-empty policy text — verified by pasting the URL into Google Play Console.
- **SC-002**: `/terms` and `/en/terms` are publicly reachable and return HTTP 200 with non-empty terms text.
- **SC-003**: The "Last updated" date on both documents can be changed by editing a single value (one edit for the privacy policy, one edit for the terms) without modifying prose.
- **SC-004**: A non-technical reader can locate the children's privacy section, the legacy purchaser clause, and the developer contact information within 60 seconds of opening each page.
- **SC-005**: Footer links to Privacy Policy and Terms of Service are present and correct on both the Arabic and English versions of every page.
- **SC-006**: Both pages pass Lighthouse Accessibility ≥ 95 (correct heading hierarchy, sufficient contrast, readable font size).
- **SC-007**: Both pages render without horizontal scroll at 320px viewport width.

## Assumptions

- The governing law is Egyptian law (developer is based in Egypt). Contact email is a placeholder (`legal@arabsyntax.com`) to be replaced before launch.
- Policy content is authored directly in the source code (MDX or JSX), not fetched from a CMS.
- The site does not use cookies or client-side analytics, so no cookie policy section is needed.
- The footer already has a "Legal" section with placeholder links to Privacy Policy and Terms of Service — these links need to be wired to the correct locale-aware routes.
- Both documents will be dated 2026-04-10 as the initial "last updated" date, to be updated whenever the content changes.
- No GDPR data subject request form or cookie consent banner is in scope.
- The privacy policy covers the mobile app behavior, not the website — the website itself collects no user data.
