# Launch TODO

Deferred from feature 005-launch-polish. These items are NOT blockers
for landing the feature, but MUST be resolved before publicly linking
the site from the Google Play / App Store listings.

- [ ] **OG image rebrand** — `public/og/og-image.png` (1200×630 PNG, dark theme) currently shows the placeholder brand. Regenerate with "النحو الكافي / Al-Nahw Al-Kafi" and drop in place. No code changes needed — `metadata.openGraph.images` already points at this path.
- [ ] **Constitution §Terminology amendment** — The constitution's Terminology table still lists "ArabSyntax" / "النحو العربي" and references "Premium features" / "Legacy purchasers" rows that are obsolete after this feature. Run `/speckit.constitution` to apply a patch-level update (v1.0.2) replacing the three rows.
- [ ] **FAQ `offline` answer** — Confirm with developer whether offline use is supported, then finalize the `faq.offline.a` key in `messages/{ar,en}.json`.
