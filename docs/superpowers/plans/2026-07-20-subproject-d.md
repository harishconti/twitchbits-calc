# Sub-project D — Channel Import via Cloudflare Pages Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a same-origin Cloudflare Pages Function (`/api/channel`) that fetches public Twitch/YouTube channel stats server-side (API keys in Cloudflare secrets, never shipped to the browser), plus a progressive-enhancement `ChannelImport` island on three tool pages that surfaces those stats and pre-fills the one input with a direct public mapping (Twitch live viewers → avg viewers).

**Architecture:** A thin Pages Function (`functions/api/channel.ts`) brokers upstream platform APIs, caching normalized results in a KV namespace. All parse/normalize logic is pure and lives in `src/lib/channel/` (Vitest-tested). The island is additive vanilla JS; it queries the calculator's existing RangeSlider inputs by data attribute and dispatches a bubbling `input` event to trigger the existing render path — no calculator island is modified. Pages remain static; the Function is an optional server-side enhancement.

**Tech Stack:** Astro 6 static output (unchanged), Cloudflare Pages Functions (`functions/`, `PagesFunction<Env>`, KV binding), `@cloudflare/workers-types` (dev-only), vanilla-JS island, Vitest for pure logic.

## Global Constraints

Copied verbatim from the spec (`docs/superpowers/specs/2026-07-20-subproject-d-design.md`); every task's requirements implicitly include this section.

1. **Zero backend (bounded relaxation).** Only `functions/` runs server-side. Pages stay static (`output: "static"` unchanged; no Astro adapter). No DB, no user auth (the Twitch app access token is server-to-server client credentials, not user login). No SSR/edge rendering of pages.
2. **Rates in config.** Supported platforms, URL patterns, upstream endpoints, and KV TTLs live in `src/data/channelConfig.ts`. A rate/endpoint change is a one-line data edit.
3. **`src/lib/channel/` is pure.** No DOM, no Astro imports, no `fetch`, no side effects. Input guards: null/missing/NaN → neutral (empty string, 0, or `undefined` per field). All pure functions have Vitest tests. The Functions in `functions/` are thin I/O glue (not pure, not Vitest-tested — verified via `wrangler pages dev` mock mode).
4. **Single accent color.** `ChannelImport` uses existing slate/purple tokens only. No new colors, no neon gradients.
5. **No render-blocking 3rd-party scripts.** The island's `fetch` is user-initiated (on click). No new client third-party scripts. `@cloudflare/workers-types` is dev-only and never shipped to the browser.
6. **Performance bar.** Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms. The island is small, below-the-fold, lazy; no new client weight.
7. **SEO is structural.** No new pages. H1/H2/canonical/JSON-LD unchanged on adopting pages. Prog-SEO routes untouched (static, no island) → prog-SEO output unaffected. `src/lib/site.ts` TOOLS unchanged (no new tool).
8. **Affiliate IDs are config.** n/a (no affiliate changes).
9. **Secrets never shipped to the browser.** `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `YOUTUBE_API_KEY` are Cloudflare Pages env vars accessed only via `context.env` in the Function. They never appear in `src/`, `dist/`, or any client bundle. `.dev.vars` (real secrets) is gitignored; only `.dev.vars.example` (placeholder) is committed.
10. **Regression seam.** All existing calculators, all pure calculators in `src/lib/calculators/`, all existing configs in `src/data/` (other than new additive files), `src/lib/site.ts`, all prog-SEO routes, and all pages' existing structure remain byte-for-byte unchanged. The three adopting pages gain ONLY an additive `<ChannelImport platform="..." />` element + its import line. No calculator island is modified.

## File Structure

```
functions/                          (NEW — server-side, deployed by Cloudflare Pages alongside dist/)
  api/channel.ts                    GET /api/channel?url=<encoded>
  _middleware.ts                    same-origin guard
  tsconfig.json                     Workers runtime tsconfig
functions/types.d.ts                (NEW) KVNamespace / PagesFunction type declarations
.dev.vars.example                   (NEW, committed) secret template — real .dev.vars is gitignored
src/data/channelConfig.ts           (NEW, rule 2) platforms, URL patterns, upstream endpoints, KV TTLs
src/data/channelFixtures.ts          (NEW) mock upstream payloads for dev/smoke
src/lib/channel/                    (NEW, pure — rule 3)
  types.ts                          ChannelStats, PlatformKey, ParsedChannel, YoutubeIdType
  parseUrl.ts                       parseChannelUrl(url): ParsedChannel | null
  normalize.ts                      normalizeTwitch(raw), normalizeYouTube(raw)
src/components/ChannelImport.astro  (NEW) progressive-enhancement island
tests/channel.test.ts               (NEW) pure fn tests
src/pages/youtube-money-calculator.astro        (MODIFY — additive: import + <ChannelImport platform="youtube" />)
src/pages/twitch-ad-revenue-calculator.astro     (MODIFY — additive: import + <ChannelImport platform="twitch" />)
src/pages/twitch-revenue-calculator.astro       (MODIFY — additive: import + <ChannelImport platform="twitch" />)
package.json                        (MODIFY — add @cloudflare/workers-types to devDependencies)
.gitignore                          (MODIFY — add .dev.vars)
```

---

### Task D-1: Pure channel parse + normalize logic + tests

**Files:**
- Create: `src/data/channelConfig.ts`
- Create: `src/lib/channel/types.ts`
- Create: `src/lib/channel/parseUrl.ts`
- Create: `src/lib/channel/normalize.ts`
- Test: `tests/channel.test.ts`

**Interfaces:**
- Consumes: nothing (foundational pure layer).
- Produces: `PlatformKey`, `YoutubeIdType`, `ParsedChannel`, `ChannelStats` types; `parseChannelUrl(url)`; `normalizeTwitch(raw)`, `normalizeYouTube(raw)`. Consumed by D-2 (Function) and D-3 (island).

- [ ] **Step 1: Write `src/data/channelConfig.ts`**

```ts
// Single editable source of truth for channel import (CLAUDE.md rule 2).
// Upstream endpoints, URL patterns, and KV TTLs live here.

export type PlatformKey = "twitch" | "youtube";
export type YoutubeIdType = "handle" | "channelId" | "username";

export const CHANNEL_PLATFORMS: Record<PlatformKey, {
  label: string;
  urlHosts: string[];          // host substrings parseChannelUrl accepts
  kvTtlSeconds: number;        // cache TTL for normalized stats
}> = {
  twitch: {
    label: "Twitch",
    urlHosts: ["twitch.tv"],
    kvTtlSeconds: 10 * 60,     // 10 minutes
  },
  youtube: {
    label: "YouTube",
    urlHosts: ["youtube.com", "www.youtube.com", "youtu.be"],
    kvTtlSeconds: 60 * 60,     // 1 hour
  },
};

export const TWITCH_ENDPOINTS = {
  token: "https://id.twitch.tv/oauth2/token",
  users: "https://api.twitch.tv/helix/users",
  streams: "https://api.twitch.tv/helix/streams",
} as const;

export const YOUTUBE_ENDPOINTS = {
  channels: "https://www.googleapis.com/youtube/v3/channels",
} as const;

// KV keys
export const KV_KEYS = {
  twitchAppToken: "twitch:app_token",
  channel: (platform: PlatformKey, id: string) => `channel:${platform}:${id.toLowerCase()}`,
} as const;
```

- [ ] **Step 2: Write `src/lib/channel/types.ts`**

```ts
import type { PlatformKey, YoutubeIdType } from "../../data/channelConfig";

export type { PlatformKey, YoutubeIdType };

export interface ParsedChannel {
  platform: PlatformKey;
  identifier: string;   // twitch login, or youtube handle/channelId/username (no leading "@")
  idType: "login" | YoutubeIdType;
}

export interface ChannelStats {
  platform: PlatformKey;
  id: string;            // twitch login or youtube channelId
  displayName: string;
  thumbnailUrl: string;
  broadcasterType?: string;      // twitch only: "affiliate" | "partner" | ""
  subscribers?: number;           // youtube only (undefined when hiddenSubscribers)
  hiddenSubscribers?: boolean;    // youtube only
  lifetimeViews: number;
  videoCount?: number;             // youtube only
  isLive?: boolean;                // twitch only
  concurrentViewers?: number;      // twitch only, when isLive
  fetchedAt: number;               // epoch ms
}

// Raw upstream shapes (only the fields we read). Unknown/missing fields are tolerated.
export interface TwitchUserRaw {
  id?: string;
  login?: string;
  display_name?: string;
  broadcaster_type?: string;
  view_count?: number | string;
  profile_image_url?: string;
}
export interface TwitchStreamRaw {
  viewer_count?: number | string;
}
export interface YoutubeChannelRaw {
  id?: string;
  snippet?: {
    title?: string;
    thumbnails?: { default?: { url?: string }; medium?: { url?: string }; high?: { url?: string } };
  };
  statistics?: {
    subscriberCount?: number | string;
    viewCount?: number | string;
    videoCount?: number | string;
    hiddenSubscriberCount?: boolean;
  };
}
```

- [ ] **Step 3: Write the failing tests in `tests/channel.test.ts`**

```ts
import { describe, it, expect } from "vitest";
import { parseChannelUrl } from "../src/lib/channel/parseUrl";
import { normalizeTwitch, normalizeYouTube } from "../src/lib/channel/normalize";

describe("parseChannelUrl", () => {
  it("parses a twitch.tv login URL", () => {
    expect(parseChannelUrl("https://twitch.tv/shroud")).toEqual({
      platform: "twitch", identifier: "shroud", idType: "login",
    });
  });
  it("parses a twitch.tv URL without protocol", () => {
    expect(parseChannelUrl("twitch.tv/shroud")).toEqual({
      platform: "twitch", identifier: "shroud", idType: "login",
    });
  });
  it("parses a youtube @handle URL", () => {
    expect(parseChannelUrl("https://www.youtube.com/@MrBeast")).toEqual({
      platform: "youtube", identifier: "MrBeast", idType: "handle",
    });
  });
  it("parses a youtube /channel/UC... URL", () => {
    expect(parseChannelUrl("https://youtube.com/channel/UCX6OQ3DkcsbYNE6H8u7q3dA")).toEqual({
      platform: "youtube", identifier: "UCX6OQ3DkcsbYNE6H8u7q3dA", idType: "channelId",
    });
  });
  it("parses a youtube /user/name URL", () => {
    expect(parseChannelUrl("https://www.youtube.com/user/Google")).toEqual({
      platform: "youtube", identifier: "Google", idType: "username",
    });
  });
  it("best-effort parses /c/name as a handle (strips @)", () => {
    expect(parseChannelUrl("https://youtube.com/c/Google")).toEqual({
      platform: "youtube", identifier: "Google", idType: "handle",
    });
  });
  it("strips a trailing slash and query string", () => {
    expect(parseChannelUrl("https://twitch.tv/shroud/")).toEqual({
      platform: "twitch", identifier: "shroud", idType: "login",
    });
    expect(parseChannelUrl("https://www.youtube.com/@MrBeast?view=1")).toEqual({
      platform: "youtube", identifier: "MrBeast", idType: "handle",
    });
  });
  it("returns null for unsupported hosts", () => {
    expect(parseChannelUrl("https://twitter.com/shroud")).toBeNull();
    expect(parseChannelUrl("https://kick.com/shroud")).toBeNull();
  });
  it("returns null for malformed URLs and non-URLs", () => {
    expect(parseChannelUrl("not a url")).toBeNull();
    expect(parseChannelUrl("https://twitch.tv/")).toBeNull();
    expect(parseChannelUrl("https://youtube.com/")).toBeNull();
    expect(parseChannelUrl("")).toBeNull();
  });
});

describe("normalizeTwitch", () => {
  const now = 1700000000000;
  it("maps a live broadcaster with viewers", () => {
    const stats = normalizeTwitch(
      { id: "1", login: "shroud", display_name: "shroud", broadcaster_type: "partner", view_count: 12345, profile_image_url: "https://img/shroud.png" },
      { viewer_count: 4200 },
      now,
    );
    expect(stats).toEqual({
      platform: "twitch", id: "shroud", displayName: "shroud",
      thumbnailUrl: "https://img/shroud.png", broadcasterType: "partner",
      lifetimeViews: 12345, isLive: true, concurrentViewers: 4200, fetchedAt: now,
    });
  });
  it("maps an offline broadcaster (no stream)", () => {
    const stats = normalizeTwitch(
      { id: "1", login: "shroud", display_name: "shroud", broadcaster_type: "", view_count: 0, profile_image_url: "https://img/shroud.png" },
      null,
      now,
    );
    expect(stats.isLive).toBe(false);
    expect(stats.concurrentViewers).toBeUndefined();
    expect(stats.lifetimeViews).toBe(0);
    expect(stats.broadcasterType).toBe("");
  });
  it("guards missing/NaN fields to neutral", () => {
    const stats = normalizeTwitch({}, undefined, now);
    expect(stats.id).toBe("");
    expect(stats.displayName).toBe("");
    expect(stats.thumbnailUrl).toBe("");
    expect(stats.lifetimeViews).toBe(0);
    expect(stats.isLive).toBe(false);
  });
  it("parses numeric strings from the API", () => {
    const stats = normalizeTwitch(
      { login: "x", display_name: "X", view_count: "999", profile_image_url: "u" },
      { viewer_count: "50" },
      now,
    );
    expect(stats.lifetimeViews).toBe(999);
    expect(stats.concurrentViewers).toBe(50);
  });
});

describe("normalizeYouTube", () => {
  const now = 1700000000000;
  it("maps a public channel with visible subscribers", () => {
    const stats = normalizeYouTube({
      id: "UC1",
      snippet: { title: "MrBeast", thumbnails: { medium: { url: "https://img/mr.png" } } },
      statistics: { subscriberCount: "50000000", viewCount: "25000000000", videoCount: "800", hiddenSubscriberCount: false },
    }, now);
    expect(stats).toEqual({
      platform: "youtube", id: "UC1", displayName: "MrBeast",
      thumbnailUrl: "https://img/mr.png", subscribers: 50000000,
      hiddenSubscribers: false, lifetimeViews: 25000000000, videoCount: 800, fetchedAt: now,
    });
  });
  it("respects hiddenSubscriberCount", () => {
    const stats = normalizeYouTube({
      id: "UC1", snippet: { title: "Hidden" }, statistics: { viewCount: "100", hiddenSubscriberCount: true },
    }, now);
    expect(stats.subscribers).toBeUndefined();
    expect(stats.hiddenSubscribers).toBe(true);
    expect(stats.lifetimeViews).toBe(100);
  });
  it("picks the best available thumbnail (high > medium > default)", () => {
    const hi = normalizeYouTube({ id: "1", snippet: { title: "t", thumbnails: { high: { url: "H" }, medium: { url: "M" } } } }, now);
    expect(hi.thumbnailUrl).toBe("H");
    const md = normalizeYouTube({ id: "1", snippet: { title: "t", thumbnails: { medium: { url: "M" }, default: { url: "D" } } } }, now);
    expect(md.thumbnailUrl).toBe("M");
    const def = normalizeYouTube({ id: "1", snippet: { title: "t", thumbnails: { default: { url: "D" } } } }, now);
    expect(def.thumbnailUrl).toBe("D");
  });
  it("guards missing statistics/snippet to neutral", () => {
    const stats = normalizeYouTube({}, now);
    expect(stats.id).toBe("");
    expect(stats.displayName).toBe("");
    expect(stats.thumbnailUrl).toBe("");
    expect(stats.lifetimeViews).toBe(0);
    expect(stats.subscribers).toBeUndefined();
  });
  it("parses numeric strings", () => {
    const stats = normalizeYouTube({
      id: "1", snippet: { title: "t" },
      statistics: { subscriberCount: "123", viewCount: "456", videoCount: "789" },
    }, now);
    expect(stats.subscribers).toBe(123);
    expect(stats.lifetimeViews).toBe(456);
    expect(stats.videoCount).toBe(789);
  });
});
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — `parseChannelUrl`, `normalizeTwitch`, `normalizeYouTube` are not exported (modules don't exist yet).

- [ ] **Step 5: Write `src/lib/channel/parseUrl.ts`**

```ts
import type { PlatformKey, YoutubeIdType } from "../../data/channelConfig";
import type { ParsedChannel } from "./types";

const safeUrl = (input: string): URL | null => {
  if (!input || typeof input !== "string") return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  // Accept URLs missing the protocol by prefixing https://
  const withProto = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    return new URL(withProto);
  } catch {
    return null;
  }
};

const hostMatches = (host: string, candidates: string[]): boolean =>
  candidates.some(c => host === c || host.endsWith(`.${c}`));

/**
 * Parse a creator channel URL into a normalized { platform, identifier, idType }.
 * Returns null for unsupported hosts, malformed URLs, or missing identifiers.
 * Pure: no DOM, no fetch (CLAUDE.md rule 3).
 */
export function parseChannelUrl(input: string): ParsedChannel | null {
  const url = safeUrl(input);
  if (!url) return null;
  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split("/").filter(Boolean);

  // Twitch: twitch.tv/<login>
  if (hostMatches(host, ["twitch.tv"])) {
    const login = segments[0];
    if (!login) return null;
    return { platform: "twitch" as PlatformKey, identifier: login, idType: "login" };
  }

  // YouTube: youtube.com / www.youtube.com / youtu.be
  if (hostMatches(host, ["youtube.com", "youtu.be"])) {
    if (segments.length === 0) return null;
    const first = segments[0];

    // /@handle
    if (first.startsWith("@")) {
      const handle = first.slice(1);
      if (!handle) return null;
      return { platform: "youtube" as PlatformKey, identifier: handle, idType: "handle" as YoutubeIdType };
    }
    // /channel/UC...
    if (first === "channel" && segments[1]) {
      return { platform: "youtube" as PlatformKey, identifier: segments[1], idType: "channelId" as YoutubeIdType };
    }
    // /user/name
    if (first === "user" && segments[1]) {
      return { platform: "youtube" as PlatformKey, identifier: segments[1], idType: "username" as YoutubeIdType };
    }
    // /c/name — best-effort as handle (YouTube redirects /c/ to the handle)
    if (first === "c" && segments[1]) {
      return { platform: "youtube" as PlatformKey, identifier: segments[1], idType: "handle" as YoutubeIdType };
    }
    return null;
  }

  return null;
}
```

- [ ] **Step 6: Write `src/lib/channel/normalize.ts`**

```ts
import type { ChannelStats, TwitchUserRaw, TwitchStreamRaw, YoutubeChannelRaw } from "./types";
import type { PlatformKey } from "../../data/channelConfig";

const toNumber = (n: number | string | undefined | null): number => {
  if (n == null) return 0;
  const v = typeof n === "string" ? Number.parseInt(n, 10) : n;
  return Number.isFinite(v) && v >= 0 ? v : 0;
};

const str = (s: unknown): string => (typeof s === "string" ? s : "");

/**
 * Normalize Twitch upstream payloads into ChannelStats.
 * `stream` is null/undefined when the channel is offline (empty /streams data array).
 * Pure: no DOM, no fetch (CLAUDE.md rule 3). Missing/NaN fields → neutral.
 */
export function normalizeTwitch(
  user: TwitchUserRaw,
  stream: TwitchStreamRaw | null | undefined,
  fetchedAt: number,
): ChannelStats {
  const isLive = !!stream && stream.viewer_count != null;
  return {
    platform: "twitch",
    id: str(user.login),
    displayName: str(user.display_name) || str(user.login),
    thumbnailUrl: str(user.profile_image_url),
    broadcasterType: str(user.broadcaster_type),
    lifetimeViews: toNumber(user.view_count),
    isLive,
    concurrentViewers: isLive ? toNumber(stream?.viewer_count) : undefined,
    fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : 0,
  };
}

type ThumbSet = { high?: { url?: string }; medium?: { url?: string }; default?: { url?: string } };

const pickThumb = (snippet: YoutubeChannelRaw["snippet"]): string => {
  const t = snippet?.thumbnails as ThumbSet | undefined;
  if (!t) return "";
  return str(t.high?.url) || str(t.medium?.url) || str(t.default?.url);
};

/**
 * Normalize a YouTube Data API v3 channel resource into ChannelStats.
 * Pure: no DOM, no fetch (CLAUDE.md rule 3). Missing/NaN fields → neutral.
 */
export function normalizeYouTube(raw: YoutubeChannelRaw, fetchedAt: number): ChannelStats {
  const stats = raw?.statistics;
  const hidden = !!stats?.hiddenSubscriberCount;
  return {
    platform: "youtube" as PlatformKey,
    id: str(raw?.id),
    displayName: str(raw?.snippet?.title),
    thumbnailUrl: pickThumb(raw?.snippet),
    subscribers: hidden ? undefined : toNumber(stats?.subscriberCount),
    hiddenSubscribers: hidden,
    lifetimeViews: toNumber(stats?.viewCount),
    videoCount: toNumber(stats?.videoCount) || undefined,
    fetchedAt: Number.isFinite(fetchedAt) ? fetchedAt : 0,
  };
}
```

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test`
Expected: PASS — all new `parseChannelUrl` / `normalizeTwitch` / `normalizeYouTube` tests pass; existing 115 tests still pass (suite 115 → 133).

- [ ] **Step 8: Run lint and build**

Run: `npm run lint`
Expected: prettier + eslint clean.

Run: `npm run build`
Expected: 47 pages, no errors (new pure modules are not imported by any page yet — tree-shaken; build unchanged).

- [ ] **Step 9: Commit**

```bash
git add src/data/channelConfig.ts src/lib/channel/ tests/channel.test.ts
git commit -m "feat(channel): add pure channel URL parser + normalizers + tests (D-1)"
```

---

### Task D-2: Cloudflare Pages Function + middleware + config + fixtures

**Files:**
- Create: `functions/api/channel.ts`
- Create: `functions/_middleware.ts`
- Create: `functions/tsconfig.json`
- Create: `functions/types.d.ts`
- Create: `.dev.vars.example`
- Create: `src/data/channelFixtures.ts`
- Modify: `package.json` (add `@cloudflare/workers-types` to devDependencies)
- Modify: `.gitignore` (add `.dev.vars`)

**Interfaces:**
- Consumes (from D-1): `parseChannelUrl`, `normalizeTwitch`, `normalizeYouTube`, `ChannelStats`, `ParsedChannel`, `channelConfig.ts` (endpoints, TTLs, KV keys).
- Produces: `GET /api/channel?url=<encoded>` → `{ ok: true, stats: ChannelStats } | { ok: false, error: string }`. Consumed by D-3 (island).

- [ ] **Step 1: Add `@cloudflare/workers-types` to devDependencies**

In `package.json`, add to `devDependencies`:

```json
    "@cloudflare/workers-types": "^4.20240925.0"
```

Then run: `npm install`
Expected: package installed; `package-lock.json` updated.

- [ ] **Step 2: Write `functions/types.d.ts`**

```ts
// Type declarations for Cloudflare Pages Functions runtime.
// Sourced from @cloudflare/workers-types; declared here so functions/ type-checks
// without polluting the Astro/tsconfig app context.
/// <reference types="@cloudflare/workers-types" />

export interface Env {
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
  YOUTUBE_API_KEY: string;
  USE_MOCK_UPSTREAM?: string;   // "true" → return fixtures instead of calling upstream
  CHANNEL_CACHE: KVNamespace;
  ORIGIN?: string;              // optional allowed origin override (defaults to request origin)
}
```

- [ ] **Step 3: Write `functions/tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "esnext",
    "module": "esnext",
    "moduleResolution": "bundler",
    "lib": ["esnext"],
    "types": ["./types.d.ts"],
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["./**/*.ts"]
}
```

- [ ] **Step 4: Write `src/data/channelFixtures.ts`**

```ts
// Mock upstream payloads for local dev + smoke testing the Function end-to-end
// without real API keys (USE_MOCK_UPSTREAM=true). Not shipped to the browser
// (only imported by functions/api/channel.ts, which runs server-side).
import type { TwitchUserRaw, TwitchStreamRaw, YoutubeChannelRaw } from "../lib/channel/types";

export const TWITCH_FIXTURES: Record<string, { user: TwitchUserRaw; stream: TwitchStreamRaw | null }> = {
  shroud: {
    user: { id: "1", login: "shroud", display_name: "shroud", broadcaster_type: "partner", view_count: 12345, profile_image_url: "https://mockcdn.example/shroud.png" },
    stream: { viewer_count: 4200 },
  },
  ninja: {
    user: { id: "2", login: "ninja", display_name: "Ninja", broadcaster_type: "partner", view_count: 99999, profile_image_url: "https://mockcdn.example/ninja.png" },
    stream: null,
  },
};

export const YOUTUBE_FIXTURES: Record<string, YoutubeChannelRaw> = {
  mrbeast: {
    id: "UC1",
    snippet: { title: "MrBeast", thumbnails: { medium: { url: "https://mockcdn.example/mrbeast.png" } } },
    statistics: { subscriberCount: "50000000", viewCount: "25000000000", videoCount: "800", hiddenSubscriberCount: false },
  },
};

export const MOCK_NOT_FOUND = "__mock_not_found__";
```

- [ ] **Step 5: Write `functions/_middleware.ts` (same-origin guard)**

```ts
import type { Env } from "./types";

const ALLOWED_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

// Same-origin guard: block cross-site calls to /api/* to prevent abuse.
// Browsers send Origin on cross-origin fetches; same-origin fetches may omit it.
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;
  const method = request.method.toUpperCase();

  if (!ALLOWED_METHODS.has(method)) {
    return json({ ok: false, error: "method-not-allowed" }, 405);
  }

  const origin = request.headers.get("Origin") || request.headers.get("Referer");
  if (origin) {
    const allowed = env.ORIGIN || new URL(request.url).origin;
    try {
      const o = new URL(origin);
      if (o.origin !== allowed) {
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

- [ ] **Step 6: Write `functions/api/channel.ts`**

```ts
import type { Env } from "../types";
import { parseChannelUrl } from "../../src/lib/channel/parseUrl";
import { normalizeTwitch, normalizeYouTube } from "../../src/lib/channel/normalize";
import type { ChannelStats } from "../../src/lib/channel/types";
import {
  CHANNEL_PLATFORMS, TWITCH_ENDPOINTS, YOUTUBE_ENDPOINTS, KV_KEYS,
} from "../../src/data/channelConfig";
import { TWITCH_FIXTURES, YOUTUBE_FIXTURES, MOCK_NOT_FOUND } from "../../src/data/channelFixtures";

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

const err = (error: string, status: number) => json({ ok: false, error }, status);

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawUrl = url.searchParams.get("url") ?? "";
  const parsed = parseChannelUrl(rawUrl);
  if (!parsed) return err("invalid-url", 400);

  const cacheKey = KV_KEYS.channel(parsed.platform, parsed.identifier);

  // 1. KV cache hit
  const cached = await env.CHANNEL_CACHE.get(cacheKey, "json");
  if (cached) return json({ ok: true, stats: cached as ChannelStats });

  const useMock = env.USE_MOCK_UPSTREAM === "true";
  const stats = useMock
    ? await mockFetch(parsed)
    : await liveFetch(parsed, env);

  if (!stats) return err("not-found", 404);

  // 3. Write KV cache (best-effort; don't fail the request on KV write error)
  try {
    await env.CHANNEL_CACHE.put(cacheKey, JSON.stringify(stats), {
      expirationTtl: CHANNEL_PLATFORMS[parsed.platform].kvTtlSeconds,
    });
  } catch {
    // KV write failure is non-fatal; return the result uncached.
  }

  return json({ ok: true, stats });
};

// --- Live upstream ------------------------------------------------------

async function liveFetch(parsed: ReturnType<typeof parseChannelUrl>, env: Env): Promise<ChannelStats | null> {
  if (!parsed) return null;
  if (parsed.platform === "twitch") return liveTwitch(parsed.identifier, env);
  return liveYouTube(parsed, env);
}

async function getTwitchToken(env: Env): Promise<string> {
  const cached = await env.CHANNEL_CACHE.get(KV_KEYS.twitchAppToken, "text");
  if (cached) return cached;
  const res = await fetch(TWITCH_ENDPOINTS.token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.TWITCH_CLIENT_ID,
      client_secret: env.TWITCH_CLIENT_SECRET,
      grant_type: "client_credentials",
    }),
  });
  if (!res.ok) throw new UpstreamError("twitch-token");
  const body = await res.json() as { access_token?: string };
  if (!body.access_token) throw new UpstreamError("twitch-token");
  // Cache ~50 days (token lives ~60 days); refresh on 401 at call sites.
  await env.CHANNEL_CACHE.put(KV_KEYS.twitchAppToken, body.access_token, { expirationTtl: 50 * 24 * 60 * 60 });
  return body.access_token;
}

async function liveTwitch(login: string, env: Env): Promise<ChannelStats | null> {
  if (!env.TWITCH_CLIENT_ID || !env.TWITCH_CLIENT_SECRET) throw new UpstreamError("not-configured");
  const token = await getTwitchToken(env);
  const headers = { Authorization: `Bearer ${token}`, "Client-Id": env.TWITCH_CLIENT_ID };

  const usersRes = await fetch(`${TWITCH_ENDPOINTS.users}?login=${encodeURIComponent(login)}`, { headers });
  if (usersRes.status === 401) {
    // token expired — purge and surface a retryable error
    await env.CHANNEL_CACHE.delete(KV_KEYS.twitchAppToken);
    throw new UpstreamError("twitch-token");
  }
  if (usersRes.status === 429) throw new UpstreamError("quota-exceeded");
  if (!usersRes.ok) throw new UpstreamError("upstream-error");
  const usersBody = await usersRes.json() as { data?: unknown[] };
  const user = (usersBody.data?.[0] as Record<string, unknown>) ?? null;
  if (!user) return null;

  const streamsRes = await fetch(`${TWITCH_ENDPOINTS.streams}?user_login=${encodeURIComponent(login)}`, { headers });
  const streamsBody = await streamsRes.json() as { data?: unknown[] };
  const stream = (streamsBody.data?.[0] as Record<string, unknown>) ?? null;

  return normalizeTwitch(user as never, stream as never, Date.now());
}

async function liveYouTube(parsed: NonNullable<ReturnType<typeof parseChannelUrl>>, env: Env): Promise<ChannelStats | null> {
  if (!env.YOUTUBE_API_KEY) throw new UpstreamError("not-configured");
  const filter =
    parsed.idType === "handle" ? `forHandle=${encodeURIComponent("@" + parsed.identifier)}` :
    parsed.idType === "channelId" ? `id=${encodeURIComponent(parsed.identifier)}` :
    `forUsername=${encodeURIComponent(parsed.identifier)}`;
  const u = `${YOUTUBE_ENDPOINTS.channels}?part=snippet,statistics&${filter}&key=${encodeURIComponent(env.YOUTUBE_API_KEY)}`;
  const res = await fetch(u);
  if (res.status === 429) throw new UpstreamError("quota-exceeded");
  if (res.status === 403) throw new UpstreamError("quota-exceeded");
  if (!res.ok) throw new UpstreamError("upstream-error");
  const body = await res.json() as { items?: unknown[] };
  const item = (body.items?.[0] as Record<string, unknown>) ?? null;
  if (!item) return null;
  return normalizeYouTube(item as never, Date.now());
}

// --- Mock upstream (dev / smoke) ---------------------------------------

async function mockFetch(parsed: NonNullable<ReturnType<typeof parseChannelUrl>>): Promise<ChannelStats | null> {
  if (parsed.platform === "twitch") {
    const fx = TWITCH_FIXTURES[parsed.identifier.toLowerCase()];
    if (!fx) return null;
    return normalizeTwitch(fx.user, fx.stream, Date.now());
  }
  const fx = YOUTUBE_FIXTURES[parsed.identifier.toLowerCase()];
  if (!fx) return null;
  return normalizeYouTube(fx, Date.now());
}

// --- Error type ---------------------------------------------------------

class UpstreamError extends Error {
  code: string;
  constructor(code: string) { super(code); this.code = code; }
}

// Map thrown UpstreamError codes → HTTP responses (wrap the handler).
export const onRequestGetWrapped: PagesFunction<Env> = async (context) => {
  try {
    return await onRequestGet(context);
  } catch (e) {
    const code = e instanceof UpstreamError ? e.code : "upstream-error";
    const status = code === "not-configured" ? 503 : code === "quota-exceeded" ? 429 : 502;
    return err(code, status);
  }
};
```

> **Note:** `onRequestGet` is the entry Pages invokes. The error-mapping wrapper above is a reference pattern; the implementer MUST ensure the exported `onRequestGet` itself wraps the body in the try/catch so thrown `UpstreamError`s become the correct HTTP responses. (See Step 7 self-check.)

- [ ] **Step 7: Refactor so `onRequestGet` is the single wrapped entry**

Replace the `onRequestGet` and `onRequestGetWrapped` definitions at the end of `functions/api/channel.ts` with a single wrapped export:

```ts
export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    return await handle(context);
  } catch (e) {
    const code = e instanceof UpstreamError ? e.code : "upstream-error";
    const status = code === "not-configured" ? 503 : code === "quota-exceeded" ? 429 : 502;
    return err(code, status);
  }
};

async function handle(context: Context<Env>): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const rawUrl = url.searchParams.get("url") ?? "";
  const parsed = parseChannelUrl(rawUrl);
  if (!parsed) return err("invalid-url", 400);

  const cacheKey = KV_KEYS.channel(parsed.platform, parsed.identifier);
  const cached = await env.CHANNEL_CACHE.get(cacheKey, "json");
  if (cached) return json({ ok: true, stats: cached as ChannelStats });

  const useMock = env.USE_MOCK_UPSTREAM === "true";
  const stats = useMock ? await mockFetch(parsed) : await liveFetch(parsed, env);
  if (!stats) return err("not-found", 404);

  try {
    await env.CHANNEL_CACHE.put(cacheKey, JSON.stringify(stats), {
      expirationTtl: CHANNEL_PLATFORMS[parsed.platform].kvTtlSeconds,
    });
  } catch {
    // non-fatal
  }
  return json({ ok: true, stats });
}
```

And delete the earlier standalone `onRequestGet`/`onRequestGetWrapped`/the duplicate logic. The final file has exactly one `onRequestGet` export that wraps `handle`. `liveFetch`, `liveTwitch`, `liveYouTube`, `mockFetch`, `getTwitchToken`, `UpstreamError`, `json`, `err` remain as helpers.

- [ ] **Step 8: Write `.dev.vars.example`**

```bash
# Copy to .dev.vars and fill with real values for local `wrangler pages dev`.
# .dev.vars is gitignored — never commit real secrets.
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
YOUTUBE_API_KEY=your_youtube_api_key
USE_MOCK_UPSTREAM=true
# CHANNEL_CACHE is bound via --kv=CHANNEL_CACHE on the wrangler command line.
```

- [ ] **Step 9: Add `.dev.vars` to `.gitignore`**

Append to `.gitignore`:

```
# Cloudflare Pages local dev secrets
.dev.vars
```

- [ ] **Step 10: Run tests, lint, build**

Run: `npm test`
Expected: PASS — 133/133 (D-1 tests + existing 115; no new tests in D-2 — the Function is I/O glue, verified via wrangler mock smoke in D-4).

Run: `npm run lint`
Expected: clean. (Note: `functions/` may need an eslint ignore or the prettier check covers it — if eslint flags Workers globals, add `functions/` to the eslint config's `ignores` or a `/* eslint-env serviceworker */` where needed. Prefer adding `functions` to eslint ignores if it errors, since `functions/` runs in the Workers runtime, not the Astro app context.)

Run: `npm run build`
Expected: 47 pages, no errors. The `functions/` dir does not affect the Astro static build.

- [ ] **Step 11: Commit**

```bash
git add functions/ .dev.vars.example .gitignore src/data/channelFixtures.ts package.json package-lock.json
git commit -m "feat(channel): add /api/channel Pages Function + middleware + mock fixtures (D-2)"
```

---

### Task D-3: ChannelImport island + wire into three tool pages

**Files:**
- Create: `src/components/ChannelImport.astro`
- Modify: `src/pages/youtube-money-calculator.astro` (additive: import + element)
- Modify: `src/pages/twitch-ad-revenue-calculator.astro` (additive: import + element)
- Modify: `src/pages/twitch-revenue-calculator.astro` (additive: import + element)

**Interfaces:**
- Consumes (from D-1/D-2): `GET /api/channel` JSON shape `{ ok, stats } | { ok:false, error }`; `ChannelStats` type (for the island's rendering logic — re-import the type, no runtime dep on the pure module).
- Produces: a progressive-enhancement UI. Pre-fills the Twitch islands' "avg viewers" RangeSlider when `stats.isLive` by setting the slider's `.number-input` value and dispatching a bubbling `input` event (triggers the existing RangeSlider `sync` + the calculator's `render` listener). No calculator island is modified.

- [ ] **Step 1: Write `src/components/ChannelImport.astro`**

```astro
---
import type { PlatformKey } from "../data/channelConfig";
interface Props { platform: PlatformKey; }
const { platform } = Astro.props;
const label = platform === "twitch" ? "Twitch channel URL" : "YouTube channel URL";
const placeholder = platform === "twitch" ? "twitch.tv/yourchannel" : "youtube.com/@yourchannel";
---
<form class="channel-import" data-channel-import data-platform={platform}>
  <div class="import-row">
    <label for={`channel-url-${platform}`}>Import your {platform === "twitch" ? "Twitch" : "YouTube"} channel</label>
    <div class="import-input">
      <input
        id={`channel-url-${platform}`}
        type="url"
        inputmode="url"
        autocomplete="off"
        placeholder={placeholder}
        data-channel-url
      />
      <button type="submit" class="import-btn" data-import-btn>Import</button>
    </div>
  </div>
  <p class="import-hint" data-import-hint hidden></p>
  <div class="channel-card" data-channel-card hidden></div>
</form>
<script>
  type PlatformKey = "twitch" | "youtube";
  interface ChannelStats {
    platform: PlatformKey; id: string; displayName: string; thumbnailUrl: string;
    broadcasterType?: string; subscribers?: number; hiddenSubscribers?: boolean;
    lifetimeViews: number; videoCount?: number; isLive?: boolean; concurrentViewers?: number;
    fetchedAt: number;
  }

  const fmt = (n: number | undefined): string => {
    if (n == null) return "—";
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
    return String(n);
  };

  function initChannelImport(root: HTMLElement) {
    const platform = (root.dataset.platform ?? "") as PlatformKey;
    const input = root.querySelector<HTMLInputElement>("[data-channel-url]");
    const btn = root.querySelector<HTMLButtonElement>("[data-import-btn]");
    const hint = root.querySelector<HTMLElement>("[data-import-hint]");
    const card = root.querySelector<HTMLElement>("[data-channel-card]");
    if (!input || !btn || !hint || !card) return;

    const setHint = (msg: string, isError = false) => {
      hint.textContent = msg;
      hint.hidden = !msg;
      hint.dataset.error = isError ? "true" : "false";
    };

    const renderCard = (s: ChannelStats) => {
      const rows: string[] = [];
      if (s.platform === "twitch") {
        rows.push(`<span class="stat"><em>Broadcaster</em><b>${s.broadcasterType || "standard"}</b></span>`);
        rows.push(`<span class="stat"><em>Lifetime views</em><b>${fmt(s.lifetimeViews)}</b></span>`);
        if (s.isLive) rows.push(`<span class="stat live"><em>Live now</em><b>${fmt(s.concurrentViewers)} viewers</b></span>`);
        else rows.push(`<span class="stat"><em>Status</em><b>Offline</b></span>`);
      } else {
        rows.push(`<span class="stat"><em>Subscribers</em><b>${s.hiddenSubscribers ? "Hidden" : fmt(s.subscribers)}</b></span>`);
        rows.push(`<span class="stat"><em>Lifetime views</em><b>${fmt(s.lifetimeViews)}</b></span>`);
        if (s.videoCount != null) rows.push(`<span class="stat"><em>Videos</em><b>${fmt(s.videoCount)}</b></span>`);
      }
      card.innerHTML = `
        <img src="${s.thumbnailUrl}" alt="" width="48" height="48" loading="lazy" decoding="async" />
        <div class="card-body">
          <strong>${s.displayName || s.id}</strong>
          <div class="card-stats">${rows.join("")}</div>
        </div>`;
      card.hidden = false;
    };

    // Pre-fill the calculator's "avg viewers" RangeSlider when Twitch & live.
    const prefillViewers = (s: ChannelStats) => {
      if (s.platform !== "twitch" || !s.isLive || s.concurrentViewers == null) return;
      const slider = document.querySelector<HTMLElement>('[data-range-slider="viewers"]');
      const num = slider?.querySelector<HTMLInputElement>(".number-input");
      if (!slider || !num) return;
      const max = Number(slider.dataset.max ?? 5000);
      const value = Math.min(max, Math.max(0, s.concurrentViewers));
      num.value = String(value);
      num.dispatchEvent(new Event("input", { bubbles: true }));
    };

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      const url = input.value.trim();
      if (!url) { setHint("Paste a channel URL first.", true); return; }
      setHint("Looking up channel…");
      card.hidden = true;
      try {
        const res = await fetch(`/api/channel?url=${encodeURIComponent(url)}`);
        const body = await res.json() as { ok: boolean; stats?: ChannelStats; error?: string };
        if (!res.ok || !body.ok || !body.stats) {
          const map: Record<string, string> = {
            "invalid-url": "Couldn't read that channel URL.",
            "unsupported-platform": "Supported: Twitch and YouTube.",
            "not-found": "No channel found at that URL.",
            "quota-exceeded": "We've hit our lookup limit — try again shortly.",
            "upstream-error": "Couldn't reach the platform. Try again.",
            "not-configured": "Channel import isn't configured.",
            "forbidden-origin": "Channel import isn't available here.",
          };
          setHint(map[body.error ?? ""] ?? "Couldn't import that channel.", true);
          return;
        }
        setHint("");
        renderCard(body.stats);
        prefillViewers(body.stats);
      } catch {
        setHint("Network error — try again.", true);
      }
    });
  }

  document.querySelectorAll<HTMLElement>("[data-channel-import]").forEach(initChannelImport);
</script>
<style>
  .channel-import { display: flex; flex-direction: column; gap: var(--spacing-3); padding: var(--spacing-4); border: 1px solid var(--color-border-soft); border-radius: var(--radius-md); background: var(--color-surface-warm); margin-bottom: var(--spacing-5); }
  .import-row { display: grid; gap: var(--spacing-2); }
  .import-row label { color: var(--color-fg-2); font-size: var(--text-sm); font-weight: 700; }
  .import-input { display: flex; gap: var(--spacing-2); }
  .import-input input { flex: 1; min-height: 40px; padding: 0 var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); color: var(--color-fg); font: inherit; }
  .import-input input:focus { outline: none; border-color: var(--color-accent); box-shadow: var(--shadow-focus-ring); }
  .import-btn { padding: 0 var(--spacing-4); min-height: 40px; border: 1px solid var(--color-accent); border-radius: var(--radius-sm); background: var(--color-accent); color: var(--color-accent-on); font: 700 var(--text-sm)/1 var(--font-body); cursor: pointer; }
  .import-btn:hover { filter: brightness(1.05); }
  .import-hint { font-size: var(--text-sm); color: var(--color-muted); }
  .import-hint[data-error="true"] { color: var(--color-fg); }
  .channel-card { display: flex; gap: var(--spacing-3); align-items: center; padding: var(--spacing-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); background: var(--color-bg); }
  .channel-card img { width: 48px; height: 48px; border-radius: 50%; border: 1px solid var(--color-border); }
  .card-body { display: flex; flex-direction: column; gap: var(--spacing-1); }
  .card-body strong { font-size: var(--text-sm); color: var(--color-fg); }
  .card-stats { display: flex; flex-wrap: wrap; gap: var(--spacing-3); }
  .stat { display: flex; flex-direction: column; }
  .stat em { font-size: var(--text-xs); font-style: normal; color: var(--color-muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .stat b { font-size: var(--text-sm); color: var(--color-fg); }
  .stat.live b { color: var(--color-accent); }
  @media (max-width: 560px) { .import-input { flex-direction: column; } }
</style>
```

- [ ] **Step 2: Wire into `src/pages/youtube-money-calculator.astro`**

Change the frontmatter import block from:

```astro
import { youtubeFaqs, cpmModifierFaqs } from '../data/faqs';
```

to:

```astro
import { youtubeFaqs, cpmModifierFaqs } from '../data/faqs';
import ChannelImport from '../components/ChannelImport.astro';
```

And change the `ToolLayout` body from:

```astro
  <YoutubeCalculator />
```

to:

```astro
  <ChannelImport platform="youtube" />
  <YoutubeCalculator />
```

- [ ] **Step 3: Wire into `src/pages/twitch-ad-revenue-calculator.astro`**

Change the frontmatter import block from:

```astro
import { adRevenueFaqs, cpmModifierFaqs } from '../data/faqs';
```

to:

```astro
import { adRevenueFaqs, cpmModifierFaqs } from '../data/faqs';
import ChannelImport from '../components/ChannelImport.astro';
```

And change the `ToolLayout` body from:

```astro
  <AdRevenueCalculator />
```

to:

```astro
  <ChannelImport platform="twitch" />
  <AdRevenueCalculator />
```

- [ ] **Step 4: Wire into `src/pages/twitch-revenue-calculator.astro`**

Add the import after the existing component import in the frontmatter:

```astro
import ChannelImport from '../components/ChannelImport.astro';
```

And in the `ToolLayout` body, add `<ChannelImport platform="twitch" />` immediately before the existing `<RevenueCalculator />` element.

(Read the file first to confirm the exact existing import line and element name, then make the two additive edits. Do not modify any other line.)

- [ ] **Step 5: Run tests, lint, build**

Run: `npm test`
Expected: PASS — 133/133.

Run: `npm run lint`
Expected: clean.

Run: `npm run build`
Expected: 47 pages, no errors. The three adopting pages now include the ChannelImport markup; their H1/H2/canonical/JSON-LD are unchanged.

- [ ] **Step 6: Commit**

```bash
git add src/components/ChannelImport.astro src/pages/youtube-money-calculator.astro src/pages/twitch-ad-revenue-calculator.astro src/pages/twitch-revenue-calculator.astro
git commit -m "feat(channel): add ChannelImport island to YouTube + Twitch Ad + Twitch Revenue pages (D-3)"
```

---

### Task D-4: Final verify + regression-seam check + whole-branch opus review

**Files:**
- No code changes (verification + review only), unless the opus review surfaces must-fix findings.

**Interfaces:**
- Consumes: the full D branch (`ab384dc..HEAD`).

- [ ] **Step 1: Run the full verification suite**

Run: `npm test`
Expected: 133/133 pass.

Run: `npm run lint`
Expected: prettier + eslint clean.

Run: `npm run build`
Expected: 47 pages, no errors. (`functions/` does not affect the Astro static build.)

- [ ] **Step 2: Regression-seam diff check vs `ab384dc`**

Run: `git diff --stat ab384dc..HEAD`
Expected: only the D files (new `functions/`, `functions/types.d.ts`, `.dev.vars.example`, `src/data/channelConfig.ts`, `src/data/channelFixtures.ts`, `src/lib/channel/*`, `src/components/ChannelImport.astro`, `tests/channel.test.ts`, `package.json`, `package-lock.json`, `.gitignore`) + the three adopting pages (each a 2-line additive change) appear. No existing pure calculator, no existing config, no `src/lib/site.ts`, no prog-SEO route, no other page is touched.

Run: `git diff ab384dc..HEAD -- src/lib/calculators/ src/lib/site.ts src/data/adConfig.ts src/data/youtubeConfig.ts src/data/cpmModifiers.ts src/data/taxConfig.ts src/data/faqs.ts`
Expected: empty (zero diff in all existing pure calculators, site registry, existing configs, and faqs).

- [ ] **Step 3: Smoke-test the Function in mock mode**

Run (from repo root):

```bash
npx wrangler pages dev dist --kv=CHANNEL_CACHE --binding USE_MOCK_UPSTREAM=true &
sleep 5
curl -s "http://localhost:8787/api/channel?url=twitch.tv/shroud" | head -c 400
curl -s "http://localhost:8787/api/channel?url=youtube.com/@MrBeast" | head -c 400
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8787/api/channel?url=twitter.com/x"
kill %1
```

Expected: the first two return `{"ok":true,"stats":{...}}` with the fixture data (shroud live with 4200 viewers; MrBeast with 50M subs). The third returns `400` (unsupported platform → invalid-url). If `wrangler` is not installed or the dev server fails to start, record that the mock smoke could not run in this environment and rely on the pure-logic tests + code review for D-2 verification (this is the documented limitation in the spec).

- [ ] **Step 4: Dispatch the whole-branch opus reviewer**

Run: `bash /home/harish/.claude/plugins/cache/claude-plugins-official/superpowers/6.1.1/skills/subagent-driven-development/scripts/review-package ab384dc HEAD`

Dispatch the opus reviewer with the printed review-package path, the spec path, and the Global Constraints. The reviewer checks: secret hygiene (no secret in client bundle / dist / src), SSRF safety (only fixed upstream hosts called with parsed identifiers), same-origin guard correctness, the regression seam, the neutral/error UX, CLAUDE.md rule compliance (all 8 + the bounded relaxation), and cross-task consistency. Record any findings.

- [ ] **Step 5: Address must-fix findings (if any)**

If the opus review returns Critical/Important findings, dispatch ONE fix subagent with the complete findings list. Re-run the covering tests. Record deferred Minors in the ledger.

- [ ] **Step 6: Update the ledger + memory**

Append the D completion line to `.superpowers/sdd/progress-d.md` (create it), and update the roadmap memory (`project-sub-roadmap.md`) to mark D complete and point to E (or a D2 live-rate-lookup follow-up) as next.

- [ ] **Step 7: Report READY TO MERGE**

Report the final status to the user: commits, test/build/page counts, regression-seam result, opus verdict, deferred Minors. No PR (stacked).