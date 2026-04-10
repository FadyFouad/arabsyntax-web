# Feature Specification: Support Page with Contact Form

**Feature Branch**: `004-support-page`
**Created**: 2026-04-10
**Status**: Draft
**Input**: User description: "Build the Support page for the ArabSyntax website, including a working contact form that visitors can use to reach the developer."

## User Scenarios & Testing *(mandatory)*

### User Story 1 — Send a Support Message (Priority: P1)

A visitor arrives at /support (Arabic) or /en/support (English) because they have a question or a problem with the app. They read the intro, fill out the form (Name, Email, Subject, Message), and submit it. The developer receives an email with the submission. The visitor sees an inline success confirmation without leaving the page.

**Why this priority**: This is the primary purpose of the page — enabling visitors to reach the developer. Without it, the page has no utility beyond the FAQ. It is also required by Google Play Console policies for providing a support channel.

**Independent Test**: Load /support, fill all four fields with valid data, submit — developer receives an email, visitor sees the success message. This can be tested end-to-end without any other user story being implemented.

**Acceptance Scenarios**:

1. **Given** a visitor on /support with all four fields filled correctly, **When** they click Submit, **Then** the developer receives an email with the visitor's name, email, subject, and message, and the visitor sees an inline success confirmation in Arabic.
2. **Given** a visitor on /en/support with all four fields filled correctly, **When** they click Submit, **Then** the developer receives the email and the visitor sees the inline success confirmation in English.
3. **Given** the email service is temporarily unavailable, **When** the visitor submits the form, **Then** the form stays filled in and a friendly error message is shown in the visitor's language.
4. **Given** a visitor who has already submitted 5 messages in the past hour, **When** they attempt to submit again, **Then** the submission is rejected with a rate-limit error message; no email is sent.

---

### User Story 2 — Validate Before Submitting (Priority: P1)

A visitor fills the form incorrectly (empty field, invalid email address, or a bot leaves required fields empty while filling the honeypot). The form refuses to submit and highlights the problem clearly, in the visitor's language, without requiring a page reload.

**Why this priority**: Without validation, spam and invalid submissions flood the developer's inbox. Client-side validation improves the experience; server-side validation is required for security. Both run in parallel with US1 — validation is not a follow-up.

**Independent Test**: Submit the form with (a) all fields empty, (b) an invalid email address, (c) only some fields filled. Each case shows per-field error messages in the correct language. The form never reaches the server in cases (a), (b), (c).

**Acceptance Scenarios**:

1. **Given** the visitor leaves one or more required fields empty, **When** they click Submit, **Then** each empty field shows a required-field error message in the page's language; the form is not submitted.
2. **Given** the visitor enters a malformed email address (e.g., "notanemail"), **When** they click Submit, **Then** the email field shows an invalid-email error message; the form is not submitted.
3. **Given** a bot fills the honeypot field (a hidden field not visible to humans), **When** the form is submitted, **Then** the server silently discards the submission; the bot receives a generic success response so it does not retry.
4. **Given** the visitor corrects a field error and resubmits, **When** the corrected form passes all validation, **Then** the error messages disappear and the form submits normally.

---

### User Story 3 — Self-Serve via FAQ (Priority: P2)

A visitor arrives at /support looking for an answer. They scroll to the FAQ section and find the answer without needing to send a message. The FAQ content mirrors the landing page FAQ so visitors who skipped the landing page can still self-serve.

**Why this priority**: Reducing avoidable contact-form submissions frees up the developer's time. The FAQ is valuable on its own but is not required for the contact form to work.

**Independent Test**: Load /support — the FAQ section appears below the form with the same questions and answers as the landing page FAQ. All questions expand/collapse correctly in both Arabic and English.

**Acceptance Scenarios**:

1. **Given** a visitor on /support, **When** they scroll to the FAQ section, **Then** they see the same questions and answers as the landing page FAQ, rendered in Arabic.
2. **Given** a visitor on /en/support, **When** they scroll to the FAQ section, **Then** the same questions and answers appear in English.

---

### User Story 4 — Email Directly as a Fallback (Priority: P2)

A visitor who prefers not to use the form sees a clickable support email address below the form. Clicking it opens their email client pre-addressed to the support address.

**Why this priority**: Provides a fallback for visitors who cannot or prefer not to use the form. Depends only on the page existing; no server logic required.

**Independent Test**: Load /support — a clickable mailto: link for the support email address is visible below the form, in both Arabic and English.

**Acceptance Scenarios**:

1. **Given** a visitor on /support, **When** they see the direct email section below the form, **Then** the support email is displayed as a clickable link that opens their email client.
2. **Given** the visitor clicks the email link, **When** their email client opens, **Then** the To field is pre-filled with the support email address.

---

### Edge Cases

- What happens when the visitor submits the form and the network drops mid-request? The visitor sees a generic error message and the form remains filled in.
- What happens when a bot submits many requests rapidly from the same IP? Rate limiting caps submissions at 5 per hour per IP; excess requests are rejected.
- What happens when the honeypot field is filled? The server silently discards the submission and returns a fake success response.
- What happens when the visitor's email provider rejects the reply-to address? The developer still receives the submission; the body of the email contains the visitor's email address so the developer can reply manually.
- What happens when all form fields contain very long strings? The server validates and truncates or rejects inputs exceeding reasonable limits (name ≤ 100 chars, subject ≤ 200 chars, message ≤ 5000 chars, email ≤ 254 chars per RFC 5321).
- What happens when the FAQ section is empty? This cannot happen: the FAQ content is sourced from the same message files that power the landing page FAQ, which always has entries.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The Support page MUST be accessible at /support (Arabic, RTL) and /en/support (English, LTR), using the existing bilingual site shell (Header, Footer, navigation).
- **FR-002**: The page MUST display a short welcoming introduction stating the page's purpose and the expected response time (approximately 48 hours).
- **FR-003**: The page MUST contain a contact form with four visible fields: Name, Email, Subject, and Message. All four fields are required.
- **FR-004**: The form MUST validate all required fields and the email format on the client side before submission. Errors MUST be shown per field in the page's language.
- **FR-005**: The form MUST re-validate all fields on the server side. A submission that bypasses client-side validation and fails server-side validation MUST be rejected with appropriate error messages.
- **FR-006**: When a valid form is submitted, the developer MUST receive an email containing the visitor's name, email address, subject, and message.
- **FR-007**: After a successful submission, the visitor MUST see an inline success confirmation in their language without navigating away from the page.
- **FR-008**: If the email delivery fails, the visitor MUST see a friendly, language-appropriate error message and the form MUST remain filled in so they can try again.
- **FR-009**: The form MUST include a hidden honeypot field. Any submission where the honeypot field is not empty MUST be silently discarded; the visitor receives a fake success response.
- **FR-010**: Submissions MUST be rate-limited: a maximum of 5 successful submissions per hour per IP address. Excess submissions MUST be rejected with a rate-limit error message in the visitor's language.
- **FR-011**: The support email address MUST be displayed below the form as a clickable mailto: link, as a fallback for visitors who prefer direct email.
- **FR-012**: The FAQ section MUST appear below the contact form and display the same questions and answers as the landing page FAQ, sourced from the same translation files, in the page's language.
- **FR-013**: All form labels, placeholder text, validation error messages, success messages, and rate-limit messages MUST be translated for both Arabic and English locales.
- **FR-014**: Every form field MUST have an associated visible label. Error messages MUST be associated with their field in a way that screen readers can announce them. The entire form MUST be operable with keyboard only.
- **FR-015**: Input lengths MUST be validated server-side: name ≤ 100 characters, subject ≤ 200 characters, message ≤ 5,000 characters, email ≤ 254 characters.

### Key Entities

- **Contact submission**: The message a visitor sends. Contains: name (string), email (valid email), subject (string), message (body text), locale (ar or en), timestamp, and source IP. Not persisted — delivered by email and then discarded.
- **Rate-limit record**: Tracks how many submissions a given IP address has made in the current hour. Used only for spam protection; contains: IP address, submission count, window-start timestamp.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor with valid form data can complete and submit the contact form in under 2 minutes.
- **SC-002**: The developer receives the email notification within 60 seconds of a successful form submission under normal network conditions.
- **SC-003**: A submission with any empty required field or an invalid email is rejected 100% of the time, both client-side and server-side.
- **SC-004**: A bot that fills the honeypot field is silently rejected 100% of the time; no email is sent and no error is revealed.
- **SC-005**: No single IP address can send more than 5 support messages per hour; the 6th attempt within the window is rejected with an informative error.
- **SC-006**: All user-visible text (labels, errors, confirmations) renders correctly in Arabic (RTL) and English (LTR) with no untranslated strings visible to the visitor.
- **SC-007**: The contact form achieves a Lighthouse Accessibility score of 95 or above on both /support and /en/support.
- **SC-008**: The page renders correctly and all functionality (form submission, validation, FAQ) works identically in Arabic RTL layout and English LTR layout.

## Assumptions

- The site foundation (Feature 001) is complete: the bilingual shell, Header, Footer, i18n routing, and dark theme are in place.
- The landing page (Feature 002) FAQ content lives in the existing translation message files and can be reused directly on the Support page without duplication.
- The support email address (the address to which form submissions are sent) will be stored in an environment variable; a placeholder is used until launch.
- Rate limiting is implemented using the visitor's IP address as the identifier. Visitors behind shared NAT or a VPN may share a rate-limit bucket — this is an acceptable trade-off for v1.
- The honeypot field is invisible to sighted users and most screen reader configurations; it does not require a label or aria attributes.
- No authentication is required to submit the contact form: the page is public.
- The FAQ section uses a simple expand/collapse interaction (accordion) consistent with the landing page FAQ — no search or filtering is required.
- The direct email fallback is a static mailto: link; no additional server logic is needed.
- A transactional email service will be configured via environment variable as the email delivery service. The spec does not mandate a specific provider; the choice is made during planning.
