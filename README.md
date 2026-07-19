# Twitch Bits Calculator Hub

A zero-backend Creator Calculator Hub: Twitch Bits→USD, Twitch Revenue, TikTok Coins→USD, and YouTube Money calculators, plus a blog. Built for speed, SEO, and privacy.

**Stack:** Astro 6 (static) + Tailwind 4 + vanilla JS. Deployed on Cloudflare Pages.

## Features

- **Zero backend** — all math runs client-side; no database, auth, API keys, or server-side rendering.
- **Creator calculators** — Twitch Bits, Twitch Revenue, TikTok Coins, YouTube Money, plus regional/programmatic variants (GBP, EUR, CAD, AUD, pack sizes).
- **Ant-inspired design system** — clean, enterprise/fintech look with a single red accent (`#d32029` light / `#ff4d4f` dark), warm surface panels, and consistent spacing/radius tokens.
- **Light/dark theme** — persistent user preference via `localStorage`; no-flash initial load.
- **Fluid responsive layout** — padding, gutters, and typography scale smoothly with viewport width using `clamp()` instead of jumping at breakpoints.
- **SEO-first** — one page per keyword, canonical URLs, WebApplication + FAQPage + Breadcrumb JSON-LD, auto-generated sitemap.
- **Privacy-first analytics** — Cloudflare Web Analytics only; no GA4/Hotjar/FB pixel.

## Develop

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview
npm test         # vitest pure-function tests
npm run lint     # prettier + eslint
```

## Verify before deploying

```bash
npm run lint && npm run test && npm run build
```

A green build is required before any deploy. The default branch is `develop`; work happens on `build/twitch-bits-hub` per `CLAUDE.md`.

## Architecture

Three layers, separated by rate of change:

| Layer | Location                        | Responsibility                                                                    |
| ----- | ------------------------------- | --------------------------------------------------------------------------------- |
| Math  | `src/lib/calculators/`          | Pure functions, no DOM. All functions have Vitest tests.                          |
| Data  | `src/data/`                     | Rates, splits, currencies, affiliate links — the single editable source of truth. |
| UI    | `src/components/`, `src/pages/` | Astro components + vanilla-JS islands. Never hardcodes a rate.                    |

## Design tokens

Custom properties live in `src/styles/global.css` and map into Tailwind 4 via `@theme`. Key tokens include:

- `--bg`, `--surface`, `--surface-warm`, `--fg`, `--fg-2`, `--muted`, `--border`, `--accent`.
- Fluid spacing scale: `--section-y-*` and `--container-gutter-*` use `clamp()`.
- Fluid type scale: `--text-base` through `--text-4xl` scale with viewport width.
- One accent color only (Ant red); everything else is slate/grey.

## Adding a new calculator

See `.claude/skills/add-calculator-tool/SKILL.md` for the step-by-step recipe.

## Docs

- Project instructions: `CLAUDE.md`
- Design spec: `docs/superpowers/specs/2026-07-19-twitch-bits-hub-design.md`
- Build plan: `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md`

## License

MIT
