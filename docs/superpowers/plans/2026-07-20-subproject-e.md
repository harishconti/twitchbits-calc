# Sub-project E — Newsletter / Lead Capture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Tally.so third-party iframe stub in `src/components/Newsletter.astro` with a same-origin, progressive-enhancement email capture form backed by a Cloudflare Pages Function (`/api/subscribe`, POST) that writes subscribers to a dedicated Cloudflare KV namespace (`LEADS`), with single opt-in + honeypot + consent + validation + per-IP rate limiting.

**Architecture:** A pure, Vitest-tested newsletter layer (`src/lib/newsletter/`) holds email validation + HMAC-derived KV key derivation. A single Cloudflare Pages Function (`functions/api/subscribe.ts`) validates submissions, enforces a per-IP KV rate limit, and writes an idempotent subscriber record to `LEADS`. The middleware allows POST on `/api/subscribe` only. `Newsletter.astro` is rewritten as a real form (JS → fetch JSON; no-JS → form POST → Function 302s to a static thank-you page). The D-2 M1 cleanup (wrap the Twitch app-token KV put/delete in `channel.ts` in try/catch) is folded into the Function task. Pages stay `output: "static"`.

**Tech Stack:** Astro 6 static, Tailwind 4, vanilla-JS islands, Cloudflare Pages Functions (`PagesFunction<Env>`), Cloudflare KV (`KVNamespace`), `globalThis.crypto.subtle` (SHA-256), Vitest 3.2 (Node v22 — `globalThis.crypto.subtle` is available).

## Global Constraints

[The spec's project-wide requirements — verbatim from `docs/superpowers/specs/2026-07-20-subproject-e-design.md`. Every task's requirements implicitly include this section.]

1. **Zero backend (BOUNDED RELAXATION for D/E only).** Cloudflare Pages Functions allowed ONLY for channel URL import, live rate lookup, newsletter/lead capture to KV/D1. API keys are server-side Cloudflare secrets — NEVER shipped to the browser. A/B/C stay pure static. No DB, no user auth, no SSR/edge rendering of pages.
2. **Rates never hardcoded in components** — every calculator reads constants from `src/data/*.ts`. (E: all newsletter copy/limits read from `src/data/newsletterConfig.ts`.)
3. **`src/lib/` is pure** — no DOM, no Astro imports, no fetch, no side effects. Input guards: NaN/negative/Infinity/empty/invalid → neutral. All pure functions have Vitest tests.
4. **Single accent color** — Twitch purple `#9146ff` only on focus rings, primary CTAs, active tab, result accent. Everything else slate. No neon gradients.
5. **No render-blocking 3rd-party scripts.** Analytics is Cloudflare Web Analytics (cookieless, deferred). No GA4/Hotjar/FB pixel. **E removes the Tally iframe.**
6. **Performance bar:** Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms.
7. **SEO is structural:** one page = one keyword, exact/near-exact H1, one H2 per section, canonical bare-URL (no query params), WebApplication + FAQPage + Breadcrumb JSON-LD on every _tool_ page. (The thanks page is `noindex`, bare canonical, no tool schema.)
8. **Affiliate IDs are config, not env vars.** (E does not touch affiliate config.)

**Branch:** `build/subproject-e` (off `develop` @ `2ec1998`). Don't push a red build.

---

## File Structure

**Create:**

- `src/lib/newsletter/validateEmail.ts` — pure email validation + `normalizeEmail`.
- `src/lib/newsletter/keys.ts` — pure `subscriberKey` + `shortHash` (SHA-256 via SubtleCrypto).
- `src/data/newsletterConfig.ts` — copy + limits (single source of truth).
- `functions/api/subscribe.ts` — POST Pages Function.
- `src/pages/newsletter/thanks.astro` — confirmation / error landing page (`noindex`).
- `tests/newsletter.test.ts` — Vitest for the pure layer.

**Modify:**

- `functions/_middleware.ts` — allow POST on `/api/subscribe` only.
- `functions/types.d.ts` — add `LEADS: KVNamespace` + `NEWSLETTER_KV_SALT: string`.
- `.dev.vars.example` — add `NEWSLETTER_KV_SALT` placeholder + LEADS binding note.
- `src/components/Newsletter.astro` — full rewrite (Tally iframe → same-origin form).
- `src/pages/privacy.astro` — replace the Tally sentence (line 12).
- `functions/api/channel.ts` — D-2 M1: wrap app-token `put` (l.105) + `delete` (l.129) in try/catch.

**No change:** all 11 calculators, `src/lib/calculators/`, `src/lib/site.ts`, `src/data/faqs.ts`, prog-SEO routes, `ChannelImport.astro`, existing configs.

---

### Task E-1: Pure newsletter layer + config + tests

**Files:**

- Create: `src/lib/newsletter/validateEmail.ts`
- Create: `src/lib/newsletter/keys.ts`
- Create: `src/data/newsletterConfig.ts`
- Create: `tests/newsletter.test.ts`

**Interfaces:**

- Produces: `validateEmail(input, maxLen?)` → `{ok:true,email} | {ok:false,reason}`; `normalizeEmail(input) → string`; `subscriberKey(email, salt) → Promise<string>` (async, SHA-256); `shortHash(value, salt, len?) → Promise<string>`. Consumed by E-2's Function and E-3's component (config only).

- [ ] **Step 1: Write the failing tests**

Create `tests/newsletter.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import {
  validateEmail,
  normalizeEmail,
} from "../src/lib/newsletter/validateEmail";
import { subscriberKey, shortHash } from "../src/lib/newsletter/keys";

describe("normalizeEmail", () => {
  it("trims + lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
  it("returns empty for non-strings", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(123)).toBe("");
  });
  it("returns empty for empty/whitespace", () => {
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("validateEmail", () => {
  it("accepts a normal email", () => {
    expect(validateEmail("  Foo@Bar.COM ")).toEqual({
      ok: true,
      email: "foo@bar.com",
    });
  });
  it("rejects empty", () => {
    expect(validateEmail("")).toEqual({ ok: false, reason: "empty" });
    expect(validateEmail("   ")).toEqual({ ok: false, reason: "empty" });
  });
  it("rejects missing @", () => {
    expect(validateEmail("foo.bar.com")).toEqual({
      ok: false,
      reason: "format",
    });
  });
  it("rejects no dot in domain", () => {
    expect(validateEmail("foo@bar")).toEqual({ ok: false, reason: "format" });
  });
  it("rejects spaces", () => {
    expect(validateEmail("foo @bar.com")).toEqual({
      ok: false,
      reason: "format",
    });
  });
  it("rejects too long", () => {
    const long = "x".repeat(250) + "@b.com"; // > 254
    expect(validateEmail(long)).toEqual({ ok: false, reason: "length" });
  });
  it("respects custom maxLen", () => {
    expect(validateEmail("a@b.co", 3)).toEqual({ ok: false, reason: "length" });
  });
});

describe("subscriberKey", () => {
  it("is deterministic for same email+salt", async () => {
    const a = await subscriberKey("Foo@Bar.com", "salt");
    const b = await subscriberKey("  foo@bar.com  ", "salt");
    expect(a).toBe(b);
  });
  it("changes with salt", async () => {
    const a = await subscriberKey("foo@bar.com", "salt1");
    const b = await subscriberKey("foo@bar.com", "salt2");
    expect(a).not.toBe(b);
  });
  it("changes with email", async () => {
    const a = await subscriberKey("a@b.com", "salt");
    const b = await subscriberKey("c@d.com", "salt");
    expect(a).not.toBe(b);
  });
  it("is prefixed sub: and is 64-char hex", async () => {
    const k = await subscriberKey("foo@bar.com", "salt");
    expect(k.startsWith("sub:")).toBe(true);
    expect(k.slice(4)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("does not leak the email", async () => {
    const k = await subscriberKey("foo@bar.com", "salt");
    expect(k).not.toContain("foo");
    expect(k).not.toContain("bar.com");
  });
});

describe("shortHash", () => {
  it("is deterministic", async () => {
    expect(await shortHash("1.2.3.4", "salt")).toBe(
      await shortHash("1.2.3.4", "salt"),
    );
  });
  it("respects length", async () => {
    expect((await shortHash("x", "s", 8)).length).toBe(8);
  });
  it("changes with salt", async () => {
    expect(await shortHash("x", "s1")).not.toBe(await shortHash("x", "s2"));
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm test -- tests/newsletter.test.ts`
Expected: FAIL — modules `../src/lib/newsletter/validateEmail` and `../src/lib/newsletter/keys` not found.

- [ ] **Step 3: Implement `src/lib/newsletter/validateEmail.ts`**

```ts
// Pure email validation + normalization for the newsletter capture flow.
// No DOM, no fetch, no Astro imports, no side effects. Deterministic + sync.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trim + lowercase. Returns "" for non-strings. Pure. */
export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

export type EmailValidation =
  | { ok: true; email: string }
  | { ok: false; reason: "empty" | "format" | "length" };

/** Validate + normalize an email. maxLen defaults to 254 (RFC 5321 practical cap). */
export function validateEmail(input: unknown, maxLen = 254): EmailValidation {
  const email = normalizeEmail(input);
  if (email === "") return { ok: false, reason: "empty" };
  if (email.length > maxLen) return { ok: false, reason: "length" };
  if (!EMAIL_REGEX.test(email)) return { ok: false, reason: "format" };
  return { ok: true, email };
}
```

- [ ] **Step 4: Implement `src/lib/newsletter/keys.ts`**

```ts
// Pure subscriber-key + short-hash derivation. Uses web-standard SubtleCrypto
// (available in Cloudflare Workers and Node >= 19, so Vitest can exercise it).
// No DOM, no Astro imports, no fetch, no side effects. Deterministic + async.

import { normalizeEmail } from "./validateEmail";

const enc = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  return [...new Uint8Array(buf)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** "sub:" + hex(sha256(salt + ":" + normalize(email))). Non-enumerable KV key. */
export async function subscriberKey(
  email: string,
  salt: string,
): Promise<string> {
  const data = enc.encode(`${salt}:${normalizeEmail(email)}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return `sub:${toHex(digest)}`;
}

/** Short salted hash for rate-limit keys + IP-at-rest (non-reversible). len default 16. */
export async function shortHash(
  value: string,
  salt: string,
  len = 16,
): Promise<string> {
  const data = enc.encode(`${salt}:${value}`);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return toHex(digest).slice(0, len);
}
```

- [ ] **Step 5: Implement `src/data/newsletterConfig.ts`**

```ts
// Single editable source of truth for newsletter copy + limits.
// Read by src/components/Newsletter.astro (component) and
// functions/api/subscribe.ts (Function). No literals in the component.

export const NEWSLETTER = {
  heading: "Get new creator tools + monetization tips",
  body: "Occasional emails. No spam. Unsubscribe anytime.",
  ctaLabel: "Subscribe",
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  consentLabel: "I agree to receive occasional emails.",
  privacyUrl: "/privacy",
  thanksUrl: "/newsletter/thanks",
  honeypotField: "company", // hidden field name; non-empty = bot
  source: "newsletter", // default source tag written to KV
  rateLimitPerMinute: 5, // per-IP cap
  maxEmailLength: 254,
} as const;
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm test -- tests/newsletter.test.ts`
Expected: PASS — 18 tests (3 normalizeEmail + 7 validateEmail + 5 subscriberKey + 3 shortHash).

- [ ] **Step 7: Run the full suite + lint**

Run: `npm test && npm run lint`
Expected: full suite 133 → 151 passing; prettier + eslint clean.

- [ ] **Step 8: Commit**

```bash
git add src/lib/newsletter/validateEmail.ts src/lib/newsletter/keys.ts src/data/newsletterConfig.ts tests/newsletter.test.ts
git commit -m "feat(newsletter): add pure email validation + KV key derivation + config + tests (E-1)"
```

---

### Task E-2: Subscribe Pages Function + middleware + Env + D-2 M1 cleanup

**Files:**

- Create: `functions/api/subscribe.ts`
- Modify: `functions/_middleware.ts`
- Modify: `functions/types.d.ts`
- Modify: `.dev.vars.example`
- Modify: `functions/api/channel.ts` (D-2 M1: wrap app-token put l.105 + delete l.129 in try/catch)

**Interfaces:**

- Consumes: `validateEmail` from E-1; `subscriberKey`, `shortHash` from E-1; `NEWSLETTER` config from E-1; `Env` from `functions/types.d.ts`.
- Produces: `POST /api/subscribe` → JSON `{ok:true}` (fetch) or 302 to `/newsletter/thanks` (no-JS HTML); error codes `invalid-input|consent-required|invalid-email|rate-limited|bad-request|not-configured|upstream-error`.

- [ ] **Step 1: Update `functions/types.d.ts` — add `LEADS` + `NEWSLETTER_KV_SALT`**

Replace the file contents with:

```ts
// Type declarations for Cloudflare Pages Functions runtime.
// Sourced from @cloudflare/workers-types; declared here so functions/ type-checks
// without polluting the Astro/tsconfig app context.
/// <reference types="@cloudflare/workers-types" />

export interface Env {
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  YOUTUBE_API_KEY: string;
  USE_MOCK_UPSTREAM?: string; // "true" → return fixtures instead of calling upstream
  CHANNEL_CACHE: KVNamespace;
  ORIGIN?: string; // optional allowed origin override (defaults to request origin)
  LEADS: KVNamespace; // newsletter subscriber records + rate-limit counters
  NEWSLETTER_KV_SALT: string; // secret salt for subscriberKey + rate-limit keys
}
```

- [ ] **Step 2: Update `functions/_middleware.ts` — allow POST on `/api/subscribe` only**

Replace the file contents with:

```ts
import type { Env } from "./types";

const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Same-origin guard: block cross-site calls to /api/* to prevent abuse.
// Browsers send Origin on cross-origin fetches; same-origin fetches may omit it.
// POST is allowed ONLY on /api/subscribe (newsletter capture); all other paths
// remain GET/HEAD/OPTIONS only.
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const method = request.method.toUpperCase();
  const pathname = new URL(request.url).pathname;

  const allowed =
    ALLOWED_METHODS.has(method) ||
    (method === "POST" && pathname === "/api/subscribe");
  if (!allowed) {
    return json({ ok: false, error: "method-not-allowed" }, 405);
  }

  const origin =
    request.headers.get("Origin") || request.headers.get("Referer");
  if (origin) {
    const allowedOrigin = env.ORIGIN || new URL(request.url).origin;
    try {
      const o = new URL(origin);
      if (o.origin !== allowedOrigin) {
        return json({ ok: false, error: "forbidden-origin" }, 403);
      }
    } catch {
      return json({ ok: false, error: "forbidden-origin" }, 403);
    }
  }

  // CORS: same-origin only — do not add permissive Access-Control-Allow-Origin.
  return next();
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
```

- [ ] **Step 3: Apply the D-2 M1 cleanup in `functions/api/channel.ts`**

Wrap the app-token KV `put` (in `getTwitchToken`) in try/catch. Replace:

```ts
if (!body.access_token) throw new UpstreamError("twitch-token");
// Cache ~50 days (token lives ~60 days); refresh on 401 at call sites.
await env.CHANNEL_CACHE.put(KV_KEYS.twitchAppToken, body.access_token, {
  expirationTtl: 50 * 24 * 60 * 60,
});
return body.access_token;
```

with:

```ts
if (!body.access_token) throw new UpstreamError("twitch-token");
// Cache ~50 days (token lives ~60 days); refresh on 401 at call sites.
try {
  await env.CHANNEL_CACHE.put(KV_KEYS.twitchAppToken, body.access_token, {
    expirationTtl: 50 * 24 * 60 * 60,
  });
} catch {
  // Token cache write failure is non-fatal; return the token uncached.
}
return body.access_token;
```

Then wrap the 401 purge `delete` (in `liveTwitch`) in try/catch. Replace:

```ts
if (usersRes.status === 401) {
  // token expired — purge and surface a retryable error
  await env.CHANNEL_CACHE.delete(KV_KEYS.twitchAppToken);
  throw new UpstreamError("twitch-token");
}
```

with:

```ts
if (usersRes.status === 401) {
  // token expired — purge and surface a retryable error
  try {
    await env.CHANNEL_CACHE.delete(KV_KEYS.twitchAppToken);
  } catch {
    // Purge failure is non-fatal; the expired token will simply be re-fetched.
  }
  throw new UpstreamError("twitch-token");
}
```

- [ ] **Step 4: Create `functions/api/subscribe.ts`**

```ts
import type { Env } from "../types";
import { validateEmail } from "../../src/lib/newsletter/validateEmail";
import { subscriberKey, shortHash } from "../../src/lib/newsletter/keys";
import { NEWSLETTER } from "../../src/data/newsletterConfig";

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

const err = (error: string, status: number) =>
  json({ ok: false, error }, status);

const redirect = (url: string): Response =>
  new Response(null, { status: 302, headers: { location: url } });

type SubscribeBody = {
  email?: unknown;
  consent?: unknown;
  source?: unknown;
  [hp: string]: unknown;
};

function parseBody(contentType: string, raw: string): SubscribeBody | null {
  try {
    if (contentType.includes("application/json")) {
      const obj = JSON.parse(raw);
      return typeof obj === "object" && obj !== null
        ? (obj as SubscribeBody)
        : null;
    }
    // application/x-www-form-urlencoded (no-JS form POST)
    const params = new URLSearchParams(raw);
    const out: SubscribeBody = {};
    for (const [k, v] of params.entries()) out[k] = v;
    return out;
  } catch {
    return null;
  }
}

function isConsentTrue(value: unknown): boolean {
  return value === true || value === "true" || value === "on" || value === "1";
}

function clientIp(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

// Single wrapped entry: Pages invokes onRequestPost; all thrown errors are
// mapped to the correct HTTP response here (JSON for fetch, 302 for no-JS HTML).
export const onRequestPost: PagesFunction<Env> = async (context) => {
  const acceptsJson = (context.request.headers.get("accept") ?? "").includes(
    "application/json",
  );
  try {
    return await handle(context);
  } catch {
    return acceptsJson
      ? err("upstream-error", 502)
      : redirect(`${NEWSLETTER.thanksUrl}?error=upstream-error`);
  }
};

async function handle(
  context: Parameters<PagesFunction<Env>>[0],
): Promise<Response> {
  const { request, env } = context;
  const acceptsJson = (request.headers.get("accept") ?? "").includes(
    "application/json",
  );
  const fail = (code: string, status: number): Response =>
    acceptsJson
      ? err(code, status)
      : redirect(`${NEWSLETTER.thanksUrl}?error=${code}`);

  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  const raw = await request.text();
  const body = parseBody(contentType, raw);
  if (!body) return fail("bad-request", 400);

  // 1. honeypot — must be empty (do not reveal it's a honeypot)
  const hp = body[NEWSLETTER.honeypotField];
  if (typeof hp === "string" && hp.trim() !== "")
    return fail("invalid-input", 400);

  // 2. consent
  if (!isConsentTrue(body.consent)) return fail("consent-required", 400);

  // 3. email
  const v = validateEmail(body.email, NEWSLETTER.maxEmailLength);
  if (!v.ok) return fail("invalid-email", 400);

  // salt must be configured (checked before mock short-circuit so misconfig is visible)
  if (!env.NEWSLETTER_KV_SALT) return fail("not-configured", 503);

  const useMock = env.USE_MOCK_UPSTREAM === "true";
  const ip = clientIp(request);

  // 4. rate limit (best-effort KV; skipped in mock mode)
  if (!useMock) {
    try {
      const rlKey = `rl:${await shortHash(ip, env.NEWSLETTER_KV_SALT)}`;
      const prev = await env.LEADS.get(rlKey, "text");
      const count = prev == null ? 0 : Number(prev);
      const n = Number.isFinite(count) ? count : 0;
      if (n >= NEWSLETTER.rateLimitPerMinute) return fail("rate-limited", 429);
      await env.LEADS.put(rlKey, String(n + 1), { expirationTtl: 60 });
    } catch {
      // Rate-limit KV failure is non-fatal → fail open, proceed.
    }
  }

  // 5. idempotent write (skipped in mock mode)
  if (!useMock) {
    try {
      const key = await subscriberKey(v.email, env.NEWSLETTER_KV_SALT);
      const existing = await env.LEADS.get(key, "json");
      if (!existing) {
        const ipHash = await shortHash(ip, env.NEWSLETTER_KV_SALT);
        const ua = (request.headers.get("user-agent") ?? "").slice(0, 120);
        const source =
          typeof body.source === "string" && body.source
            ? body.source
            : NEWSLETTER.source;
        const record = {
          email: v.email,
          status: "subscribed",
          source,
          consentAt: Date.now(),
          ip: ipHash,
          ua,
        };
        await env.LEADS.put(key, JSON.stringify(record));
      }
      // existing record → idempotent; leave untouched, still return ok
    } catch {
      // KV write failure is non-fatal → still report success to the user.
    }
  }

  // 6. respond
  if (acceptsJson) return json({ ok: true });
  return redirect(NEWSLETTER.thanksUrl);
}
```

- [ ] **Step 5: Update `.dev.vars.example` — add salt placeholder + LEADS note**

Append after the existing `USE_MOCK_UPSTREAM=true` line:

```env
USE_MOCK_UPSTREAM=true
# Newsletter capture — secret salt for subscriber keys + rate-limit keys.
# Generate with: openssl rand -hex 32
NEWSLETTER_KV_SALT=dev_salt_replace_in_production
# KV bindings are bound via --kv=CHANNEL_CACHE --kv=LEADS on the wrangler command line.
```

- [ ] **Step 6: Type-check the functions directory**

Run: `npx tsc --noEmit -p functions/tsconfig.json`
Expected: no errors. (If `functions/tsconfig.json` does not include the new files, confirm it already globs `**/*.ts` under `functions/` — it does per D-2.)

- [ ] **Step 7: Run the full suite + lint**

Run: `npm test && npm run lint`
Expected: 151 passing; lint clean. (The Function itself is not unit-tested — matches D's `channel.ts`; the pure layer it depends on is tested in E-1, and the Function is exercised by the E-4 wrangler mock smoke.)

- [ ] **Step 8: Commit**

```bash
git add functions/api/subscribe.ts functions/_middleware.ts functions/types.d.ts functions/api/channel.ts .dev.vars.example
git commit -m "feat(newsletter): add /api/subscribe Pages Function + middleware POST + Env (E-2); wrap Twitch token KV writes in try/catch (D-2 M1)"
```

---

### Task E-3: Rewrite Newsletter component + thanks page + privacy update

**Files:**

- Modify: `src/components/Newsletter.astro` (full rewrite)
- Create: `src/pages/newsletter/thanks.astro`
- Modify: `src/pages/privacy.astro` (line 12)

**Interfaces:**

- Consumes: `NEWSLETTER` config from E-1. The form posts to `/api/subscribe` (E-2) and the no-JS path 302s to `/newsletter/thanks` (this task).

- [ ] **Step 1: Rewrite `src/components/Newsletter.astro`**

Replace the entire file with:

```astro
---
import { NEWSLETTER } from "../data/newsletterConfig";
---
<aside class="newsletter" aria-label="Newsletter signup">
  <div class="newsletter-inner">
    <h2>{NEWSLETTER.heading}</h2>
    <p>{NEWSLETTER.body}</p>
    <form class="newsletter-form" data-newsletter action="/api/subscribe" method="POST">
      <div class="email-row">
        <label for="newsletter-email">{NEWSLETTER.emailLabel}</label>
        <input
          id="newsletter-email"
          type="email"
          name="email"
          inputmode="email"
          autocomplete="email"
          placeholder={NEWSLETTER.emailPlaceholder}
          required
        />
        <button type="submit" class="cta" data-newsletter-submit>
          {NEWSLETTER.ctaLabel}
        </button>
      </div>
      <label class="consent">
        <input type="checkbox" name="consent" value="true" required />
        <span>{NEWSLETTER.consentLabel}</span>
      </label>
      <a class="privacy-link" href={NEWSLETTER.privacyUrl}>Read our Privacy Policy</a>
      <input
        type="text"
        name={NEWSLETTER.honeypotField}
        class="hp"
        tabindex="-1"
        autocomplete="off"
        aria-hidden="true"
      />
      <input type="hidden" name="source" value={NEWSLETTER.source} />
      <p class="newsletter-status" data-newsletter-status role="status" aria-live="polite" hidden></p>
    </form>
  </div>
</aside>
<script>
  const ERROR_COPY: Record<string, string> = {
    "invalid-input": "Please check your details and try again.",
    "consent-required": "Please tick the consent box to subscribe.",
    "invalid-email": "That email doesn't look right — try again.",
    "rate-limited": "Too many attempts — please wait a minute and try again.",
    "bad-request": "We couldn't read your submission — try again.",
    "not-configured": "Newsletter signup isn't configured right now.",
    "upstream-error": "Something went wrong — try again shortly.",
  };

  function initNewsletter(root: HTMLFormElement) {
    const status = root.querySelector<HTMLElement>("[data-newsletter-status]");
    const submit = root.querySelector<HTMLButtonElement>(
      "[data-newsletter-submit]",
    );
    if (!status || !submit) return;

    const setStatus = (msg: string, isError = false) => {
      status.textContent = msg;
      status.hidden = !msg;
      status.dataset.error = isError ? "true" : "false";
    };

    root.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = new FormData(root);
      const payload: Record<string, unknown> = {};
      for (const [k, v] of data.entries()) payload[k] = v;
      submit.disabled = true;
      setStatus("Subscribing…");
      try {
        const res = await fetch("/api/subscribe", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            accept: "application/json",
          },
          body: JSON.stringify(payload),
        });
        const body = (await res.json()) as { ok: boolean; error?: string };
        if (!res.ok || !body.ok) {
          setStatus(
            ERROR_COPY[body.error ?? ""] ??
              "Something went wrong — try again.",
            true,
          );
        } else {
          setStatus("You're subscribed. Watch the site for new tools and tips.");
          root.reset();
        }
      } catch {
        setStatus("Network error — try again.", true);
      } finally {
        submit.disabled = false;
      }
    });
  }

  document
    .querySelectorAll<HTMLFormElement>("[data-newsletter]")
    .forEach(initNewsletter);
</script>
<style>
  .newsletter { padding-block: var(--section-y-phone); }
  .newsletter-inner { border: 1px solid var(--color-border); border-radius: var(--radius-lg); background: var(--color-surface); padding: var(--spacing-6); }
  h2 { font-size: var(--text-2xl); font-weight: 800; margin-bottom: var(--spacing-3); }
  p { color: var(--color-muted); font-size: var(--text-base); margin-bottom: var(--spacing-4); }
  .newsletter-form { display: flex; flex-direction: column; gap: var(--spacing-3); }
  .email-row { display: flex; flex-wrap: wrap; gap: var(--spacing-2); align-items: end; }
  .email-row label { flex-basis: 100%; color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  .email-row input { flex: 1 1 240px; min-height: 40px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; }
  .email-row input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .cta { padding: 0 var(--spacing-4); min-height: 40px; border: 1px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-accent); color: var(--color-accent-on); font: 700 var(--text-sm)/1 var(--font-body); cursor: pointer; }
  .cta:hover { filter: brightness(1.05); }
  .cta:disabled { opacity: 0.6; cursor: progress; }
  .consent { display: flex; gap: var(--spacing-2); align-items: start; font-size: var(--text-sm); color: var(--color-fg-2); }
  .consent input { margin-top: 0.15em; }
  .privacy-link { font-size: var(--text-sm); color: var(--color-accent); }
  .hp { position: absolute; left: -9999px; width: 1px; height: 1px; opacity: 0; }
  .newsletter-status { font-size: var(--text-sm); color: var(--color-muted); }
  .newsletter-status[data-error="true"] { color: var(--color-fg); }
  @media (min-width: 640px) { .newsletter { padding-block: var(--section-y-tablet); } }
  @media (min-width: 1024px) { .newsletter { padding-block: var(--section-y-desktop); } }
</style>
```

- [ ] **Step 2: Create `src/pages/newsletter/thanks.astro`**

```astro
---
import BaseLayout from "../../layouts/BaseLayout.astro";
import { NEWSLETTER } from "../../data/newsletterConfig";

const error = Astro.url.searchParams.get("error");
const title = error ? "Subscription problem" : "You're subscribed";
const description = error
  ? "Something went wrong with your newsletter subscription."
  : "Thanks for subscribing to creator tools and monetization tips.";

const ERROR_COPY: Record<string, string> = {
  "invalid-input": "Please check your details and try again.",
  "consent-required": "Please tick the consent box and try again.",
  "invalid-email": "That email doesn't look right — please go back and try again.",
  "rate-limited": "Too many attempts — please wait a minute and try again.",
  "bad-request": "We couldn't read your submission — please try again.",
  "not-configured": "Newsletter signup isn't configured right now.",
  "upstream-error": "Something went wrong — please try again shortly.",
};

const message = error
  ? (ERROR_COPY[error] ?? "Something went wrong. Please go back and try again.")
  : "You're subscribed. We store your email in Cloudflare KV and use it only to send occasional updates. No confirmation email is sent.";
---
<BaseLayout title={`${title} — ${NEWSLETTER.heading}`} description={description} noindex>
  <div class="container">
    <article class="thanks">
      <p class="eyebrow">Newsletter</p>
      <h1>{title}</h1>
      <p>{message}</p>
      <p><a href="/">Back to the calculators</a></p>
    </article>
  </div>
</BaseLayout>
<style>
  .thanks { max-width: 640px; margin: 0 auto; padding-block: var(--section-y-desktop); }
  .eyebrow { color: var(--color-meta); font-size: var(--text-xs); font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; }
  h1 { font-size: var(--text-3xl); font-weight: 800; margin-top: var(--spacing-3); margin-bottom: var(--spacing-4); }
  p { line-height: var(--leading-body); color: var(--color-fg); margin-bottom: var(--spacing-4); }
  a { color: var(--color-accent); }
</style>
```

- [ ] **Step 3: Update `src/pages/privacy.astro` — replace the Tally sentence (line 12)**

Replace:

```astro
      <p>If you join the email waitlist via Tally.so, your email is processed by Tally under their privacy policy.</p>
```

with:

```astro
      <p>If you subscribe to the newsletter, your email is stored in Cloudflare KV and used only to send occasional updates. No confirmation email is sent (single opt-in). Unsubscribe by contacting us via the repository.</p>
```

- [ ] **Step 4: Build + lint**

Run: `npm run build && npm run lint`
Expected: build succeeds, 48 pages (47 + `/newsletter/thanks`), no Tally/iframe references in `dist/`; lint clean. Verify no Tally reference remains: `grep -ri "tally" dist/ src/` should return nothing.

- [ ] **Step 5: Run the full suite**

Run: `npm test`
Expected: 151 passing (unchanged — E-3 is UI-only).

- [ ] **Step 6: Commit**

```bash
git add src/components/Newsletter.astro src/pages/newsletter/thanks.astro src/pages/privacy.astro
git commit -m "feat(newsletter): rewrite Newsletter.astro as same-origin KV-backed form + thanks page + privacy update (E-3)"
```

---

### Task E-4: Controller verify + final opus whole-branch review

**Files:** none (verification + review only).

- [ ] **Step 1: Full verification at HEAD**

Run:

```bash
npm test            # 151 passing
npm run lint        # clean
npm run build       # 48 pages, no adapter
grep -ri "tally" dist/ src/ ; grep -ri "iframe" src/components/Newsletter.astro  # both empty
```

Expected: all green; zero Tally/iframe references.

- [ ] **Step 2: Regression-seam probe**

Confirm E touched only the newsletter/functions surfaces:

```bash
git diff --stat 2ec1998..HEAD
```

Expected changeset = only: `src/lib/newsletter/*`, `src/data/newsletterConfig.ts`, `tests/newsletter.test.ts`, `functions/api/subscribe.ts`, `functions/_middleware.ts`, `functions/types.d.ts`, `functions/api/channel.ts`, `.dev.vars.example`, `src/components/Newsletter.astro`, `src/pages/newsletter/thanks.astro`, `src/pages/privacy.astro`, plus the two E docs. **Zero** changes to `src/lib/calculators/`, `src/lib/site.ts`, `src/data/faqs.ts`, prog-SEO routes, `ChannelImport.astro`, existing configs, or any calculator island/page.

- [ ] **Step 3: Wrangler mock smoke for `/api/subscribe`**

Build, then run:

```bash
npm run build
npx wrangler@latest pages dev dist \
  --kv=CHANNEL_CACHE --kv=LEADS \
  --binding USE_MOCK_UPSTREAM=true \
  --binding NEWSLETTER_KV_SALT=dev_salt
```

Probe (each via `curl` against the local wrangler origin):

1. `curl -s -X POST http://localhost:8788/api/subscribe -H 'content-type: application/json' -H 'accept: application/json' -d '{"email":"a@b.com","consent":true}'` → `{"ok":true}` (200).
2. Invalid email: `... -d '{"email":"bad","consent":true}'` → `{"ok":false,"error":"invalid-email"}` (400).
3. Missing consent: `... -d '{"email":"a@b.com"}'` → `{"ok":false,"error":"consent-required"}` (400).
4. Honeypot filled: `... -d '{"email":"a@b.com","consent":true,"company":"x"}'` → `{"ok":false,"error":"invalid-input"}` (400).
5. No-JS success: `curl -s -o /dev/null -w '%{http_code} %{redirect_url}' -X POST http://localhost:8788/api/subscribe -H 'accept: text/html' -d 'email=a@b.com&consent=true'` → `302 http://localhost:8788/newsletter/thanks`.
6. No-JS error: same with `email=bad` → `302 .../newsletter/thanks?error=invalid-email`.
7. Cross-origin: `curl -s -o /dev/null -w '%{http_code}' -X POST http://localhost:8788/api/subscribe -H 'origin: https://evil.com' -H 'content-type: application/json' -d '{"email":"a@b.com","consent":true}'` → `403`.
8. Idempotency (live local KV): re-run probe 1 with `USE_MOCK_UPSTREAM` unset (keep `NEWSLETTER_KV_SALT` bound + `--kv=LEADS`) twice; both → `{"ok":true}`, and `npx wrangler@latest kv:key list --binding LEADS` (or dashboard) shows a single `sub:` record for that email. (Best-effort — if local KV tooling is awkward, record the attempt in the ledger; probes 1–7 are the required gate.)

Expected: probes 1–7 pass; probe 8 attempted.

- [ ] **Step 4: Dispatch the final opus whole-branch review**

Run `scripts/review-package 2ec1998 HEAD` (from the SDD skill dir) and dispatch the final code-reviewer on the most capable available model with the printed package path + the global constraints block. Required verdict: 0 Critical/Important, all 10 CLAUDE.md rules ✅, secret hygiene (NEWSLETTER_KV_SALT never in browser/dist), same-origin POST, honeypot/consent/validation/rate-limit verified, PII minimization verified, D-2 M1 try/catch verified.

- [ ] **Step 5: Apply any final-review Critical/Important fixes**

Dispatch ONE fix subagent with the complete findings list (not one per finding). Re-run the covering tests + build. Re-review only if a fix touched behavior.

- [ ] **Step 6: Update the progress ledger + report**

Append the E completion line to `.superpowers/sdd/progress-e.md` (gitignored): commits, test count, review verdict, deferred Minors. Report READY TO MERGE to the controller.

---

## Self-review notes (plan author)

- **Spec coverage:** validateEmail + keys + config (E-1) ✓; Function + middleware + Env + D-2 M1 (E-2) ✓; component rewrite + thanks page + privacy (E-3) ✓; verify + final review (E-4) ✓. All spec sections map to a task.
- **Type consistency:** `validateEmail(input, maxLen?)`, `normalizeEmail`, `subscriberKey(email, salt)`, `shortHash(value, salt, len?)` signatures match across E-1 (definition), E-2 (Function consumption), and the tests. `Env.LEADS` + `Env.NEWSLETTER_KV_SALT` match between `types.d.ts` and `subscribe.ts`. `NEWSLETTER.honeypotField` / `thanksUrl` / `source` / `rateLimitPerMinute` / `maxEmailLength` match between config, Function, and component.
- **No placeholders:** every code step contains the full file content or an exact before/after block. No "TBD"/"handle edge cases".
- **Mock-mode quirk pinned:** `NEWSLETTER_KV_SALT` is checked before the `useMock` short-circuit, so mock smoke must bind it (Step 3 of E-4 includes `--binding NEWSLETTER_KV_SALT=dev_salt`).
