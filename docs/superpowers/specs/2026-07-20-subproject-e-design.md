# Sub-project E — Newsletter / Lead Capture Design Spec

**Date:** 2026-07-20
**Branch:** `build/subproject-e` (off `develop` @ `2ec1998`, the merged A–D PR #5)
**Relaxes:** CLAUDE.md Rule 1 (zero backend) — bounded, same as D. This is the second/other half of the relaxation (D = channel import; E = email capture to Cloudflare KV).

## Goal

Replace the current third-party **Tally.so iframe stub** in `src/components/Newsletter.astro` (rendered on every page via `ToolLayout.astro` + `index.astro`) with a **same-origin, zero-third-party, progressive-enhancement email capture form** backed by a Cloudflare Pages Function that writes subscribers to a dedicated Cloudflare KV namespace. Remove the Tally dependency entirely.

## Why this scope (optimal-options decision log)

- The capture surface already exists site-wide as `Newsletter.astro`; E makes it real rather than introducing a new surface. One component rewrite propagates to every page — no per-page edits.
- The bounded Rule-1 relaxation authorizes "newsletter/lead capture to KV/D1." **Email _sending_ is not in scope** (no SMTP, no ESP). Therefore **true email-based double opt-in is impossible without adding a third-party ESP + secret**, which is out of scope. The honest, shippable design is **single opt-in with strong bot filtering** + a thank-you page. The spec says so explicitly rather than pretending a same-session "confirm click" is double opt-in.
- The KV record schema and the `/api/subscribe` Function are **source-agnostic** (`source: "newsletter"` today) so a future per-tool lead-capture form ("email me when my channel hits X subs") reuses the exact same backend with `source: "lead:tool-slug"` — zero Function change. Per-tool lead forms are **not shipped in E** (YAGNI).
- The D-2 M1 deferred cleanup (wrap the Twitch app-token KV `put`/`delete` in `functions/api/channel.ts` in try/catch for best-effort consistency) is folded into E's Function task — it's a 2-line adjacent fix in the same `functions/` surface and was the one Minor the final D review flagged for follow-up.

## Non-goals

- No email sending, no ESP integration (Resend/Mailgun/MailChannels), no confirmation email, no double opt-in. Deferred to a future ESP cycle.
- No per-tool lead-capture forms shipped (the backend supports them; the UI is deferred).
- No admin/auth/dashboard for viewing subscribers. KV is read out-of-band via the Cloudflare dashboard / `wrangler` by the repo owner. No user auth (Rule 1).
- No analytics on signups beyond a stored `source` + timestamp. No profiling.
- No D1 — KV is sufficient for a low-volume subscriber list and matches D's KV pattern. D1 migration deferred.

## Architecture

```
Browser (static page, any route)
  └── Newsletter.astro form  (progressive enhancement)
        JS on  → fetch("POST /api/subscribe", {json}) → inline status
        JS off → form POST → Function sees Accept: text/html → 302 to /newsletter/thanks
                            ↓
Cloudflare Pages Function  functions/api/subscribe.ts  (POST only)
  1. same-origin guard (functions/_middleware.ts, POST added for /api/subscribe only)
  2. parse + validate body (email, consent, honeypot, source)  — uses PURE layer
  3. reject: honeypot filled, consent != true, invalid email, rate limit exceeded
  4. derive subscriberKey(email, salt)  — PURE layer (SHA-256, web-standard crypto)
  5. idempotent KV put  →  LEADS:sub:<hmac>  (never overwrite an existing confirmed record's status downward)
  6. respond: JSON for fetch, 302→/newsletter/thanks for no-JS HTML
  USE_MOCK_UPSTREAM=true → validate fully, skip KV write, return ok (local dev)
```

Pages stay `output: "static"` (no adapter). The Function is the only server-side code added; everything else is build-time static.

## Pure layer (`src/lib/newsletter/`) — Rule 3

No DOM, no Astro imports, no fetch, no side effects. Input guards: NaN/empty/invalid → neutral. All functions Vitest-tested.

### `validateEmail.ts`

```ts
export function validateEmail(
  input: unknown,
):
  | { ok: true; email: string }
  | { ok: false; reason: "empty" | "format" | "length" };
```

- Trim + collapse whitespace, lowercase.
- Reject empty → `empty`. Reject length > 254 → `length`.
- Pragmatic RFC-ish regex: `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` (one @, a dot in the domain, no spaces). Reject → `format`.
- Return normalized email on success. Deterministic, pure, sync.

### `keys.ts`

```ts
export async function subscriberKey(
  email: string,
  salt: string,
): Promise<string>;
```

- Returns `"sub:" + hex(sha256(salt + ":" + normalize(email)))` using `globalThis.crypto.subtle.digest` (web-standard; available in Cloudflare Workers and Node ≥19, so Vitest can test it).
- Keys are non-enumerable (HMAC-bound to a secret salt) so KV keys cannot be trivially mapped back to emails, and email enumeration via KV key listing is prevented.
- Pure + deterministic (same email+salt → same key). Async only because SubtleCrypto is async.

`normalize(email)` shared helper (trim, lowercase) — export from `validateEmail.ts` and reuse.

## Config (`src/data/newsletterConfig.ts`) — Rule 2

Single editable source of truth for all copy + limits. No literals in the component.

```ts
export const NEWSLETTER = {
  heading: "Get new creator tools + monetization tips",
  body: "Occasional emails. No spam. Unsubscribe anytime.",
  ctaLabel: "Subscribe",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  consentLabel: "I agree to receive occasional emails. See the Privacy Policy.",
  privacyUrl: "/privacy",
  thanksUrl: "/newsletter/thanks",
  honeypotField: "company", // hidden field name; filled = bot
  source: "newsletter", // default source tag written to KV
  rateLimitPerMinute: 5, // per-IP cap
  maxEmailLength: 254,
} as const;
```

## Cloudflare Pages Function (`functions/api/subscribe.ts`)

Mirrors D's `channel.ts` structure: `json`/`err` helpers, `onRequestPost` wrapping `handle()` with try/catch, `Parameters<PagesFunction<Env>>[0]` context type, `cache-control: no-store`.

- **Method:** `onRequestPost` only (GET → 405 via middleware/routing).
- **Body:** `application/json` `{ email: string, consent: string|boolean, [honeypotField]: string, source?: string }`. Also accept `application/x-www-form-urlencoded` for no-JS form POST (parse with `URLSearchParams`).
- **Validation order (fail fast, distinct codes):**
  1. honeypot field non-empty → `ok:false, error:"invalid-input"` 400 (do not reveal it's a honeypot).
  2. `consent` not strictly true / `"true"` / `"on"` → `error:"consent-required"` 400.
  3. `validateEmail(email)` → invalid → `error:"invalid-email"` 400.
  4. rate limit (below) exceeded → `error:"rate-limited"` 429.
- **Rate limit (best-effort, KV):** key `rl:<sha256(ip+salt)>` short hex. `get` count; if ≥ `rateLimitPerMinute` → 429; else `put` count+1 with `expirationTtl: 60`. Wrap in try/catch — never fail the request on rate-limit KV error (fail open, proceed). `USE_MOCK_UPSTREAM=true` → skip rate-limit KV (still enforce a soft in-memory per-request cap? no — just skip; local dev).
- **Write:** `key = await subscriberKey(email, env.NEWSLETTER_KV_SALT)`. Read existing first; if a record already exists with `status:"subscribed"`, leave it untouched (idempotent re-subscribe → still return ok). Otherwise `put` JSON `{ email, status:"subscribed", source: source ?? NEWSLETTER.source, consentAt: Date.now(), ip: "<hashed short>", ua: "<truncated>" }`. KV write wrapped in try/catch (non-fatal → still return ok to user, log nothing to response).
  - **PII at rest:** email is stored in the KV value (not just the key) so the owner can export the list. The _key_ is HMAC-derived so the key namespace isn't enumerable as emails. IP stored as a short salted hash, never raw. UA truncated to 120 chars.
- **Response dual-mode:**
  - `Accept` includes `application/json` (fetch) → `json({ ok:true })` 200, or `err(code,status)` on failure.
  - `Accept` is `text/html` (no-JS form POST) → on success `302` to `NEWSLETTER.thanksUrl`; on failure `302` to `${thanksUrl}?error=<code>` (the thanks page renders a friendly error when `?error` present). Use `Response.redirect(url, 302)` (Workers-compatible: `new Response(null, { status: 302, headers: { location: url } })`).
- **Mock mode:** `env.USE_MOCK_UPSTREAM === "true"` → run all validation + rate-limit logic, but skip the LEADS KV put (treat as success). Lets `wrangler pages dev` smoke run without a real LEADS binding. (If LEADS is unbound in dev, the skipped write avoids a binding error.)
- **Error codes → HTTP:** `invalid-input` 400, `consent-required` 400, `invalid-email` 400, `rate-limited` 429, `bad-request` 400 (unparseable body), `not-configured` 503 (salt missing in production), `upstream-error` 502 (catch-all).

## Middleware (`functions/_middleware.ts`)

Add `POST` to the allowed method set **only for pathname `/api/subscribe`**. Keep GET/HEAD/OPTIONS allowed everywhere. Same-origin Origin/Referer guard unchanged (applies to POST too). No permissive ACAO.

```ts
const pathname = new URL(request.url).pathname;
const allowed =
  ALLOWED_METHODS.has(method) ||
  (method === "POST" && pathname === "/api/subscribe");
if (!allowed) return json({ ok: false, error: "method-not-allowed" }, 405);
```

## Env / bindings (`functions/types.d.ts`)

```ts
export interface Env {
  // ...existing D bindings unchanged...
  LEADS: KVNamespace; // subscriber records + rate-limit counters
  NEWSLETTER_KV_SALT: string; // secret salt for subscriberKey + rate-limit keys
}
```

`.dev.vars.example` gains `LEADS` and `NEWSLETTER_KV_SALT` placeholders. `.dev.vars` (real) stays gitignored. Wrangler dev binds `--kv=LEADS` (alongside `--kv=CHANNEL_CACHE`). No `wrangler.toml` is added (D shipped without one; KV bindings are configured in the Cloudflare dashboard at deploy, documented in the spec).

## Component (`src/components/Newsletter.astro`) — rewrite

Progressive-enhancement form (no third-party, no iframe):

- `<form data-newsletter action="/api/subscribe" method="POST">` with:
  - email `<input type="email" name="email" required autocomplete="email" inputmode="email">`
  - consent `<input type="checkbox" name="consent" value="true" required>` + label from config linking to `privacyUrl`
  - honeypot `<input type="text" name={NEWSLETTER.honeypotField} tabindex="-1" autocomplete="off" aria-hidden="true" class="hp">` (visually hidden via CSS, not `display:none` so bots still fill it)
  - hidden `source` = config default
  - submit `<button type="submit" class="cta">` accent-styled (Rule 4)
  - `<p data-newsletter-status role="status" aria-live="polite" hidden>`
- `<script>` (vanilla, mirrors `ChannelImport.astro` pattern): intercept `submit`, `preventDefault`, `fetch` POST JSON, map error codes → friendly inline copy, show success ("You're subscribed — check the site for updates." since no email is sent), re-enable button. If no JS: browser POSTs form-encoded → Function 302s to thanks page.
- Single-accent `<style>` (Twitch purple on focus ring + submit button only; everything else slate — Rule 4). Reuse existing CSS tokens (`--color-accent`, `--color-surface`, `--color-border`, etc.).
- Headings/copy all from `NEWSLETTER` config — no literals (Rule 2).

## Pages

- **`src/pages/newsletter/thanks.astro`** — "You're subscribed" confirmation. `noindex`, bare-URL canonical (Rule 7; not a tool page so no WebApplication/FAQ schema, but keep `<link rel="canonical">` bare). If `?error=<code>` present, render a friendly "Something went wrong — go back and try again" message mapped from the code. Static, build-time.
- **`src/pages/privacy.astro`** — update line 12: replace the Tally.so sentence with: "If you subscribe to the newsletter, your email is stored in Cloudflare KV and used only to send occasional updates. We do not sell data. No confirmation email is sent (single opt-in). Unsubscribe by contacting us via the repository." Keeps the page truthful post-E.

## Security & privacy (carried from Rule 1 relaxation + best practice)

- **No third-party scripts/iframe** after E — Tally removed (Rule 5 win). Analytics stays Cloudflare Web Analytics only.
- **Same-origin POST** enforced by `_middleware.ts`; cross-origin → 403.
- **Honeypot + consent + validation + per-IP rate limit** filter bots/abuse without a CAPTCHA (no third-party CAPTCHA — Rule 5).
- **Secrets server-side:** `NEWSLETTER_KV_SALT` is a Cloudflare env var via `context.env` only — never shipped to the browser, never in `src/` (only `.dev.vars.example` placeholder), never in `dist/`.
- **PII minimization:** email in KV value (for export), HMAC-derived non-enumerable key, IP stored only as a short salted hash, UA truncated. No raw IP retained.
- **No email is sent** — the privacy page and the success message say so explicitly. Users are not promised a confirmation email.
- **Idempotent:** re-submitting the same email does not duplicate or downgrade an existing subscription.
- **KV writes best-effort:** a KV write failure never fails the user-facing request (returns ok); consistent with D's channel-stats cache write pattern. **D-2 M1 fix:** the Twitch app-token `put` (channel.ts:105) and `delete` (channel.ts:129) are wrapped in try/catch in the same E Function task so _all_ KV writes in `functions/` are best-effort and consistent.

## Global Constraints (verbatim, bind every task)

1. **Zero backend (BOUNDED RELAXATION for D/E only).** Cloudflare Pages Functions allowed ONLY for channel URL import, live rate lookup, newsletter/lead capture to KV/D1. API keys are server-side Cloudflare secrets — NEVER shipped to the browser. A/B/C stay pure static. No DB, no user auth, no SSR/edge rendering of pages.
2. **Rates never hardcoded in components** — every calculator reads constants from `src/data/*.ts`. (E: all newsletter copy/limits read from `src/data/newsletterConfig.ts`.)
3. **`src/lib/` is pure** — no DOM, no Astro imports, no fetch, no side effects. Input guards: NaN/negative/Infinity/empty/invalid → neutral. All pure functions have Vitest tests.
4. **Single accent color** — Twitch purple `#9146ff` only on focus rings, primary CTAs, active tab, result accent. Everything else slate. No neon gradients.
5. **No render-blocking 3rd-party scripts.** Analytics is Cloudflare Web Analytics (cookieless, deferred). No GA4/Hotjar/FB pixel. **E removes the Tally iframe.**
6. **Performance bar:** Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms.
7. **SEO is structural:** one page = one keyword, exact/near-exact H1, one H2 per section, canonical bare-URL (no query params), WebApplication + FAQPage + Breadcrumb JSON-LD on every _tool_ page. (The thanks page is `noindex`, bare canonical, no tool schema.)
8. **Affiliate IDs are config, not env vars.** (E does not touch affiliate config.)

## File structure

**Create:**

- `src/lib/newsletter/validateEmail.ts` — pure email validation + `normalize`.
- `src/lib/newsletter/keys.ts` — pure `subscriberKey` (SHA-256 via SubtleCrypto).
- `src/data/newsletterConfig.ts` — copy + limits (single source of truth).
- `functions/api/subscribe.ts` — POST Pages Function.
- `src/pages/newsletter/thanks.astro` — confirmation page.
- `tests/newsletter.test.ts` — Vitest for the pure layer.

**Modify:**

- `functions/_middleware.ts` — allow POST on `/api/subscribe`.
- `functions/types.d.ts` — add `LEADS` + `NEWSLETTER_KV_SALT`.
- `.dev.vars.example` — add `LEADS` + `NEWSLETTER_KV_SALT` placeholders.
- `src/components/Newsletter.astro` — full rewrite (Tally iframe → same-origin form).
- `src/pages/privacy.astro` — replace Tally sentence (line 12).
- `functions/api/channel.ts` — D-2 M1: wrap app-token `put` (l.105) + `delete` (l.129) in try/catch.

**No change:** all 11 calculators, `src/lib/calculators/`, `src/lib/site.ts`, `src/data/faqs.ts`, prog-SEO routes, `ChannelImport.astro`, existing configs. E is additive to the `functions/` + `newsletter/` surfaces only (+ the one Tally→form rewrite + one privacy line).

## Task split (SDD, TDD where pure)

- **E-1: Pure newsletter layer + config + tests.** `validateEmail.ts`, `keys.ts`, `newsletterConfig.ts`, `tests/newsletter.test.ts`. TDD: write failing tests (valid/invalid emails, normalize, subscriberKey determinism + distinctness), implement, pass. Commit.
- **E-2: Subscribe Pages Function + middleware + Env + D-2 M1 cleanup.** `functions/api/subscribe.ts`, middleware POST, `types.d.ts`, `.dev.vars.example`, and the channel.ts try/catch wrap. Mock-mode smoke verified manually (wrangler) by the final review; no unit test for the Function (matches D's channel.ts). Commit.
- **E-3: Rewrite Newsletter component + thanks page + privacy update.** `Newsletter.astro` rewrite, `newsletter/thanks.astro`, `privacy.astro` line 12. Build + lint. No unit test (UI). Commit.
- **E-4: Controller verify + final opus whole-branch review.** Build (47→48 pages), lint, full test suite, regression-seam probe (no A–D touch), wrangler mock smoke for `/api/subscribe` (subscribe / invalid-email / consent-required / honeypot / rate-limit / no-JS HTML 302 / cross-origin 403 / KV idempotent re-subscribe). Final opus review against all 10 CLAUDE.md rules.

## Acceptance criteria

- `npm test` green (existing 133 + new newsletter tests).
- `npm run lint` clean.
- `npm run build` succeeds, 48 pages, no adapter, no Tally/iframe anywhere in `dist/`.
- No third-party script/iframe in `dist/` other than Cloudflare Web Analytics (Rule 5).
- `src/lib/newsletter/` is pure (no DOM/Astro/fetch) and fully tested.
- All newsletter copy/limits read from `newsletterConfig.ts` (no literals in `Newsletter.astro`).
- Secrets (`NEWSLETTER_KV_SALT`) only in `context.env`; not in `src/` (except `.dev.vars.example` placeholder), not in `dist/`.
- Same-origin POST enforced; cross-origin → 403; honeypot/consent/validation/rate-limit all enforced in mock smoke.
- D-2 M1: app-token KV `put`/`delete` wrapped in try/catch.
- Regression seam: zero changes to A–D calculator/config/FAQ/prog-SEO surfaces.
- Final opus review: 0 Critical/Important, all 10 rules ✅.

## Deferred (explicit)

- Email sending / ESP integration / true double opt-in — future cycle.
- Per-tool lead-capture forms — backend is source-agnostic and ready; UI deferred (YAGNI).
- D1 migration for the subscriber list — KV sufficient for now.
- Admin/subscriber-list dashboard — out of scope (read via `wrangler`/Cloudflare dashboard).
- "Live rate lookup" (FX refresh) — deferred from D, still not in E.
