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
