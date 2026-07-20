# Sub-project D — Channel Import via Cloudflare Pages Functions (Design)

**Date:** 2026-07-20
**Branch:** `build/subproject-c` (stacked on C2 tip `ab384dc`)
**Predecessors:** A (prog-SEO), B1 (Kick + Twitch Ad), B2 (Patreon + Spotify), C1 (Net Income/Tax), C2 (CPM Modifiers)
**Status:** Design — presented 2026-07-20 (optimal-options execution; user authorized no clarifying questions)

## Purpose

Let a creator paste their Twitch or YouTube channel URL into a calculator and see their **public** channel stats pulled server-side, with platform API keys held in Cloudflare secrets (never shipped to the browser). This is the **bounded relaxation** of CLAUDE.md Rule 1 (zero backend): a single Cloudflare Pages Function (`/api/channel`) runs on the edge to broker public platform APIs; every page remains static HTML and every calculator remains fully functional client-side without the Function.

This is a **fresh brainstorm→spec→plan→SDD cycle**. No prior sub-project's design carries over.

## Scope decision (optimal, YAGNI)

**D = Channel import (Twitch + YouTube, public stats, no OAuth, KV-cached).**

- Twitch and YouTube only. TikTok is excluded: it has no reliable public stats API for follower/view counts (the Display API requires app approval and partner status).
- **No OAuth.** Public platform APIs only (Twitch app access token via client credentials; YouTube API key). OAuth user-login flows (which would be required for Twitch follower/sub counts, Twitch sub revenue pre-fill, or YouTube monthly views via the Analytics API) are explicitly out of scope — they would balloon the surface (login flows, token storage, refresh) far past a bounded relaxation.
- **"Live rate lookup" is deferred** to a follow-up cycle. It is a separate concern (FX rate refresh / rate validation), lower value than channel import, and would jam two unrelated server-side features into one spec. The established rhythm (B1/B2, C1/C2) is one focused, testable cycle. This scope cut is surfaced at the spec-review gate.

## What the platform APIs give us (grounded, 2025-07)

### Twitch (Helix, app access token)
- Auth: `POST https://id.twitch.tv/oauth2/token` with `client_id` + `client_secret` + `grant_type=client_credentials` → app access token (~60-day life, non-refreshable; cache in KV ~50 days, refresh on 401). Every Helix request needs both `Authorization: Bearer <token>` and `Client-Id: <id>` headers.
- `GET https://api.twitch.tv/helix/users?login=<login>` → `id`, `login`, `display_name`, `broadcaster_type` (`affiliate` | `partner` | `""`), `view_count` (cumulative lifetime views), `description`, `profile_image_url`, `created_at`.
- `GET https://api.twitch.tv/helix/streams?user_id=<id>` → `viewer_count` + `started_at` if live; empty `data` array if offline.
- **Follower count is private** (post-2023): `GET /channels/followers` requires a *user* OAuth token with `moderator:read:followers`. Not available with the app access token. Sub counts are likewise private. → Twitch import surfaces **lifetime views, broadcaster type, live status + concurrent viewers** — not followers or subs.

### YouTube (Data API v3, API key)
- `GET https://www.googleapis.com/youtube/v3/channels?part=snippet,statistics&forHandle=@<handle>&key=<key>` (or `id=<channelId>` or `forUsername=<name>` — exactly one filter).
- Returns `subscriberCount` (rounded down to 3 significant figures per YouTube's 2025 policy), `viewCount` (lifetime; includes Shorts plays since 2025-03-31), `videoCount`, `hiddenSubscriberCount`, and `snippet.title` + `snippet.thumbnails`.
- API key is sufficient (no OAuth) for public channel data. 1 quota unit per call; default 10,000 units/day.

## Architecture

```
functions/
  api/channel.ts          Pages Function  GET /api/channel?url=<encoded>  (I/O glue)
  _middleware.ts          same-origin guard (Origin/Referer check)
  tsconfig.json           Workers runtime tsconfig (types from @cloudflare/workers-types)
functions/types.d.ts      KVNamespace / PagesFunction type declarations
.dev.vars.example         gitignored secret template (committed as example only)

src/lib/channel/          (pure, Vitest-tested — CLAUDE.md rule 3)
  types.ts                ChannelStats interface, PlatformKey union
  parseUrl.ts             parseChannelUrl(url): { platform, identifier, idType } | null  (idType: twitch "login" | youtube "handle"|"channelId"|"username")
  normalize.ts            normalizeTwitch(raw): ChannelStats, normalizeYouTube(raw): ChannelStats
src/data/channelConfig.ts (rule 2: supported platforms, URL patterns, upstream endpoints, KV TTLs)
src/data/channelFixtures.ts (mock upstream payloads → end-to-end Function smoke test without real keys)
src/components/ChannelImport.astro  progressive-enhancement island (input + button + read-only result card)
tests/channel.test.ts     pure fn tests (parseUrl + normalize)
```

**Untouched (regression seam):** all existing calculators, all pure calculators in `src/lib/calculators/`, all existing configs in `src/data/` (other than the new additive files), `src/lib/site.ts` (TOOLS unchanged — no new tool page), all prog-SEO routes, all pages' existing structure. The three tool pages that adopt the island (YouTube Money, Twitch Ad Revenue, Twitch Revenue) gain **only** an additive `<ChannelImport platform="..." />` element; their H1/H2/canonical/JSON-LD are unchanged.

## Data flow

1. User pastes a channel URL into the `ChannelImport` island and clicks **Import**.
2. Island: `fetch('/api/channel?url=' + encodeURIComponent(url))` (same-origin).
3. `functions/api/channel.ts`:
   1. Read `url` query param. Pure `parseChannelUrl(url)` → `{ platform, identifier, idType }`; else HTTP 400 `{ ok:false, error:"invalid-url" }`.
   2. KV lookup `channel:<platform>:<identifier>`. If fresh hit → return cached `ChannelStats` JSON.
   3. Miss → call upstream:
      - Twitch: ensure app access token (KV `twitch:app_token`, refresh on 401) → `GET /users?login=<id>` → `GET /streams?user_id=<id>`.
      - YouTube: `GET /channels?part=snippet,statistics&key=<key>` with the filter chosen by `idType`: `handle` → `forHandle=@<identifier>`, `channelId` → `id=<identifier>`, `username` → `forUsername=<identifier>`.
   4. Pure `normalizeTwitch(raw)` / `normalizeYouTube(raw)` → `ChannelStats`.
   5. Write KV `channel:<platform>:<identifier>` with TTL (Twitch 10 min, YouTube 1 hour — from `channelConfig.ts`).
   6. Return `{ ok:true, stats: ChannelStats }` (or `{ ok:false, error:<code> }`).
4. Island renders a read-only channel card (name, thumbnail, the surfaced stats) and pre-fills **only** inputs with a direct public-data mapping: Twitch `concurrentViewers` → the calculator's "avg viewers" input, and only when `isLive`. YouTube surfaces subscribers + lifetime views as context only (monthly views — the input the YouTube calc needs — is not public, so no pre-fill; no fabricated estimates). Calculator remains fully functional without import.

## ChannelStats shape

```ts
type PlatformKey = "twitch" | "youtube";
interface ChannelStats {
  platform: PlatformKey;
  id: string;            // twitch login or youtube channelId
  displayName: string;
  thumbnailUrl: string;
  broadcasterType?: string;     // twitch only: affiliate | partner | ""
  subscribers?: number;          // youtube only (undefined if hidden)
  hiddenSubscribers?: boolean;  // youtube only
  lifetimeViews: number;
  videoCount?: number;           // youtube only
  isLive?: boolean;              // twitch only
  concurrentViewers?: number;   // twitch only, when isLive
  fetchedAt: number;             // epoch ms
}
```

## Secrets & security (bounded relaxation of Rule 1)

- Secrets are **Cloudflare Pages environment variables** (server-side only), accessed in the Function via `context.env`:
  - `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`, `YOUTUBE_API_KEY`
  - KV namespace binding `CHANNEL_CACHE`
- **Never shipped to the browser.** The island only calls same-origin `/api/channel`; the Astro static build never reads the secrets; no secret appears in `dist/`.
- **Same-origin guard** in `functions/_middleware.ts`: reject requests whose `Origin`/`Referer` is not the site origin. Blocks cross-site abuse of the endpoint.
- **SSRF-safe by construction:** the Function only ever calls the fixed upstream API hosts (`api.twitch.tv`, `id.twitch.tv`, `googleapis.com`) with the *parsed identifier* from `parseChannelUrl` — never the raw user URL as a fetch target.
- **Quota bounding:** KV caching (Twitch 10 min, YouTube 1 hr) caps upstream calls per channel; the Twitch app token is KV-cached (~50 days) to avoid re-tokenizing. Per-IP rate-limiting is **deferred** (YAGNI for v1; KV cache + origin guard + upstream quotas suffice — noted as a deferred item).
- **Mock mode:** `USE_MOCK_UPSTREAM=true` makes the Function return `channelFixtures` data instead of calling upstream, so the full Function path is smoke-testable in `wrangler pages dev` without real API keys.

## Error handling

| Condition | HTTP | `{ ok:false, error }` code | Island UX |
|---|---|---|---|
| Missing/invalid URL | 400 | `invalid-url` | "Couldn't read that channel URL." |
| Unsupported platform | 400 | `unsupported-platform` | "Supported: Twitch and YouTube." |
| Channel not found | 404 | `not-found` | "No channel found at that URL." |
| Upstream quota exhausted | 429 | `quota-exceeded` | "We've hit our lookup limit — try again shortly." |
| Upstream error / timeout | 502 | `upstream-error` | "Couldn't reach the platform. Try again." |
| Missing server secrets (dev misconfig) | 503 | `not-configured` | "Channel import isn't configured." |

The island never surfaces internal details; it maps `error` codes to friendly copy. The Function logs (server-side only) are the debugging surface.

## CLAUDE.md rule compliance

1. **Zero backend (bounded relaxation)** — only `functions/` runs server-side; pages stay static; no DB/auth-via-backend (the app access token is server-to-server, not user auth); no SSR/edge rendering of pages. ✅
2. **Rates in config** — platforms, URL patterns, upstream endpoints, KV TTLs in `src/data/channelConfig.ts`. ✅
3. **Pure calculators** — `src/lib/channel/` is pure (no DOM/Astro/fetch), guarded (null/missing fields → neutral), Vitest-tested; Functions are thin I/O glue. ✅
4. **Single accent** — `ChannelImport` uses existing slate/purple tokens; no new colors. ✅
5. **No render-blocking 3rd-party** — none added; the island's fetch is user-initiated. ✅
6. **Performance** — island is small, below-the-fold, lazy; no new client weight; Lighthouse unaffected. ✅
7. **Structural SEO** — no new pages; H1/H2/canonical/JSON-LD unchanged on adopting pages; prog-SEO routes untouched (static, no island) → prog-SEO output unaffected. ✅
8. **Affiliate IDs config** — n/a (no affiliate changes). ✅

## SDD task split (for the implementation plan)

Mirrors B1/B2/C1/C2 vertical-slice shape. Cumulative on `build/subproject-c` off `ab384dc`, per-task commits, same-branch stacking (no PR).

- **D-1:** `src/data/channelConfig.ts` + `src/lib/channel/` (types, parseUrl, normalize) + `tests/channel.test.ts` (sonnet)
- **D-2:** `functions/api/channel.ts` + `functions/_middleware.ts` + `functions/tsconfig.json` + `functions/types.d.ts` + `.dev.vars.example` + `src/data/channelFixtures.ts` + `@cloudflare/workers-types` devDep (sonnet — integration + secret handling)
- **D-3:** `src/components/ChannelImport.astro` island + wire into YouTube Money, Twitch Ad Revenue, Twitch Revenue pages (haiku — UI wiring, reference existing islands)
- **D-4:** final verify + lint + `wrangler pages dev` mock smoke + regression-seam diff vs `ab384dc` + whole-branch opus review (sonnet)

## Testing

- **Pure logic** (`tests/channel.test.ts`, Vitest):
  - `parseChannelUrl`: valid Twitch (`twitch.tv/name`) → `{platform:"twitch", idType:"login"}`; valid YouTube handle (`youtube.com/@handle`) → `idType:"handle"`, channel ID (`/channel/UC...`) → `idType:"channelId"`, username (`/user/name`) → `idType:"username"`; `/c/name` best-effort → `idType:"handle"` (strip `@`); unsupported hosts → `null`, malformed → `null`, non-URL → `null`.
  - `normalizeTwitch`: live vs offline (empty `data`), missing fields → neutral, `view_count` mapping, `broadcaster_type` pass-through.
  - `normalizeYouTube`: `hiddenSubscriberCount` true → `subscribers` undefined, missing `statistics` → neutral, `viewCount`/`videoCount` parsing, thumbnail selection.
- **Functions (manual):** `npx wrangler pages dev dist --kv=CHANNEL_CACHE` with `.dev.vars` (`USE_MOCK_UPSTREAM=true`) → verify `/api/channel?url=...` returns fixture JSON, KV caching, error codes for invalid/unsupported/not-found. Real upstream verified post-deploy (no real keys in the build environment).
- **Regression seam:** existing pure calculators, configs, `site.ts`, prog-SEO routes, all pages' structure unchanged. Verified by `git diff --stat ab384dc..HEAD`.

## Open / deferred

- **Live rate lookup** (FX refresh / rate validation) — deferred to a follow-up cycle; separate concern, lower value.
- **Per-IP rate limiting** on `/api/channel` — deferred (YAGNI v1; KV cache + origin guard + upstream quotas bound abuse). Revisit if quota incidents occur.
- **TikTok channel import** — excluded (no reliable public stats API).
- **OAuth for private stats** (Twitch followers/subs, YouTube monthly views) — explicitly out of scope; would un-bound the relaxation.
- **Real-upstream verification** in this environment — not possible (no real API keys); the mock-mode path + pure-logic tests are the verification surface; real upstream is a post-deploy smoke.