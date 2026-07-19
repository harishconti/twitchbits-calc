# CLAUDE.md — Twitch Bits Calculator Hub

## What this is

A zero-backend Creator Calculator Hub (Twitch Bits→USD, Twitch Revenue, TikTok Coins→USD, YouTube Money) + blog, on Astro 6 static + Tailwind 4 + vanilla JS, deployed to Cloudflare Pages.

## Stack & key files

- Astro 6 static output. Tailwind 4 via `@tailwindcss/vite` (no JS config; tokens in `src/styles/global.css` `@theme`).
- Vanilla-JS islands in `src/scripts/`; pure calculator math in `src/lib/calculators/`.
- Config (rates, splits, affiliate links) lives in `src/data/` — the single editable source of truth.

## Non-negotiable rules

1. **Zero backend.** No DB, no auth, no API keys, no SSR/edge. All math client-side.
2. **Rates never hardcoded in components.** Every calculator reads constants from `src/data/*.ts`. A rate change is a one-line data edit that propagates to all programmatic-SEO variants at build.
3. **`src/lib/calculators/` is pure.** No DOM, no Astro imports, no side effects. Input guards: NaN/negative/Infinity → 0. All calculator functions have Vitest tests.
4. **Single accent color.** Twitch purple `#9146ff` only on focus rings, primary CTAs, active tab, result accent. Everything else slate. No neon gradients.
5. **No render-blocking 3rd-party scripts.** Analytics is Cloudflare Web Analytics (cookieless, deferred). No GA4/Hotjar/FB pixel.
6. **Performance bar:** Lighthouse ≥ 95, LCP < 1.2s, TBT < 50ms.
7. **SEO is structural:** one page = one keyword, exact/near-exact H1, one H2 per section, canonical bare-URL (no query params), WebApplication + FAQPage + Breadcrumb JSON-LD on every tool page. FAQ content from `src/data/faqs.ts` feeds both visible FAQ and schema.
8. **Affiliate IDs are config, not env vars** (`src/data/affiliateLinks.ts`). The disclosure page auto-renders from the same source.

## Commands

```bash
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview
npm test           # vitest (pure functions)
npm run lint       # prettier + eslint
```

## Branch

Work on `build/twitch-bits-hub` (default branch is `develop`). Don't push a red build.

## Adding a new calculator tool or programmatic variant

See `.claude/skills/add-calculator-tool/SKILL.md`.

## Docs

- Design: `docs/superpowers/specs/2026-07-19-twitch-bits-hub-design.md`
- Plan: `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md`
- Research: `../research-engine/output/2026-07-19/twitch-bits-calculator-build-plan-DEEP.md`
