# Production Deployment Runbook

Date: 2026-06-10
Target: Cloudflare Workers via OpenNext.

This is the source-controlled launch checklist. Keep `brain/` for local investigation logs; keep this file as the clean deploy runbook.

## 0. Current Setup Status

Already implemented in the repo:

- OpenNext Cloudflare adapter config: `open-next.config.ts`.
- Wrangler config: `wrangler.jsonc`.
- Worker build/deploy scripts in `package.json`.
- Node version pin: `.nvmrc` and `engines.node`.
- Env templates: `.env.example` and `.dev.vars.example`.
- Content files bundled into the Worker VFS.
- `next/image` set to unoptimized for first production pass.
- Edge-compatible locale routing through `middleware.ts`.
- Direct package versions pinned in `package.json`.

Not done yet:

- Domain purchased or selected.
- Canonical production hostname chosen.
- Cloudflare zone/account connected to this project.
- Worker custom domain configured.
- Production SSL/TLS verified on the final hostname.
- Production secrets added to Cloudflare.
- Resend sending domain verified.
- Upstash Redis production credentials verified.
- CI/CD deployment workflow added.
- Cloudflare preview/prod deploy tested.

## 1. Required Decisions

Choose these before production:

- Final domain: for example `example.com`.
- Canonical host: either apex `https://example.com` or `https://www.example.com`.
- Secondary host behavior: redirect the non-canonical host to the canonical host.
- Support sender domain: for example `send.example.com` or the root domain, depending on Resend setup.
- Support recipient: the mailbox that receives contact form submissions.
- Deployment mode: manual `npm run deploy` first, then CI/CD after the first successful production deploy.

Recommended default:

- Use the apex domain as canonical if the domain is only for this product: `https://example.com`.
- Add `www.example.com` too, but redirect it to the canonical host.
- Use a Resend-managed sending subdomain such as `send.example.com`.

## 2. Accounts And Access

Create or confirm access to:

- Cloudflare account.
- GitHub repository admin access.
- Domain registrar account, unless buying through Cloudflare Registrar.
- Resend account.
- Upstash account.

Cloudflare values needed:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- Worker name: currently `arabsyntax-web` in `wrangler.jsonc`

Create a Cloudflare API token scoped as narrowly as possible. For CI, use a token that can edit/deploy Workers for the target account/zone.

## 3. Domain Purchase Or Onboarding

If the domain is not purchased:

1. Buy the domain from Cloudflare Registrar or another registrar.
2. Verify the registrant email address.
3. Confirm renewal settings and payment method.

If buying through Cloudflare Registrar:

- Cloudflare nameservers are used automatically.
- You cannot switch the domain to another DNS provider while it stays with Cloudflare Registrar.

If buying elsewhere or using an existing domain:

1. Add the site/zone in Cloudflare.
2. Copy the two Cloudflare nameservers assigned to the zone.
3. At the registrar, replace existing nameservers with the Cloudflare nameservers.
4. If DNSSEC is enabled at the registrar, disable DNSSEC before changing nameservers.
5. Wait until the Cloudflare zone becomes active.
6. Re-enable DNSSEC in Cloudflare later if needed.

Do not continue to production cutover until Cloudflare is authoritative for the domain.

## 4. DNS Plan

Before changing live traffic:

1. Inventory existing DNS records at the current DNS provider.
2. Recreate required records in Cloudflare:
   - Email receiving records: MX, SPF, DKIM, DMARC, if mail is used.
   - Third-party verification records.
   - Any old subdomains still in use.
3. Keep non-HTTP verification records as DNS-only unless the provider requires otherwise.
4. Do not create manual A/CNAME records for the Worker hostname if using Worker Custom Domains; Cloudflare will create the needed DNS record when the custom domain is attached.

Required web hostnames:

- Canonical host: `example.com` or `www.example.com`.
- Secondary host: the other one, used only for redirect.

## 5. Worker Custom Domain

Production Workers should not rely on the `workers.dev` URL.

Use Cloudflare Worker Custom Domains because this Worker is the app origin.

Dashboard path:

1. Cloudflare Dashboard.
2. Workers & Pages.
3. Select Worker: `arabsyntax-web`.
4. Settings.
5. Domains & Routes.
6. Add.
7. Custom Domain.
8. Add the canonical hostname.
9. Add the secondary hostname if needed.

Wrangler config alternative, after the real domain is chosen:

```jsonc
"routes": [
  {
    "pattern": "example.com",
    "custom_domain": true
  },
  {
    "pattern": "www.example.com",
    "custom_domain": true
  }
]
```

Do not add placeholder domains to `wrangler.jsonc`. Add real hostnames only after the production domain is chosen.

## 6. SSL/TLS

For a Worker Custom Domain, Cloudflare creates the DNS record and issues the needed edge certificate. No separate SSL certificate purchase is required for the web app.

Checklist:

1. Confirm the Cloudflare zone is active.
2. Attach the Worker Custom Domain.
3. Wait for the edge certificate to become active.
4. Visit `https://<canonical-host>`.
5. Confirm there are no browser certificate errors.
6. Confirm HTTP redirects to HTTPS.
7. Enable Always Use HTTPS after HTTPS is confirmed.
8. Enable HSTS only after all required subdomains work over HTTPS.

SSL mode note:

- For this Worker app, Cloudflare is the origin for the custom domain.
- If the zone also has external origins, use Full (strict) for those origins when they have valid origin certificates.
- Avoid Flexible SSL for production.

## 7. Canonical Host Redirect

Pick one canonical host and make all variants redirect to it.

Examples:

- `http://example.com` -> `https://example.com`
- `http://www.example.com` -> `https://example.com`
- `https://www.example.com` -> `https://example.com`

Implementation options:

- Cloudflare Redirect Rule.
- Small Worker-level host redirect.
- Next middleware redirect.

Recommended first pass:

- Use a Cloudflare Redirect Rule for host normalization.
- Keep app code focused on routing, content, and rendering.

After deciding the canonical host, set:

```bash
NEXT_PUBLIC_SITE_URL=https://example.com
```

This value must match the canonical production origin because it affects canonical URLs, hreflang links, OpenGraph URLs, sitemap, and robots output.

## 8. Production Environment And Secrets

Build-time variable:

- `NEXT_PUBLIC_SITE_URL=https://<canonical-host>`

Cloudflare Worker secrets:

```bash
npx wrangler secret put RESEND_API_KEY
npx wrangler secret put RESEND_FROM_EMAIL
npx wrangler secret put SUPPORT_EMAIL
npx wrangler secret put UPSTASH_REDIS_REST_URL
npx wrangler secret put UPSTASH_REDIS_REST_TOKEN
npx wrangler secret put NEXT_SERVER_ACTIONS_ENCRYPTION_KEY
```

Rules:

- Do not commit `.env.local`, `.env`, `.dev.vars`, or API tokens.
- Use `.dev.vars` only for local Worker preview.
- Use Cloudflare secrets for production sensitive values.
- Use CI secrets for deployment credentials.

Generate a stable Server Actions key and keep it consistent across overlapping deployments:

```bash
openssl rand -base64 32
```

## 9. Resend Email Setup

Production contact form delivery requires a verified Resend sending domain.

Steps:

1. Add the sending domain in Resend.
2. Copy the DNS records generated by Resend.
3. Add those records in Cloudflare DNS.
4. Wait for verification.
5. Set `RESEND_FROM_EMAIL` to an address on the verified domain.
6. Set `SUPPORT_EMAIL` to the inbox that should receive submissions.
7. Submit a test support request in Worker preview or production.
8. Confirm the email is received and not landing in spam.

Also confirm:

- SPF/DKIM/DMARC records are present.
- If the domain receives email elsewhere, existing MX records are preserved.

## 10. Upstash Rate Limiting Setup

The contact form uses Upstash Redis REST credentials.

Steps:

1. Create a production Upstash Redis database.
2. Copy the REST URL.
3. Copy the REST token.
4. Add both as Cloudflare Worker secrets.
5. Run a real contact form test.
6. Submit enough attempts to verify rate-limit behavior.
7. Decide production failure behavior:
   - Fail open: allow messages if Redis is down.
   - Fail closed: block messages if Redis is down.

Recommended default for launch:

- Fail open for the contact form, plus logging, so a Redis outage does not block support.
- Revisit if spam becomes a production issue.

## 11. Optional Spam Protection

Rate limiting exists, but it does not prove the submitter is human.

If spam risk becomes high, add Cloudflare Turnstile:

- Create a Turnstile widget in Cloudflare.
- Add site key to public env.
- Add secret key to Worker secrets.
- Verify the Turnstile token in the Server Action before sending email.

This is not required for first launch if rate limiting is enough.

## 12. Manual First Deploy

Run locally:

```bash
nvm use
npm ci
npm run lint
npm run build:worker
```

Deploy manually:

```bash
export NEXT_PUBLIC_SITE_URL=https://<canonical-host>
npm run deploy
```

After deploy:

```bash
npx wrangler tail arabsyntax-web
```

Watch logs while running smoke tests.

## 13. Production Smoke Test

Required URLs:

```text
https://<canonical-host>/
https://<canonical-host>/en
https://<canonical-host>/privacy
https://<canonical-host>/en/privacy
https://<canonical-host>/terms
https://<canonical-host>/en/terms
https://<canonical-host>/lessons
https://<canonical-host>/en/lessons
https://<canonical-host>/i3rab
https://<canonical-host>/en/i3rab
https://<canonical-host>/support
https://<canonical-host>/en/support
https://<canonical-host>/manifest.webmanifest
https://<canonical-host>/robots.txt
https://<canonical-host>/sitemap.xml
```

Checks:

- All listed routes return `200`.
- Unknown content route returns `404`.
- HTTP redirects to HTTPS.
- Secondary host redirects to canonical host.
- Canonical and hreflang URLs use the final production origin.
- `sitemap.xml` uses the final production origin.
- Contact form sends a real email.
- Rate limit triggers as expected.
- Static Next assets have long-lived immutable cache headers.
- Cloudflare Worker logs show no runtime errors.

## 14. CI/CD Setup

Add GitHub secrets:

- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `NEXT_PUBLIC_SITE_URL`

CI workflow should run:

```bash
npm ci
npm run lint
npm run build:worker
npm run deploy
```

Recommended deployment policy:

- Pull requests: lint and Worker build only.
- Main branch: deploy production after merge.
- Optional later: add preview deployments for PR branches.

## 15. Rollback

Before risky deploys:

```bash
npm run upload
```

Use Cloudflare Worker versions/deployments in the dashboard to roll back if a production deploy fails.

Keep rollback criteria simple:

- 5xx errors on core pages.
- Contact form breaks.
- Wrong canonical/domain output.
- Severe rendering issue on home, lessons, i3rab, or support pages.

## 16. Post-Launch Monitoring

After cutover:

1. Watch `wrangler tail` during the first smoke test.
2. Check Cloudflare Worker metrics.
3. Check Resend delivery logs.
4. Check Upstash request metrics.
5. Search Console:
   - Submit sitemap.
   - Verify canonical URLs.
   - Monitor indexing.
6. Confirm analytics, if/when analytics are added.

## 17. Launch Blockers

Do not declare production ready until these are done:

- Final domain selected and active in Cloudflare.
- Worker Custom Domain active.
- HTTPS certificate active.
- Canonical host redirect working.
- `NEXT_PUBLIC_SITE_URL` set to the final canonical origin.
- Cloudflare Worker secrets added.
- Resend domain verified and real email delivered.
- Upstash rate limit tested.
- Production smoke test passed.
- Rollback path known.
