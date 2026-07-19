# Twitch Creator Calculator Hub — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-backend, 4-tool "Creator Calculator Hub" (Twitch Bits→USD, Twitch Revenue, TikTok Coins→USD, YouTube Money) plus a blog and legal pages on Astro 6 static + Tailwind 4 + vanilla JS, deployed to Cloudflare Pages, monetized via the Streamlabs Ultra affiliate program.

**Architecture:** Three-layer separation by rate of change — pure calculator functions (`src/lib/calculators/`), data-driven config (`src/data/`), and Astro presentation components + vanilla-JS islands (`src/components/`, `src/scripts/`). Rates never hardcoded in components; a rate change is a one-line data edit that propagates to every programmatic-SEO variant at build. Two tools share a `LinearConverter` engine; Revenue and YouTube get bespoke components.

**Tech Stack:** Astro 6 (static output), Tailwind CSS 4 (via `@tailwindcss/vite`), TypeScript, vanilla JS islands (no UI framework), Vitest, Cloudflare Pages, Cloudflare Web Analytics (cookieless).

## Global Constraints

- **Zero backend.** No database, no auth, no API keys, no SSR/edge functions. All math runs client-side as pure functions. No env vars in v1.
- **Rates live in `src/data/`, never hardcoded in components.** Every calculator reads its constants from a `src/data/*.ts` config file.
- **Pure functions only in `src/lib/calculators/`.** No DOM, no Astro imports, no side effects. Input guards: `NaN`/negative/`Infinity` → return `0`.
- **Single accent color.** Twitch purple `#9146ff` appears only on focus rings, primary CTAs, the active tab, and the result accent. Everything else is slate. No neon gradients.
- **No render-blocking third-party scripts on calculator pages.** Analytics is Cloudflare Web Analytics (cookieless, deferred). No GA4/Hotjar/FB pixel in v1.
- **Performance targets:** Lighthouse Performance ≥ 95, LCP < 1.2s, TBT < 50ms.
- **Accessibility:** WCAG AA on both dark/light themes; full keyboard nav; `aria-live` results; `prefers-reduced-motion` disables count-up.
- **SEO structural:** one page = one keyword; exact/near-exact H1; one H2 per section; canonical bare-URL (no query params); `WebApplication` + `FAQPage` + `Breadcrumb` JSON-LD on every tool page; FAQ content from a single `faqs.ts` source feeding both visible FAQ and schema.
- **Affiliate IDs are config, not env vars.** They live in `src/data/affiliateLinks.ts` (public URLs, not secret) so the disclosure page auto-renders active programs.
- **Copy/commit convention:** commit messages use Conventional Commits (`feat:`, `test:`, `chore:`, `docs:`). End git commit messages with `Co-Authored-By: Claude <noreply@anthropic.com>`.
- **Branch:** Do all work on branch `build/twitch-bits-hub` (the repo's default branch is `develop`). Commit frequently per the plan.

**Reference spec:** `docs/superpowers/specs/2026-07-19-twitch-bits-hub-design.md`
**Reference research:** `../research-engine/output/2026-07-19/twitch-bits-calculator-build-plan-DEEP.md`

---

## File Structure (what each file owns)

**Config & scaffold**
- `package.json` — deps (astro, @tailwindcss/vite, tailwindcss, vitest, prettier, eslint) + scripts.
- `astro.config.mjs` — site URL, integrations (sitemap), vite tailwind plugin, static output.
- `tsconfig.json` — strict, path alias `@/*` → `src/*`.
- `vitest.config.ts` — node env, include `tests/**/*.test.ts`.
- `tailwind` config is via CSS `@theme` in `src/styles/global.css` (Tailwind 4 has no JS config by default).

**Data layer (`src/data/`) — single source of truth, editable**
- `bitsConfig.ts` — `BITS_RATE_USD`, `VIEWER_PACKS`, `REGIONS`, `BULK_TABLE`.
- `currencies.ts` — currency code → symbol/precision for formatting.
- `subConfig.ts` — sub tier prices + split presets.
- `adConfig.ts` — CPM defaults by region.
- `coinConfig.ts` — TikTok coin + diamond rates by region.
- `youtubeConfig.ts` — RPM/CPM ranges by niche + region.
- `affiliateLinks.ts` — Streamlabs + Amazon programs + disclosure labels.
- `faqs.ts` — FAQ content per tool, region-parameterized where relevant.

**Pure math (`src/lib/calculators/`) — no DOM, no Astro**
- `bits.ts` — `bitsToUsd`, `usdToBits`, `bulkTable`.
- `revenue.ts` — `estimateRevenue`, `hourlyEquivalent`.
- `tiktok.ts` — `coinsToUsd`, `diamondsToUsd`, `coinsBulkTable`.
- `youtube.ts` — `earningsFromViews`, `rangeFromRpm`.

**Lib helpers (`src/lib/`)**
- `format.ts` — `formatNumber`, `formatCurrency`, `parseAmount`.
- `share.ts` — `readShareParams`, `buildShareUrl`.
- `schema.ts` — `buildWebAppSchema`, `buildFaqSchema`, `buildBreadcrumbSchema`, `buildOrganizationSchema`.

**Scripts (`src/scripts/`) — vanilla JS islands**
- `theme.ts` — dark/light toggle + localStorage persistence.
- `calculator-behavior.ts` — `initLinearConverter`, `countUp`, clipboard + share wiring.

**Primitives (`src/components/primitives/`)**
- `NumberInput.astro`, `ResultDisplay.astro`, `Tabs.astro`, `CopyButton.astro`, `ShareButton.astro`, `ReferenceTable.astro`, `Tooltip.astro`, `ThemeToggle.astro`.

**Layout pieces (`src/components/layout/`)**
- `Header.astro`, `Footer.astro`, `Base.astro` (head + theme script + analytics).

**Composite components (`src/components/`)**
- `ThemeScript.astro`, `Breadcrumbs.astro`, `RelatedTools.astro`, `AffiliateCTA.astro`, `FaqSection.astro`, `Newsletter.astro`.
- `calculators/LinearConverter.astro`, `calculators/BitsCalculator.astro`, `calculators/TiktokCalculator.astro`, `calculators/RevenueCalculator.astro`, `calculators/YoutubeCalculator.astro`.

**Layouts (`src/layouts/`)**
- `BaseLayout.astro`, `ToolLayout.astro`, `BlogLayout.astro`.

**Pages (`src/pages/`)**
- `index.astro`, the 4 tool pages, region + pack-size variants, `blog/index.astro`, `blog/[...slug].astro`, `affiliate-disclosure.astro`, `privacy.astro`, `terms.astro`, `404.astro`.

**Content (`src/content/`)**
- `config.ts` (blog collection schema), `blog/*.md` (3 cornerstone posts).

**Tests (`tests/`)**
- `calculators.test.ts` — unit + snapshot tests on pure functions.
- `data.test.ts` — config sanity (positive rates, disclosure present, faq counts).

**Public (`public/`)**
- `robots.txt`, `favicon.svg`, `og-default.png`.

**Claude artifacts**
- `CLAUDE.md` (repo root), `.claude/skills/deploy-cloudflare/SKILL.md`, `.claude/skills/add-calculator-tool/SKILL.md`.

---

## Task 1: Scaffold project + tooling

**Files:**
- Create: `package.json`, `astro.config.mjs`, `tsconfig.json`, `vitest.config.ts`, `src/styles/global.css`, `src/pages/index.astro`, `.gitignore`, `public/favicon.svg`
- Modify: (none)

**Interfaces:**
- Consumes: nothing.
- Produces: a running Astro dev server at `http://localhost:4321`, Vitest configured, Tailwind 4 tokens available.

- [ ] **Step 1: Create branch**

```bash
git checkout -b build/twitch-bits-hub
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "twitchbits-calc",
  "type": "module",
  "version": "0.1.0",
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "prettier --check . && eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "astro": "^6.0.0",
    "@astrojs/sitemap": "^3.2.0"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.0.0",
    "tailwindcss": "^4.0.0",
    "vitest": "^2.1.0",
    "prettier": "^3.3.0",
    "eslint": "^9.0.0",
    "typescript": "^5.6.0"
  },
  "overrides": {
    "vite": "7.3.6"
  }
}
```

> **Why the `vite` override:** `vitest@^2.1` declares `vite@^5`, which npm hoists to the tree root; `@tailwindcss/vite@4` then resolves that hoisted copy and calls `createIdResolver` (a Vite 6+ API) — missing on vite@5, so `npm run build` fails with `M.createIdResolver is not a function`. Forcing `vite@7.3.6` (the version Astro 6 ships nested) across the tree makes both Astro and the Tailwind plugin see Vite 7. Verified: build emits `dist/index.html` + sitemap, and `npm test` passes.

```js
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://twitchbits-calc.com',
  output: 'static',
  integrations: [sitemap()],
  vite: { plugins: [tailwindcss()] },
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "extends": "astro/tsconfigs/strict",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 5: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
```

- [ ] **Step 6: Create `src/styles/global.css`** (Tailwind 4 entry + design tokens)

```css
@import "tailwindcss";

@theme {
  --color-bg: #0f0f13;
  --color-surface: #18181b;
  --color-surface-2: #232327;
  --color-border: #2e2e34;
  --color-text: #f4f4f5;
  --color-text-muted: #a1a1aa;
  --color-accent: #9146ff;
  --color-accent-hover: #7c3aed;
  --color-success: #22c55e;
  --color-warning: #f59e0b;
  --color-danger: #ef4444;
  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}

:root { color-scheme: dark; }
:root[data-theme="light"] { color-scheme: light; }

:root[data-theme="light"] {
  --color-bg: #ffffff;
  --color-surface: #f8f8fb;
  --color-surface-2: #f1f1f5;
  --color-border: #e4e4e7;
  --color-text: #18181b;
  --color-text-muted: #52525b;
}

html { background-color: var(--color-bg); color: var(--color-text); }
body { font-family: var(--font-sans); }
.mono { font-family: var(--font-mono); }
```

- [ ] **Step 7: Create `src/pages/index.astro`** (placeholder so build works)

```astro
---
import '../styles/global.css';
---
<html lang="en">
  <head><meta charset="utf-8" /><title>Twitch Bits Calculator</title></head>
  <body><main><h1>Hub landing (placeholder)</h1></main></body>
</html>
```

- [ ] **Step 8: Create `public/favicon.svg`**

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#9146ff"/><text x="16" y="22" font-family="monospace" font-size="18" fill="#fff" text-anchor="middle">b</text></svg>
```

- [ ] **Step 9: Create `.gitignore`**

```
node_modules/
dist/
.astro/
.DS_Store
*.log
.env*
```

- [ ] **Step 10: Install deps + verify dev server boots**

Run: `npm install && npm run dev`
Expected: Astro dev server starts at `http://localhost:4321` and serves the placeholder page with no Tailwind errors. Stop the server with Ctrl-C.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: scaffold Astro 6 + Tailwind 4 + Vitest

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Theme system — no-flash script + toggle

**Files:**
- Create: `src/components/ThemeScript.astro`, `src/scripts/theme.ts`, `src/components/primitives/ThemeToggle.astro`
- Test: `tests/theme.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ThemeScript.astro` (inline head script), `ThemeToggle.astro` (UI button), `getTheme()`/`setTheme()` in `src/scripts/theme.ts`.

- [ ] **Step 1: Write the failing test (`tests/theme.test.ts`)**

```ts
import { describe, it, expect, beforeEach } from 'vitest';

// theme.ts uses localStorage; in node test we shim it.
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => { store[k] = v; },
  removeItem: (k: string) => { delete store[k]; },
};
(globalThis as any).document = { documentElement: { setAttribute: (_k: string, v: string) => { store['_theme_attr'] = v; } } };

import { getTheme, setTheme, DEFAULT_THEME } from '../src/scripts/theme';

describe('theme', () => {
  beforeEach(() => { Object.keys(store).forEach(k => delete store[k]); });

  it('defaults to dark', () => {
    expect(DEFAULT_THEME).toBe('dark');
    expect(getTheme()).toBe('dark');
  });

  it('persists a chosen theme', () => {
    setTheme('light');
    expect(getTheme()).toBe('light');
    expect(store['theme']).toBe('light');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/theme.test.ts`
Expected: FAIL — cannot find module `../src/scripts/theme`.

- [ ] **Step 3: Write `src/scripts/theme.ts`**

```ts
export type Theme = 'dark' | 'light';
export const DEFAULT_THEME: Theme = 'dark';
const KEY = 'theme';

export function getTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function setTheme(t: Theme): void {
  try {
    localStorage.setItem(KEY, t);
    document.documentElement.setAttribute('data-theme', t);
  } catch { /* storage unavailable — keep in-memory default */ }
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/theme.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Create `src/components/ThemeScript.astro`** (inline, pre-paint — no flash)

```astro
---
// Renders a tiny inline script that sets data-theme BEFORE first paint.
---
<script is:inline>
  (function () {
    try {
      var t = localStorage.getItem('theme');
      if (t !== 'light' && t !== 'dark') t = 'dark';
      document.documentElement.setAttribute('data-theme', t);
    } catch (e) {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  })();
</script>
```

- [ ] **Step 6: Create `src/components/primitives/ThemeToggle.astro`**

```astro
---
import { toggleTheme } from '../../scripts/theme';
---
<button
  type="button"
  class="theme-toggle"
  aria-label="Toggle dark / light theme"
  data-theme-toggle
>
  <span aria-hidden="true">◐</span>
</button>
<script>
  document.querySelector('[data-theme-toggle]')?.addEventListener('click', () => {
    import('../../scripts/theme').then(({ toggleTheme }) => toggleTheme());
  });
</script>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ThemeScript.astro src/scripts/theme.ts src/components/primitives/ThemeToggle.astro tests/theme.test.ts
git commit -m "feat: no-flash theme system with dark default

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 3: Base layout, Header, Footer, SEO head

**Files:**
- Create: `src/components/layout/Base.astro`, `src/components/layout/Header.astro`, `src/components/layout/Footer.astro`, `src/layouts/BaseLayout.astro`, `src/lib/site.ts`
- Modify: `src/pages/index.astro`

**Interfaces:**
- Consumes: `ThemeScript.astro`.
- Produces: `BaseLayout.astro` accepting props `{ title, description, canonical, ogImage, noindex }`; `Header`/`Footer` exported; `SITE` constant in `src/lib/site.ts`.

- [ ] **Step 1: Create `src/lib/site.ts`**

```ts
export const SITE = {
  name: 'Twitch Bits Calculator',
  url: 'https://twitchbits-calc.com',
  tagline: 'Free creator-economy calculators',
  twitter: '@twitchbitscalc',
} as const;

export const TOOLS = [
  { slug: 'twitch-bits-to-usd', name: 'Twitch Bits → USD', short: 'Bits→USD', desc: 'Convert Bits to dollars and back.' },
  { slug: 'twitch-revenue-calculator', name: 'Twitch Revenue Calculator', short: 'Revenue', desc: 'Estimate monthly + annual Twitch earnings.' },
  { slug: 'tiktok-coins-to-usd', name: 'TikTok Coins → USD', short: 'TikTok', desc: 'Convert TikTok coins and diamonds to USD.' },
  { slug: 'youtube-money-calculator', name: 'YouTube Money Calculator', short: 'YouTube', desc: 'Estimate YouTube earnings from RPM × views.' },
] as const;
```

- [ ] **Step 2: Create `src/components/layout/Base.astro`** (the `<head>`)

```astro
---
import { SITE } from '../../lib/site';
import ThemeScript from '../ThemeScript.astro';
interface Props {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: object | object[];
}
const { title, description, canonical, ogImage, noindex, jsonLd } = Astro.props;
const url = canonical ?? new URL(Astro.url.pathname, SITE.url).href;
const img = ogImage ?? '/og-default.png';
const ld = jsonLd ? (Array.isArray(jsonLd) ? jsonLd : [jsonLd]) : [];
---
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>{title}</title>
<meta name="description" content={description} />
<link rel="canonical" href={url} />
{noindex && <meta name="robots" content="noindex,nofollow" />}
<meta property="og:type" content="website" />
<meta property="og:title" content={title} />
<meta property="og:description" content={description} />
<meta property="og:url" content={url} />
<meta property="og:image" content={new URL(img, SITE.url).href} />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content={title} />
<meta name="twitter:description" content={description} />
<meta name="twitter:image" content={new URL(img, SITE.url).href} />
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<ThemeScript />
<!-- Cloudflare Web Analytics (added in Task 20; placeholder no-op here) -->
{ld.map((b) => <script type="application/ld+json" set:html={JSON.stringify(b)} />)}
```

- [ ] **Step 3: Create `src/components/layout/Header.astro`**

```astro
---
import { SITE, TOOLS } from '../../lib/site';
---
<header class="header">
  <a class="logo" href="/">{SITE.name}</a>
  <nav aria-label="Primary">
    <details class="tools-menu">
      <summary>Tools</summary>
      <ul>
        {TOOLS.map(t => <li><a href={`/${t.slug}`}>{t.name}</a></li>)}
      </ul>
    </details>
    <a href="/blog">Blog</a>
    <a href="/affiliate-disclosure">Disclosure</a>
  </nav>
</header>
<style>
  .header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1.25rem; border-bottom:1px solid var(--color-border); }
  .logo { font-weight:700; color:var(--color-text); text-decoration:none; }
  .tools-menu summary { cursor:pointer; list-style:none; }
  .tools-menu ul { list-style:none; margin:0; padding:.5rem; border:1px solid var(--color-border); background:var(--color-surface); }
</style>
```

- [ ] **Step 4: Create `src/components/layout/Footer.astro`**

```astro
---
import { SITE } from '../../lib/site';
---
<footer class="footer">
  <nav aria-label="Footer">
    <a href="/affiliate-disclosure">Affiliate Disclosure</a>
    <a href="/privacy">Privacy</a>
    <a href="/terms">Terms</a>
  </nav>
  <p>© {new Date().getFullYear()} {SITE.name}. Calculators are estimates, not financial advice.</p>
</footer>
<style>
  .footer { padding:2rem 1.25rem; border-top:1px solid var(--color-border); color:var(--color-text-muted); font-size:.875rem; display:flex; flex-direction:column; gap:.5rem; }
  .footer nav { display:flex; gap:1rem; }
</style>
```

- [ ] **Step 5: Create `src/layouts/BaseLayout.astro`**

```astro
---
import '../styles/global.css';
import Base from '../components/layout/Base.astro';
import Header from '../components/layout/Header.astro';
import Footer from '../components/layout/Footer.astro';
interface Props { title: string; description: string; canonical?: string; ogImage?: string; noindex?: boolean; jsonLd?: object | object[]; }
const props = Astro.props;
---
<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <Base {...props} />
  </head>
  <body>
    <Header />
    <main class="main">
      <slot />
    </main>
    <Footer />
  </body>
</html>
<style>
  .main { max-width:1080px; margin:0 auto; padding:1.5rem 1.25rem; }
</style>
```

- [ ] **Step 6: Replace `src/pages/index.astro` to use BaseLayout**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE } from '../lib/site';
---
<BaseLayout title={`${SITE.name} — ${SITE.tagline}`} description={SITE.tagline}>
  <section>
    <h1>{SITE.tagline}</h1>
    <p>Know exactly what you earn — Twitch, TikTok, and YouTube.</p>
  </section>
</BaseLayout>
```

- [ ] **Step 7: Verify build**

Run: `npm run build`
Expected: Build succeeds, `dist/index.html` exists, no errors about missing components.

- [ ] **Step 8: Commit**

```bash
git add src/layouts src/components/layout src/lib/site.ts src/pages/index.astro
git commit -m "feat: base layout, header, footer, SEO head

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Data layer — bits + currencies + formatting

**Files:**
- Create: `src/data/bitsConfig.ts`, `src/data/currencies.ts`, `src/lib/format.ts`
- Test: `tests/format.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `BITS_RATE_USD`, `VIEWER_PACKS`, `REGIONS`, `BULK_TABLE` from `bitsConfig.ts`; `formatNumber`, `formatCurrency`, `parseAmount` from `format.ts`. Currency formatting keyed by `REGIONS[region].currency`.

- [ ] **Step 1: Write the failing test (`tests/format.test.ts`)**

```ts
import { describe, it, expect } from 'vitest';
import { formatNumber, formatCurrency, parseAmount } from '../src/lib/format';

describe('format', () => {
  it('groups thousands with commas', () => {
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1234567)).toBe('1,234,567');
  });
  it('formats USD with 2 decimals', () => {
    expect(formatCurrency(10, 'USD')).toBe('$10.00');
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
  });
  it('formats GBP and EUR with symbol + code', () => {
    expect(formatCurrency(10, 'GBP')).toBe('£10.00');
    expect(formatCurrency(10, 'EUR')).toBe('€10.00');
  });
  it('parses human amounts incl. commas', () => {
    expect(parseAmount('1,000')).toBe(1000);
    expect(parseAmount('12.5')).toBe(12.5);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/format.test.ts`
Expected: FAIL — cannot find `../src/lib/format`.

- [ ] **Step 3: Create `src/data/bitsConfig.ts`**

```ts
export const BITS_RATE_USD = 0.01; // streamer payout per Bit (100%)

export const VIEWER_PACKS = [
  { bits: 100, priceUsd: 1.40, perBitUsd: 0.0140 },
  { bits: 500, priceUsd: 7.00, perBitUsd: 0.0140 },
  { bits: 1500, priceUsd: 19.95, perBitUsd: 0.0133 },
  { bits: 5000, priceUsd: 64.99, perBitUsd: 0.0130 },
  { bits: 25000, priceUsd: 308.00, perBitUsd: 0.0123 },
];

export const REGIONS = {
  us: { label: 'United States', currency: 'USD', rate: 1.0 },
  gb: { label: 'United Kingdom', currency: 'GBP', rate: 0.79 },
  eu: { label: 'Eurozone', currency: 'EUR', rate: 0.92 },
  ca: { label: 'Canada', currency: 'CAD', rate: 1.36 },
  au: { label: 'Australia', currency: 'AUD', rate: 1.51 },
} as const;

export type RegionCode = keyof typeof REGIONS;
export const DEFAULT_REGION: RegionCode = 'us';

export const BULK_TABLE = [1, 10, 100, 500, 1_000, 5_000, 10_000, 25_000, 50_000, 100_000];
```

- [ ] **Step 4: Create `src/data/currencies.ts`**

```ts
export const CURRENCIES: Record<string, { symbol: string; code: string; decimals: number }> = {
  USD: { symbol: '$', code: 'USD', decimals: 2 },
  GBP: { symbol: '£', code: 'GBP', decimals: 2 },
  EUR: { symbol: '€', code: 'EUR', decimals: 2 },
  CAD: { symbol: 'C$', code: 'CAD', decimals: 2 },
  AUD: { symbol: 'A$', code: 'AUD', decimals: 2 },
};
```

- [ ] **Step 5: Create `src/lib/format.ts`**

```ts
import { CURRENCIES } from '../data/currencies';

export function formatNumber(n: number): string {
  if (!Number.isFinite(n)) n = 0;
  return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

export function formatCurrency(usd: number, currency: string): string {
  if (!Number.isFinite(usd)) usd = 0;
  const c = CURRENCIES[currency] ?? CURRENCIES.USD;
  const value = usd.toLocaleString('en-US', { minimumFractionDigits: c.decimals, maximumFractionDigits: c.decimals });
  return `${c.symbol}${value}`;
}

export function parseAmount(input: string): number {
  const cleaned = input.replace(/,/g, '').trim();
  const n = Number(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/format.test.ts`
Expected: PASS (all).

- [ ] **Step 7: Commit**

```bash
git add src/data/bitsConfig.ts src/data/currencies.ts src/lib/format.ts tests/format.test.ts
git commit -m "feat: bits config, currencies, formatting helpers

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 5: Pure calculator — bits (TDD)

**Files:**
- Create: `src/lib/calculators/bits.ts`
- Test: `tests/calculators.test.ts`

**Interfaces:**
- Consumes: `BITS_RATE_USD`, `BULK_TABLE`, `REGIONS` from `src/data/bitsConfig.ts`.
- Produces: `bitsToUsd(bits, region)`, `usdToBits(usd, region)`, `bulkTable(rows, region)`.

- [ ] **Step 1: Write the failing test (`tests/calculators.test.ts`)**

```ts
import { describe, it, expect } from 'vitest';
import { bitsToUsd, usdToBits, bulkTable } from '../src/lib/calculators/bits';

describe('bits calculator', () => {
  it('converts bits to USD at $0.01/Bits', () => {
    expect(bitsToUsd(1000)).toBe(10);
    expect(bitsToUsd(100)).toBe(1);
  });
  it('converts USD to bits (rounded)', () => {
    expect(usdToBits(10)).toBe(1000);
    expect(usdToBits(1)).toBe(100);
  });
  it('guards invalid/negative input', () => {
    expect(bitsToUsd(NaN)).toBe(0);
    expect(bitsToUsd(-5)).toBe(0);
    expect(bitsToUsd(Infinity)).toBe(0);
    expect(usdToBits(-1)).toBe(0);
  });
  it('applies region FX rate for non-USD', () => {
    // 1000 bits = $10 USD; GBP rate 0.79 → £7.90
    expect(bitsToUsd(1000, 'gb')).toBeCloseTo(7.9, 2);
  });
  it('returns bulk rows with usd equivalents', () => {
    const rows = bulkTable();
    expect(rows).toHaveLength(10);
    expect(rows[4]).toEqual({ bits: 1000, usd: 10 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/calculators.test.ts`
Expected: FAIL — cannot find `../src/lib/calculators/bits`.

- [ ] **Step 3: Create `src/lib/calculators/bits.ts`**

```ts
import { BITS_RATE_USD, BULK_TABLE, REGIONS, type RegionCode, DEFAULT_REGION } from '../../data/bitsConfig';

function rateFor(region: RegionCode = DEFAULT_REGION): number {
  return REGIONS[region]?.rate ?? 1;
}

export function bitsToUsd(bits: number, region: RegionCode = DEFAULT_REGION): number {
  if (!Number.isFinite(bits) || bits < 0) return 0;
  return bits * BITS_RATE_USD * rateFor(region);
}

export function usdToBits(usd: number, region: RegionCode = DEFAULT_REGION): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd / (BITS_RATE_USD * rateFor(region)));
}

export function bulkTable(rows: number[] = BULK_TABLE, region: RegionCode = DEFAULT_REGION) {
  return rows.map((bits) => ({ bits, usd: bitsToUsd(bits, region) }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/calculators.test.ts`
Expected: PASS (all bits tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/calculators/bits.ts tests/calculators.test.ts
git commit -m "feat: bits calculator pure functions with region FX

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: UI primitives

**Files:**
- Create: `src/components/primitives/NumberInput.astro`, `ResultDisplay.astro`, `Tabs.astro`, `CopyButton.astro`, `ShareButton.astro`, `ReferenceTable.astro`, `Tooltip.astro`

**Interfaces:**
- Consumes: `formatNumber`, `formatCurrency` from `src/lib/format.ts`; `REGIONS` from `bitsConfig.ts` (for ReferenceTable currency label).
- Produces: stateless Astro primitives used by calculator components. All interactive ones expose `data-*` hooks for `calculator-behavior.ts` to wire.

- [ ] **Step 1: Create `src/components/primitives/NumberInput.astro`**

```astro
---
interface Props { id: string; label: string; value?: string | number; autofocus?: boolean; }
const { id, label, value = '', autofocus = false } = Astro.props;
---
<div class="number-input">
  <label for={id}>{label}</label>
  <input
    id={id}
    type="text"
    inputmode="decimal"
    autocomplete="off"
    autofocus={autofocus}
    value={value}
    aria-label={label}
    data-amount
  />
</div>
<style>
  .number-input label { display:block; font-size:.875rem; color:var(--color-text-muted); margin-bottom:.25rem; }
  input {
    width:100%; height:56px; font-size:1.125rem; font-family:var(--font-mono);
    text-align:right; padding:0 .75rem; border-radius:8px;
    background:var(--color-surface-2); border:1px solid var(--color-border); color:var(--color-text);
  }
  input:focus { outline:none; border-color:var(--color-accent); box-shadow:0 0 0 3px rgba(145,70,255,.25); }
  input[aria-invalid="true"] { border-color:var(--color-danger); }
</style>
```

- [ ] **Step 2: Create `src/components/primitives/ResultDisplay.astro`**

```astro
---
interface Props { id?: string; }
const { id = 'result' } = Astro.props;
---
<div class="result-display" id={id} data-result aria-live="polite">$0.00</div>
<style>
  .result-display {
    font-family:var(--font-mono); font-size:2.5rem; font-weight:600;
    color:var(--color-accent); margin:1rem 0;
  }
</style>
```

- [ ] **Step 3: Create `src/components/primitives/Tabs.astro`**

```astro
---
interface Props { id: string; tabs: string[]; active?: number; }
const { id, tabs, active = 0 } = Astro.props;
---
<div class="tabs" role="tablist" data-tabs={id}>
  {tabs.map((t, i) => (
    <button role="tab" type="button" aria-selected={i === active ? 'true' : 'false'} data-tab-index={i} class={i === active ? 'tab active' : 'tab'}>{t}</button>
  ))}
</div>
<style>
  .tabs { display:inline-flex; gap:.25rem; background:var(--color-surface-2); border-radius:8px; padding:.25rem; }
  .tab { padding:.5rem 1rem; border:none; background:transparent; color:var(--color-text-muted); border-radius:6px; cursor:pointer; font:inherit; }
  .tab.active { background:var(--color-accent); color:#fff; }
</style>
```

- [ ] **Step 4: Create `src/components/primitives/CopyButton.astro`**

```astro
---
interface Props { id?: string; label?: string; }
const { id = 'copy', label = 'Copy result' } = Astro.props;
---
<button id={id} type="button" class="copy-btn" data-copy>{label}</button>
<style>
  .copy-btn { padding:.75rem 1.25rem; border-radius:8px; border:1px solid var(--color-border); background:var(--color-surface-2); color:var(--color-text); cursor:pointer; }
  .copy-btn[data-copied="true"] { color:var(--color-success); border-color:var(--color-success); }
</style>
```

- [ ] **Step 5: Create `src/components/primitives/ShareButton.astro`**

```astro
---
interface Props { id?: string; label?: string; }
const { id = 'share', label = 'Share link' } = Astro.props;
---
<button id={id} type="button" class="share-btn" data-share>{label}</button>
<style>
  .share-btn { padding:.75rem 1.25rem; border-radius:8px; border:1px solid var(--color-accent); background:var(--color-accent); color:#fff; cursor:pointer; }
</style>
```

- [ ] **Step 6: Create `src/components/primitives/ReferenceTable.astro`**

```astro
---
interface Props { rows: { bits: number; usd: number }[]; currency?: string; }
const { rows, currency = 'USD' } = Astro.props;
---
<table class="ref-table">
  <thead><tr><th>Bits</th><th>{currency}</th></tr></thead>
  <tbody>
    {rows.map(r => (
      <tr><td class="mono">{r.bits.toLocaleString('en-US')}</td><td class="mono">{r.usd.toLocaleString('en-US',{style:'currency',currency})}</td></tr>
    ))}
  </tbody>
</table>
<style>
  .ref-table { width:100%; border-collapse:collapse; margin-top:1rem; }
  .ref-table th, .ref-table td { padding:.5rem .75rem; text-align:right; border-bottom:1px solid var(--color-border); }
  .ref-table thead th { color:var(--color-text-muted); font-weight:600; }
  .ref-table tbody tr:nth-child(even) { background:var(--color-surface-2); }
</style>
```

- [ ] **Step 7: Create `src/components/primitives/Tooltip.astro`**

```astro
---
interface Props { id: string; text: string; }
const { id, text } = Astro.props;
---
<span class="tooltip">
  <button type="button" aria-describedby={id} aria-label="More info">ⓘ</button>
  <span role="tooltip" id={id} class="tip">{text}</span>
</span>
<style>
  .tooltip { position:relative; display:inline-block; }
  .tip { position:absolute; bottom:1.4em; left:50%; transform:translateX(-50%); background:var(--color-surface-2); border:1px solid var(--color-border); padding:.4rem .6rem; border-radius:6px; font-size:.75rem; white-space:nowrap; opacity:0; pointer-events:none; transition:opacity .15s; }
  .tooltip:focus-within .tip, .tooltip:hover .tip { opacity:1; }
</style>
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds (primitives are not yet imported by pages, but must compile).

- [ ] **Step 9: Commit**

```bash
git add src/components/primitives
git commit -m "feat: calculator UI primitives

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: Calculator behavior island (vanilla JS)

**Files:**
- Create: `src/scripts/calculator-behavior.ts`
- Test: `tests/calculator-behavior.test.ts`

**Interfaces:**
- Consumes: pure `toUsd`/`fromUsd` functions passed in a config object; `formatNumber`, `formatCurrency`, `parseAmount` from `src/lib/format.ts`; `readShareParams`/`buildShareUrl` from `src/lib/share.ts`.
- Produces: `initLinearConverter(root, config)` wiring DOM → math → DOM with count-up, copy, share, query-param sync.

- [ ] **Step 1: Create `src/lib/share.ts`** (consumed by the island)

```ts
export function readShareParams(allowed: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  try {
    new URLSearchParams(window.location.search).forEach((v, k) => {
      if (allowed.includes(k)) out[k] = v;
    });
  } catch { /* non-browser */ }
  return out;
}

export function buildShareUrl(params: Record<string, string | number>): string {
  const u = new URL(window.location.href);
  u.search = '';
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => sp.set(k, String(v)));
  u.search = sp.toString();
  return u.toString();
}
```

- [ ] **Step 2: Write the failing test (`tests/calculator-behavior.test.ts`)** — test `countUp` (the only pure, DOM-free piece)

```ts
import { describe, it, expect, vi } from 'vitest';

// countUp uses rAF; we test the easing math directly via the exported helper.
// We import the module with a stubbed document; only countUp is pure-ish.
const rafs: FrameRequestCallback[] = [];
(globalThis as any).requestAnimationFrame = (cb: FrameRequestCallback) => { rafs.push(cb); return 1; };

import { countUp } from '../src/scripts/calculator-behavior';

describe('countUp', () => {
  it('calls setter with values progressing toward target', () => {
    rafs.length = 0;
    const seen: number[] = [];
    countUp(0, 10, 150, (v) => seen.push(v));
    // pump all queued frames instantly
    let copy = rafs.slice(); rafs.length = 0;
    while (copy.length) { const f = copy.shift()!; f(0); copy = rafs.slice(); rafs.length = 0; }
    expect(seen[seen.length - 1]).toBe(10);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run tests/calculator-behavior.test.ts`
Expected: FAIL — cannot find `../src/scripts/calculator-behavior`.

- [ ] **Step 4: Create `src/scripts/calculator-behavior.ts`**

```ts
import { formatNumber, formatCurrency, parseAmount } from '../lib/format';
import { readShareParams, buildShareUrl } from '../lib/share';

export interface LinearConfig {
  tool: string;
  unitName: string;
  toUsd: (n: number) => number;
  fromUsd: (u: number) => number;
  region?: string;
  currency?: string;
  paramKey: string;        // query-param key, e.g. 'bits'
  defaultAmount?: number;
}

export function countUp(from: number, to: number, durationMs: number, set: (v: number) => void): void {
  const prefersReduced = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) { set(to); return; }
  const start = performance.now();
  const tick = (now: number) => {
    const p = Math.min(1, (now - start) / durationMs);
    const eased = 1 - Math.pow(1 - p, 3);
    set(from + (to - from) * eased);
    if (p < 1) requestAnimationFrame(tick);
    else set(to);
  };
  requestAnimationFrame(tick);
}

export function initLinearConverter(root: HTMLElement, config: LinearConfig): void {
  const input = root.querySelector<HTMLInputElement>('[data-amount]');
  const result = root.querySelector<HTMLElement>('[data-result]');
  const copyBtn = root.querySelector<HTMLButtonElement>('[data-copy]');
  const shareBtn = root.querySelector<HTMLButtonElement>('[data-share]');
  const currency = config.currency ?? 'USD';
  let mode: 'toUsd' | 'fromUsd' = 'toUsd';
  let lastUsd = 0;

  const renderResult = (usd: number) => {
    if (!result) return;
    countUp(lastUsd, usd, 150, (v) => { result.textContent = formatCurrency(v, currency); });
    lastUsd = usd;
  };

  const compute = () => {
    if (!input) return;
    const raw = parseAmount(input.value);
    input.setAttribute('aria-invalid', raw <= 0 && input.value.trim() !== '' ? 'true' : 'false');
    const usd = mode === 'toUsd' ? config.toUsd(raw) : raw;
    renderResult(usd);
    syncShare(raw);
  };

  const syncShare = (amount: number) => {
    if (!shareBtn) return;
    shareBtn.dataset.shareUrl = buildShareUrl({ [config.paramKey]: amount });
  };

  // hydrate from URL
  const params = readShareParams([config.paramKey]);
  if (params[config.paramKey] !== undefined) {
    input!.value = formatNumber(Number(params[config.paramKey]));
  } else if (config.defaultAmount) {
    input!.value = formatNumber(config.defaultAmount);
  }

  input?.addEventListener('input', compute);

  root.querySelectorAll<HTMLButtonElement>('[data-tab-index]').forEach((btn) => {
    btn.addEventListener('click', () => {
      mode = Number(btn.dataset.tabIndex) === 0 ? 'toUsd' : 'fromUsd';
      root.querySelectorAll('[data-tab-index]').forEach((b) => b.classList.toggle('active', b === btn));
      if (input) input.value = mode === 'toUsd' ? formatNumber(config.fromUsd(lastUsd)) : formatNumber(lastUsd);
      // swap label + placeholder handled by component; here just recompute
      compute();
    });
  });

  copyBtn?.addEventListener('click', async () => {
    const text = `${input?.value ?? ''} ${config.unitName} = ${formatCurrency(lastUsd, currency)}`;
    try { await navigator.clipboard.writeText(text); copyBtn.dataset.copied = 'true'; copyBtn.textContent = 'Copied ✓'; setTimeout(() => { copyBtn.dataset.copied = 'false'; copyBtn.textContent = 'Copy result'; }, 1500); } catch { /* clipboard blocked */ }
  });

  shareBtn?.addEventListener('click', async () => {
    const url = shareBtn.dataset.shareUrl ?? window.location.href;
    try { await navigator.clipboard.writeText(url); } catch { /* blocked */ }
  });

  compute();
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/calculator-behavior.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/scripts/calculator-behavior.ts src/lib/share.ts tests/calculator-behavior.test.ts
git commit -m "feat: vanilla-JS calculator behavior island

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: LinearConverter + BitsCalculator

**Files:**
- Create: `src/components/calculators/LinearConverter.astro`, `src/components/calculators/BitsCalculator.astro`

**Interfaces:**
- Consumes: `bitsToUsd`, `usdToBits`, `bulkTable` from `src/lib/calculators/bits.ts`; primitives; `initLinearConverter` from `src/scripts/calculator-behavior.ts`.
- Produces: `BitsCalculator.astro` (drop-in for the hero page) and the reusable `LinearConverter.astro` (also used by TikTok + variants).

- [ ] **Step 1: Create `src/components/calculators/LinearConverter.astro`**

```astro
---
import Tabs from '../primitives/Tabs.astro';
import NumberInput from '../primitives/NumberInput.astro';
import ResultDisplay from '../primitives/ResultDisplay.astro';
import CopyButton from '../primitives/CopyButton.astro';
import ShareButton from '../primitives/ShareButton.astro';
import ReferenceTable from '../primitives/ReferenceTable.astro';
import Tooltip from '../primitives/Tooltip.astro';
import { formatCurrency } from '../../lib/format';

export interface ConverterConfig {
  tool: 'bits' | 'tiktok';
  unitName: string;
  paramKey: string;
  toUsd: (n: number) => number;
  fromUsd: (u: number) => number;
  bulkRows: number[];
  toBulkRows: (rows: number[]) => { bits: number; usd: number }[];
  currency?: string;
  defaultAmount?: number;
  viewerContext?: { perUnitCostUsd: number; label: string };
}
const { config } = Astro.props as { config: ConverterConfig };
const rows = config.toBulkRows(config.bulkRows);
---
<div class="calculator" data-tool={config.tool}>
  <Tabs id="tabs" tabs={[config.unitName, 'USD']} />
  <NumberInput id="amount" label={config.unitName} autofocus value={config.defaultAmount ?? ''} />
  <ResultDisplay id="result" />
  <div class="breakdown">
    <div>Streamer gets <strong class="mono">{formatCurrency(config.toUsd(config.defaultAmount ?? 0), config.currency ?? 'USD')}</strong> (100%)</div>
    {config.viewerContext && (
      <div>{config.viewerContext.label} <strong class="mono">~${config.viewerContext.perUnitCostUsd.toFixed(4)}</strong> per unit <Tooltip id="vc" text="What viewers pay per unit, based on pack pricing." /></div>
    )}
  </div>
  <div class="actions">
    <CopyButton id="copy" />
    <ShareButton id="share" />
  </div>
  <ReferenceTable rows={rows} currency={config.currency ?? 'USD'} />
</div>
<style>
  .calculator { background:var(--color-surface); border:1px solid var(--color-border); border-radius:12px; padding:1.25rem; max-width:480px; margin:0 auto; }
  .breakdown { font-size:.9rem; color:var(--color-text-muted); display:flex; flex-direction:column; gap:.25rem; margin:.5rem 0; }
  .actions { display:flex; gap:.5rem; margin-top:1rem; }
  .actions > * { flex:1; }
</style>
<!--
  The pure functions can't survive JSON.stringify (they'd become strings), so we
  serialize only metadata and re-import the real functions in the island by `tool`.
-->
<script id="__lc_config__" type="application/json" is:inline set:html={JSON.stringify({
  tool: config.tool, unitName: config.unitName, paramKey: config.paramKey,
  currency: config.currency ?? 'USD', defaultAmount: config.defaultAmount,
})} />
<script>
  import { initLinearConverter } from '../../scripts/calculator-behavior';
  import { bitsToUsd, usdToBits } from '../../lib/calculators/bits';
  import { coinsToUsd, usdToCoins } from '../../lib/calculators/tiktok';
  const root = document.querySelector('[data-tool]');
  const meta = JSON.parse(document.getElementById('__lc_config__')?.textContent ?? '{}');
  const fns = meta.tool === 'bits' ? { toUsd: bitsToUsd, fromUsd: usdToBits } : { toUsd: coinsToUsd, fromUsd: usdToCoins };
  initLinearConverter(root, { ...meta, ...fns });
</script>
```

- [ ] **Step 2: Create `src/components/calculators/BitsCalculator.astro`**

```astro
---
import LinearConverter from './LinearConverter.astro';
import { bitsToUsd, usdToBits, bulkTable } from '../../lib/calculators/bits';
import { BULK_TABLE, VIEWER_PACKS } from '../../data/bitsConfig';
const defaultPerBit = VIEWER_PACKS[0].perBitUsd;
---
<LinearConverter config={{
  tool: 'bits', unitName: 'Bits', paramKey: 'bits',
  toUsd: bitsToUsd, fromUsd: usdToBits,
  bulkRows: BULK_TABLE, toBulkRows: (rows) => bulkTable(rows),
  viewerContext: { perUnitCostUsd: defaultPerBit, label: 'Viewer pays' },
}} />
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/components/calculators
git commit -m "feat: LinearConverter engine + BitsCalculator

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: ToolLayout, schema, Breadcrumbs, FaqSection, RelatedTools, AffiliateCTA

**Files:**
- Create: `src/layouts/ToolLayout.astro`, `src/lib/schema.ts`, `src/components/Breadcrumbs.astro`, `src/components/FaqSection.astro`, `src/components/RelatedTools.astro`, `src/components/AffiliateCTA.astro`

**Interfaces:**
- Consumes: `BaseLayout.astro`; `TOOLS` from `src/lib/site.ts`; `faqs.ts` content (next task); `affiliateLinks.ts` (Task 18).
- Produces: `ToolLayout.astro` accepting `{ title, description, slug, faqs, breadcrumb, jsonLd }` and rendering the canonical calculator page structure.

- [ ] **Step 1: Create `src/lib/schema.ts`**

```ts
import { SITE } from './site';

export function buildWebAppSchema(name: string): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    applicationCategory: 'UtilityApplication',
    operatingSystem: 'Web',
    offers: { '@type': 'Offer', price: 0, priceCurrency: 'USD' },
    url: SITE.url,
  };
}

export function buildFaqSchema(faqs: { q: string; a: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question', name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function buildBreadcrumbSchema(crumbs: { name: string; url: string }[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem', position: i + 1, name: c.name, item: c.url,
    })),
  };
}

export function buildOrganizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE.name, url: SITE.url,
  };
}

export function buildWebSiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE.name, url: SITE.url,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE.url}/?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}
```

- [ ] **Step 2: Create `src/components/Breadcrumbs.astro`**

```astro
---
interface Props { crumbs: { name: string; url: string }[]; }
const { crumbs } = Astro.props;
---
<nav class="breadcrumbs" aria-label="Breadcrumb">
  <ol>
    {crumbs.map((c, i) => (
      <li><a href={c.url}>{c.name}</a>{i < crumbs.length - 1 && ' ›'}</li>
    ))}
  </ol>
</nav>
<style>
  .breadcrumbs { font-size:.8rem; color:var(--color-text-muted); margin-bottom:1rem; }
  .breadcrumbs ol { list-style:none; display:flex; gap:.4rem; flex-wrap:wrap; padding:0; }
  .breadcrumbs a { color:var(--color-text-muted); }
</style>
```

- [ ] **Step 3: Create `src/components/FaqSection.astro`**

```astro
---
import { buildFaqSchema } from '../lib/schema';
interface Props { faqs: { q: string; a: string }[]; }
const { faqs } = Astro.props;
---
<section class="faq" aria-label="Frequently asked questions">
  <h2>Frequently asked questions</h2>
  {faqs.map((f) => (
    <details><summary>{f.q}</summary><p>{f.a}</p></details>
  ))}
</section>
<script type="application/ld+json" is:inline set:html={JSON.stringify(buildFaqSchema(faqs))} />
<style>
  .faq { margin-top:2rem; }
  .faq details { border:1px solid var(--color-border); border-radius:8px; padding:.75rem 1rem; margin-bottom:.5rem; }
  .faq summary { cursor:pointer; font-weight:600; }
</style>
```

- [ ] **Step 4: Create `src/components/RelatedTools.astro`**

```astro
---
import { TOOLS } from '../lib/site';
interface Props { exclude?: string; }
const { exclude } = Astro.props;
const related = TOOLS.filter((t) => t.slug !== exclude);
---
<section class="related" aria-label="Related calculators">
  <h2>Related creator calculators</h2>
  <div class="grid">
    {related.map((t) => (
      <a class="card" href={`/${t.slug}`}><strong>{t.name}</strong><span>{t.desc}</span></a>
    ))}
  </div>
</section>
<style>
  .related { margin-top:2rem; }
  .grid { display:grid; grid-template-columns:1fr; gap:.75rem; }
  @media (min-width:720px){ .grid { grid-template-columns:repeat(3,1fr); } }
  .card { display:flex; flex-direction:column; gap:.25rem; padding:1rem; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface); text-decoration:none; color:var(--color-text); }
  .card:hover { border-color:var(--color-accent); }
</style>
```

- [ ] **Step 5: Create `src/components/AffiliateCTA.astro`**

```astro
---
import { AFFILIATES } from '../data/affiliateLinks';
interface Props { variant?: 'primary' | 'alt'; program?: string; }
const { variant = 'primary', program = 'streamlabs' } = Astro.props;
const a = AFFILIATES[program];
if (!a) { return null as any; }
const cta = variant === 'alt' ? a.cta.alt : a.cta.primary;
---
<aside class="affiliate-cta" aria-label="Sponsored">
  <span class="tag">Affiliate</span>
  <h3>{a.label}</h3>
  <p>{a.disclosure}</p>
  <a class="cta" href={a.url} rel="sponsored nofollow" target="_blank">{cta}</a>
</aside>
<style>
  .affiliate-cta { border-left:3px solid var(--color-accent); background:var(--color-surface-2); padding:1rem 1.25rem; border-radius:8px; margin-top:1.5rem; }
  .tag { font-size:.7rem; text-transform:uppercase; letter-spacing:.05em; color:var(--color-text-muted); }
  .cta { display:inline-block; margin-top:.5rem; padding:.6rem 1rem; background:var(--color-accent); color:#fff; border-radius:6px; text-decoration:none; }
</style>
```

- [ ] **Step 6: Create `src/layouts/ToolLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import Breadcrumbs from '../components/Breadcrumbs.astro';
import FaqSection from '../components/FaqSection.astro';
import RelatedTools from '../components/RelatedTools.astro';
import AffiliateCTA from '../components/AffiliateCTA.astro';
import { buildWebAppSchema, buildBreadcrumbSchema } from '../lib/schema';
interface Props {
  title: string; description: string; slug: string;
  crumbs: { name: string; url: string }[];
  faqs: { q: string; a: string }[];
}
const { title, description, slug, crumbs, faqs } = Astro.props;
const jsonLd = [buildWebAppSchema(title), buildBreadcrumbSchema(crumbs)];
---
<BaseLayout title={title} description={description} jsonLd={jsonLd}>
  <article>
    <Breadcrumbs crumbs={crumbs} />
    <h1>{title}</h1>
    <p class="subhead">{description}</p>
    <slot />
    <FaqSection faqs={faqs} />
    <RelatedTools exclude={slug} />
    <AffiliateCTA />
  </article>
</BaseLayout>
<style>
  .subhead { color:var(--color-text-muted); margin-bottom:1.5rem; }
  article { max-width:760px; margin:0 auto; }
</style>
```

- [ ] **Step 7: Create a stub `src/data/affiliateLinks.ts`** (so AffiliateCTA compiles; filled in Task 18)

```ts
export const AFFILIATES = {
  streamlabs: {
    id: 'streamlabs-ultra', label: 'Streamlabs Ultra',
    url: 'https://streamlabs.com/ultra', // replaced with real Impact link in Task 18
    disclosure: 'We earn a commission when you sign up for Streamlabs Ultra.',
    cta: { primary: 'Upgrade your stream', alt: 'Start free trial' },
    placement: 'after-result' as const,
  },
  amazon: {
    id: 'amazon-streaming-gear', label: 'Amazon Associates',
    url: 'https://www.amazon.com',
    disclosure: 'As an Amazon Associate we earn from qualifying purchases.',
    cta: { primary: 'Shop streaming gear', alt: 'Browse gear' },
    placement: 'blog-only' as const,
  },
} as const;
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds.

- [ ] **Step 9: Commit**

```bash
git add src/layouts/ToolLayout.astro src/lib/schema.ts src/components/Breadcrumbs.astro src/components/FaqSection.astro src/components/RelatedTools.astro src/components/AffiliateCTA.astro src/data/affiliateLinks.ts
git commit -m "feat: ToolLayout, schema builders, Breadcrumbs/FAQ/Related/AffiliateCTA

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: FAQ content + hero Bits page

**Files:**
- Create: `src/data/faqs.ts`, `src/pages/twitch-bits-to-usd.astro`

**Interfaces:**
- Consumes: `BitsCalculator.astro`, `ToolLayout.astro`.
- Produces: the live hero calculator page at `/twitch-bits-to-usd`.

- [ ] **Step 1: Create `src/data/faqs.ts`**

```ts
import type { RegionCode } from './bitsConfig';

export function bitsFaqs(region: RegionCode = 'us') {
  const cur = region === 'us' ? 'USD' : region.toUpperCase();
  return [
    { q: `How much is 100 Bits on Twitch in ${cur}?`, a: `100 Bits = 1 ${cur} for the streamer (at the standard $0.01 per Bit payout). Viewers pay around $1.40 to buy 100 Bits.` },
    { q: 'How much do streamers make per Bit?', a: 'Streamers receive $0.01 per Bit cheered (100% of the Bits value), regardless of Affiliate vs Partner status.' },
    { q: 'How much do Bits cost for viewers?', a: 'Viewer cost per Bit is roughly $0.0123–$0.0140 depending on pack size and region; larger packs cost slightly less per Bit.' },
    { q: 'What is the Twitch Bits to USD conversion rate?', a: 'The streamer payout rate is fixed at 1 Bit = $0.01 USD. Viewer purchase pricing varies by pack and region.' },
    { q: 'Do Twitch Partners earn more from Bits than Affiliates?', a: 'No. Both Affiliates and Partners receive the same $0.01 per Bit. The difference is eligibility, not the per-Bit rate.' },
    { q: 'How do I share a specific Bits calculation?', a: 'Use the Share link button — it encodes your amount in the URL so anyone opening it sees the same calculation.' },
    { q: 'Are Bits refundable?', a: 'Bits are generally non-refundable once cheered. Twitch may refund for proven fraud or technical errors on a case-by-case basis.' },
  ];
}

export const revenueFaqs = [
  { q: 'How is Twitch revenue calculated?', a: 'Twitch revenue = subscription payouts (your split) + Bits ($0.01 each) + ad revenue (CPM × minutes × viewers), summed monthly.' },
  { q: 'What is the default sub split?', a: 'The standard Twitch sub split is 50/50. Partner Plus tiers can qualify for 70/30 up to $100K, then 50/50 above that.' },
  { q: 'How much do ads pay on Twitch?', a: 'Ad revenue ≈ CPM × (minutes watched ÷ 1000) × average viewers. Typical CPMs range $2–$10 depending on region and season.' },
  { q: 'Do gift subs count toward revenue?', a: 'Yes. Gift subs are paid out at the same tier and split as regular subs; the recipient gets the sub, the gifter pays.' },
  { q: 'Is this calculator accurate?', a: 'It gives an estimate based on current Twitch rates and your inputs. Real payouts vary by region, tax, and program terms.' },
];

export const tiktokFaqs = [
  { q: 'How much is a TikTok coin worth in USD for creators?', a: 'Creators earn diamonds from gifts; each diamond is typically worth about $0.005, and coins convert to diamonds at roughly a 2:1 ratio.' },
  { q: 'What are TikTok diamonds?', a: 'Diamonds are the creator-facing unit. When a viewer sends a gift bought with coins, the creator receives diamonds, redeemable for cash.' },
  { q: 'How much does TikTok take?', a: 'Twitch-style: TikTok keeps roughly 50% of the coin value; creators receive the remainder as diamonds.' },
  { q: 'Is the TikTok coin rate the same in every country?', a: 'No. Coin prices and payout rates vary by region and currency; this calculator uses approximate USD rates.' },
  { q: 'How do I withdraw TikTok diamonds?', a: 'Diamonds are converted to cash once you meet the minimum withdrawal threshold and link a supported payment method.' },
];

export const youtubeFaqs = [
  { q: 'What is YouTube RPM?', a: 'RPM (revenue per mille) is what you earn per 1,000 views after YouTube takes its 45% cut. It bundles ads, channel memberships, and Super Chat.' },
  { q: 'How much do YouTubers make per 1,000 views?', a: 'Typical RPM ranges $1–$10 depending on niche and audience geography; finance and tech tend higher, vlogs and kids content lower.' },
  { q: 'Does YouTube pay for views without ads?', a: 'No ad revenue without monetization (Partner Program). Once eligible, ads + memberships + Super Chat all contribute to RPM.' },
  { q: 'How accurate is this YouTube calculator?', a: 'It gives a low–high estimate from your RPM and views. Actual earnings vary by niche, season, and ad fill rate.' },
  { q: 'Do Shorts pay the same as long-form?', a: 'No. Shorts RPM is much lower than long-form; treat Shorts revenue separately when forecasting.' },
];
```

- [ ] **Step 2: Create `src/pages/twitch-bits-to-usd.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import BitsCalculator from '../components/calculators/BitsCalculator.astro';
import { bitsFaqs } from '../data/faqs';
const faqs = bitsFaqs('us');
---
<ToolLayout
  title="Twitch Bits to USD Calculator"
  description="Convert Twitch Bits to USD (and back) instantly. See streamer payout, viewer cost, and a bulk reference table."
  slug="twitch-bits-to-usd"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: '/twitch-bits-to-usd' }]}
  faqs={faqs}
>
  <BitsCalculator />
  <section class="edu">
    <h2>How much do streamers make from Bits?</h2>
    <p>Streamers earn <strong>$0.01 per Bit</strong> cheered in their channel — so 1,000 Bits equals $10. Viewers pay a
    premium to buy Bits (around $0.012–$0.014 each depending on the pack), which is how Twitch makes money on the
    difference. Bits are one of three main revenue streams for Twitch creators, alongside subscriptions and ads.</p>
  </section>
</ToolLayout>
<style>
  .edu { margin-top:2rem; max-width:680px; }
  .edu p { color:var(--color-text-muted); line-height:1.6; }
</style>
```

- [ ] **Step 3: Verify build + run dev smoke test**

Run: `npm run build && npm run preview &`
Then open `http://localhost:4321/twitch-bits-to-usd` — confirm: calculator renders, typing updates the result with count-up, Copy/Share buttons present, FAQ + Related tools + affiliate CTA render below. Kill the preview server.

- [ ] **Step 4: Run all tests**

Run: `npm test`
Expected: All test files pass.

- [ ] **Step 5: Commit**

```bash
git add src/data/faqs.ts src/pages/twitch-bits-to-usd.astro
git commit -m "feat: hero Twitch Bits to USD page + FAQ content

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 11: Deploy to Cloudflare Pages preview + project skill

**Files:**
- Create: `.claude/skills/deploy-cloudflare/SKILL.md`, `public/robots.txt`
- Modify: `README.md`

**Interfaces:**
- Consumes: built `dist/`.
- Produces: a live `*.pages.dev` preview deploy; a reusable deploy/verify skill.

- [ ] **Step 1: Create `public/robots.txt`**

```
User-agent: *
Allow: /

Sitemap: https://twitchbits-calc.com/sitemap-index.xml
```

- [ ] **Step 2: Update `README.md`**

```markdown
# twitchbits-calc

A zero-backend Creator Calculator Hub: Twitch Bits→USD, Twitch Revenue, TikTok Coins→USD, and YouTube Money calculators, plus a blog.

**Stack:** Astro 6 (static) + Tailwind 4 + vanilla JS. Deployed on Cloudflare Pages.

## Develop
\`\`\`bash
npm install
npm run dev      # http://localhost:4321
npm run build    # -> dist/
npm run preview
npm test         # vitest
\`\`\`

See `docs/superpowers/specs/2026-07-19-twitch-bits-hub-design.md` for the design and `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md` for the build plan.
```

- [ ] **Step 3: Create `.claude/skills/deploy-cloudflare/SKILL.md`**

````markdown
---
name: deploy-cloudflare
description: Build, deploy to Cloudflare Pages, and smoke-test the Twitch Bits Hub. Use when deploying the site or verifying a deploy.
---

# Deploy to Cloudflare Pages

1. Ensure on branch `build/twitch-bits-hub` (or a feature branch off it).
2. `npm run build` — must succeed with `dist/` produced.
3. `npm test` — all pure-function tests must pass.
4. `npm run preview` and smoke-test `/`, `/twitch-bits-to-usd` (type → result count-up → copy → share), theme toggle persists across reload.
5. Push: `git push origin HEAD`.
6. Cloudflare Pages auto-builds on push (git-connected). Confirm the Pages deploy succeeded in the Cloudflare dashboard (or via `npx wrangler pages deployment list` if configured).
7. Open the `*.pages.dev` preview URL; re-run the smoke test there.
8. After a production deploy, refresh the sitemap in Google Search Console + Bing Webmaster.

If the build fails locally, do not push — fix first. Never deploy a red build.
````

- [ ] **Step 4: Commit (deploy is a manual/Cloudflare-dashboard step; do not run `git push` unless the user asks)**

```bash
git add public/robots.txt README.md .claude/skills/deploy-cloudflare/SKILL.md
git commit -m "chore: robots.txt, README, deploy skill

Co-Authored-By: Claude <noreply@anthropic.com>"
```

> **Manual step (do not auto-run):** connect the repo to Cloudflare Pages (Pages → Create project → Connect to Git → select repo → build command `npm run build`, output `dist`). The first preview deploy happens on push. This requires the user's Cloudflare account and is not automated here.

---

## Task 12: Revenue calculator (config + pure fn + component + page)

**Files:**
- Create: `src/data/subConfig.ts`, `src/data/adConfig.ts`, `src/lib/calculators/revenue.ts`, `src/components/calculators/RevenueCalculator.astro`, `src/pages/twitch-revenue-calculator.astro`
- Test: append to `tests/calculators.test.ts`

**Interfaces:**
- Consumes: `bitsToUsd` from `bits.ts`; `revenueFaqs` from `faqs.ts`; `ToolLayout`.
- Produces: `estimateRevenue(input)` returning `{ monthly, annual, hourlyEquivalent }`; `/twitch-revenue-calculator`.

- [ ] **Step 1: Append failing test to `tests/calculators.test.ts`**

```ts
import { estimateRevenue } from '../src/lib/calculators/revenue';

describe('revenue calculator', () => {
  it('computes monthly revenue from subs + bits + ads', () => {
    const r = estimateRevenue({
      subs: { tier1: 50, tier2: 0, tier3: 0, prime: 5, gift: 0 },
      split: 0.5, bits: 5000, ads: { cpm: 2, minutes: 120, viewers: 50 },
    });
    // subs: 50 * 4.99 * 0.5 + 5 * 4.99 * 0.5 = 124.75 + 12.475 = 137.225
    // bits: 5000 * 0.01 = 50
    // ads: 2 * (120/1000) * 50 = 12
    expect(r.monthly.subs).toBeCloseTo(137.225, 2);
    expect(r.monthly.bits).toBe(50);
    expect(r.monthly.ads).toBe(12);
    expect(r.monthly.total).toBeCloseTo(199.225, 2);
    expect(r.annual.total).toBeCloseTo(199.225 * 12, 2);
  });

  it('guards negative inputs', () => {
    const r = estimateRevenue({ subs: { tier1: -5, tier2: 0, tier3: 0, prime: 0, gift: 0 }, split: 0.5, bits: -10, ads: { cpm: -1, minutes: 0, viewers: 0 } });
    expect(r.monthly.total).toBe(0);
  });

  it('snapshots a typical partner estimate', () => {
    expect(estimateRevenue({ subs: { tier1: 200, tier2: 10, tier3: 2, prime: 20, gift: 5 }, split: 0.7, bits: 50000, ads: { cpm: 4, minutes: 300, viewers: 150 } })).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/calculators.test.ts`
Expected: FAIL — cannot find `../src/lib/calculators/revenue`.

- [ ] **Step 3: Create `src/data/subConfig.ts`**

```ts
export const SUB_PRICES = { tier1: 4.99, tier2: 9.99, tier3: 24.99 };
export const SPLIT_PRESETS = [
  { label: '50/50 (standard)', value: 0.5 },
  { label: '60/40', value: 0.6 },
  { label: '70/30 (Partner Plus)', value: 0.7 },
] as const;
```

- [ ] **Step 4: Create `src/data/adConfig.ts`**

```ts
export const AD_CPM_DEFAULTS: Record<string, number> = {
  us: 4.0, gb: 3.0, eu: 3.0, ca: 3.0, au: 3.5,
};
export const MIN_WAGE_USD_HOURLY = 7.25;
```

- [ ] **Step 5: Create `src/lib/calculators/revenue.ts`**

```ts
import { SUB_PRICES } from '../../data/subConfig';
import { MIN_WAGE_USD_HOURLY } from '../../data/adConfig';
import { BITS_RATE_USD } from '../../data/bitsConfig';

export interface RevenueInput {
  subs: { tier1: number; tier2: number; tier3: number; prime: number; gift: number };
  split: number;            // share the streamer keeps (0.5 default)
  bits: number;
  ads: { cpm: number; minutes: number; viewers: number };
}
const g = (n: number) => (Number.isFinite(n) && n >= 0 ? n : 0);

export function estimateRevenue(i: RevenueInput) {
  const split = i.split > 0 && i.split <= 1 ? i.split : 0.5;
  const subsUsd =
    (g(i.subs.tier1) * SUB_PRICES.tier1 +
     g(i.subs.tier2) * SUB_PRICES.tier2 +
     g(i.subs.tier3) * SUB_PRICES.tier3 +
     g(i.subs.prime) * SUB_PRICES.tier1 +
     g(i.subs.gift) * SUB_PRICES.tier1) * split;
  const bitsUsd = g(i.bits) * BITS_RATE_USD;
  const adsUsd = g(i.ads.cpm) * (g(i.ads.minutes) / 1000) * g(i.ads.viewers);
  const monthlyTotal = subsUsd + bitsUsd + adsUsd;
  const annual = { subs: subsUsd * 12, bits: bitsUsd * 12, ads: adsUsd * 12, total: monthlyTotal * 12 };
  // assume ~120 streaming hours/month for hourly equivalent
  const hoursPerMonth = 120;
  const hourlyEquivalent = monthlyTotal / hoursPerMonth;
  return {
    monthly: { subs: subsUsd, bits: bitsUsd, ads: adsUsd, total: monthlyTotal },
    annual,
    hourlyEquivalent,
    minWageMultiple: hourlyEquivalent / MIN_WAGE_USD_HOURLY,
  };
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run tests/calculators.test.ts`
Expected: PASS (incl. snapshot created).

- [ ] **Step 7: Create `src/components/calculators/RevenueCalculator.astro`**

```astro
---
import { estimateRevenue } from '../../lib/calculators/revenue';
import { SPLIT_PRESETS } from '../../data/subConfig';
import { AD_CPM_DEFAULTS } from '../../data/adConfig';
import { formatCurrency } from '../../lib/format';
---
<form class="revenue-calc" data-tool="revenue">
  <fieldset>
    <legend>Subscriptions</legend>
    <label>Tier 1 ($4.99)<input type="number" min="0" data-sub="tier1" value="50"/></label>
    <label>Tier 2 ($9.99)<input type="number" min="0" data-sub="tier2" value="0"/></label>
    <label>Tier 3 ($24.99)<input type="number" min="0" data-sub="tier3" value="0"/></label>
    <label>Prime<input type="number" min="0" data-sub="prime" value="5"/></label>
    <label>Gift<input type="number" min="0" data-sub="gift" value="0"/></label>
    <label>Split
      <select data-split>
        {SPLIT_PRESETS.map(s => <option value={s.value} selected={s.value === 0.5}>{s.label}</option>)}
      </select>
    </label>
  </fieldset>
  <fieldset>
    <legend>Bits</legend>
    <label>Bits cheered<input type="number" min="0" data-bits value="5000"/></label>
  </fieldset>
  <fieldset>
    <legend>Ads</legend>
    <label>CPM ($)<input type="number" min="0" step="0.1" data-cpm value={AD_CPM_DEFAULTS.us}/></label>
    <label>Minutes/stream<input type="number" min="0" data-minutes value="120"/></label>
    <label>Avg viewers<input type="number" min="0" data-viewers value="50"/></label>
  </fieldset>
  <div class="result" data-result aria-live="polite">$0.00 / month</div>
  <div class="sub" data-subresult></div>
</form>
<script>
  import { estimateRevenue } from '../../lib/calculators/revenue';
  import { formatCurrency } from '../../lib/format';
  const form = document.querySelector('[data-tool="revenue"]') as HTMLFormElement;
  const read = () => {
    const num = (sel: string) => Number((form.querySelector(sel) as HTMLInputElement)?.value || 0);
    return {
      subs: { tier1: num('[data-sub="tier1"]'), tier2: num('[data-sub="tier2"]'), tier3: num('[data-sub="tier3"]'), prime: num('[data-sub="prime"]'), gift: num('[data-sub="gift"]') },
      split: Number((form.querySelector('[data-split]') as HTMLSelectElement)?.value || 0.5),
      bits: num('[data-bits]'),
      ads: { cpm: num('[data-cpm]'), minutes: num('[data-minutes]'), viewers: num('[data-viewers]') },
    };
  };
  const render = () => {
    const r = estimateRevenue(read());
    form.querySelector('[data-result]')!.textContent = `${formatCurrency(r.monthly.total, 'USD')} / month`;
    form.querySelector('[data-subresult]')!.textContent = `≈ ${formatCurrency(r.annual.total, 'USD')} / year · ${formatCurrency(r.hourlyEquivalent, 'USD')}/hr (${r.minWageMultiple.toFixed(1)}× min wage)`;
  };
  form.addEventListener('input', render);
  render();
</script>
<style>
  .revenue-calc { max-width:560px; margin:0 auto; display:flex; flex-direction:column; gap:1rem; }
  fieldset { border:1px solid var(--color-border); border-radius:8px; padding:1rem; display:grid; grid-template-columns:1fr 1fr; gap:.75rem; }
  legend { font-weight:600; padding:0 .5rem; }
  label { display:flex; flex-direction:column; font-size:.85rem; color:var(--color-text-muted); gap:.25rem; }
  input, select { height:40px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface-2); color:var(--color-text); font-family:var(--font-mono); padding:0 .5rem; }
  .result { font-family:var(--font-mono); font-size:1.75rem; color:var(--color-accent); }
  .sub { color:var(--color-text-muted); font-size:.9rem; }
</style>
```

- [ ] **Step 8: Create `src/pages/twitch-revenue-calculator.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import RevenueCalculator from '../components/calculators/RevenueCalculator.astro';
import { revenueFaqs } from '../data/faqs';
---
<ToolLayout
  title="Twitch Revenue Calculator"
  description="Estimate monthly and annual Twitch earnings from subs, Bits, and ads. Compare to minimum wage by the hour."
  slug="twitch-revenue-calculator"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: '/twitch-revenue-calculator' }]}
  faqs={revenueFaqs}
>
  <RevenueCalculator />
</ToolLayout>
```

- [ ] **Step 9: Verify build + tests**

Run: `npm run build && npm test`
Expected: Build succeeds; all tests pass.

- [ ] **Step 10: Commit**

```bash
git add src/data/subConfig.ts src/data/adConfig.ts src/lib/calculators/revenue.ts src/components/calculators/RevenueCalculator.astro src/pages/twitch-revenue-calculator.astro tests/calculators.test.ts
git commit -m "feat: Twitch revenue calculator (subs+bits+ads)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 13: TikTok coin calculator

**Files:**
- Create: `src/data/coinConfig.ts`, `src/lib/calculators/tiktok.ts`, `src/components/calculators/TiktokCalculator.astro`, `src/pages/tiktok-coins-to-usd.astro`
- Test: append to `tests/calculators.test.ts`

**Interfaces:**
- Consumes: `LinearConverter.astro`; `tiktokFaqs`.
- Produces: `coinsToUsd`, `usdToCoins`, `coinsBulkTable`; `/tiktok-coins-to-usd`.

- [ ] **Step 1: Append failing test**

```ts
import { coinsToUsd, diamondsToUsd, usdToCoins } from '../src/lib/calculators/tiktok';

describe('tiktok calculator', () => {
  it('converts coins to USD at the creator payout rate', () => {
    // 1 coin ≈ $0.0105 viewer cost; creator earns ~half via diamonds.
    expect(coinsToUsd(1000)).toBeGreaterThan(0);
    expect(usdToCoins(coinsToUsd(1000))).toBe(1000);
  });
  it('diamonds to USD', () => {
    expect(diamondsToUsd(1000)).toBeCloseTo(5, 0); // ~$0.005/diamond
  });
  it('guards bad input', () => {
    expect(coinsToUsd(-1)).toBe(0);
    expect(diamondsToUsd(NaN)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/calculators.test.ts`
Expected: FAIL — cannot find `../src/lib/calculators/tiktok`.

- [ ] **Step 3: Create `src/data/coinConfig.ts`**

```ts
export const COIN_TO_USD = 0.0105;        // viewer purchase value per coin (approx)
export const COIN_TO_DIAMOND = 0.5;        // 2 coins → 1 diamond for the creator
export const DIAMOND_TO_USD = 0.005;       // creator payout per diamond
export const COIN_BULK = [100, 500, 1000, 5000, 10000, 50000];
```

- [ ] **Step 4: Create `src/lib/calculators/tiktok.ts`**

```ts
import { COIN_TO_USD, DIAMOND_TO_USD, COIN_BULK } from '../../data/coinConfig';

export function coinsToUsd(coins: number): number {
  if (!Number.isFinite(coins) || coins < 0) return 0;
  return coins * COIN_TO_USD;
}
export function usdToCoins(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd / COIN_TO_USD);
}
export function diamondsToUsd(diamonds: number): number {
  if (!Number.isFinite(diamonds) || diamonds < 0) return 0;
  return diamonds * DIAMOND_TO_USD;
}
export function coinsBulkTable(rows: number[] = COIN_BULK) {
  return rows.map((coins) => ({ bits: coins, usd: coinsToUsd(coins) }));
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/calculators.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `src/components/calculators/TiktokCalculator.astro`**

```astro
---
import LinearConverter from './LinearConverter.astro';
import { coinsToUsd, usdToCoins, coinsBulkTable } from '../../lib/calculators/tiktok';
import { COIN_BULK } from '../../data/coinConfig';
---
<LinearConverter config={{
  tool: 'tiktok', unitName: 'TikTok Coins', paramKey: 'coins',
  toUsd: coinsToUsd, fromUsd: usdToCoins,
  bulkRows: COIN_BULK, toBulkRows: (rows) => coinsBulkTable(rows),
}} />
```

- [ ] **Step 7: Create `src/pages/tiktok-coins-to-usd.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import TiktokCalculator from '../components/calculators/TiktokCalculator.astro';
import { tiktokFaqs } from '../data/faqs';
---
<ToolLayout
  title="TikTok Coins to USD Calculator"
  description="Convert TikTok coins and diamonds to USD. See what creators earn from gifts after TikTok's cut."
  slug="tiktok-coins-to-usd"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'TikTok Tools', url: '/tiktok-coins-to-usd' }]}
  faqs={tiktokFaqs}
>
  <TiktokCalculator />
</ToolLayout>
```

- [ ] **Step 8: Verify build + tests**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/data/coinConfig.ts src/lib/calculators/tiktok.ts src/components/calculators/TiktokCalculator.astro src/pages/tiktok-coins-to-usd.astro tests/calculators.test.ts
git commit -m "feat: TikTok coins to USD calculator

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 14: YouTube money calculator

**Files:**
- Create: `src/data/youtubeConfig.ts`, `src/lib/calculators/youtube.ts`, `src/components/calculators/YoutubeCalculator.astro`, `src/pages/youtube-money-calculator.astro`
- Test: append to `tests/calculators.test.ts`

**Interfaces:**
- Consumes: `youtubeFaqs`; `ToolLayout`.
- Produces: `earningsFromViews`, `rangeFromRpm`; `/youtube-money-calculator`.

- [ ] **Step 1: Append failing test**

```ts
import { earningsFromViews, rangeFromRpm } from '../src/lib/calculators/youtube';

describe('youtube calculator', () => {
  it('earnings = rpm * views / 1000', () => {
    expect(earningsFromViews(10_000, 4)).toBe(40);
  });
  it('returns a low–high range from rpm bounds', () => {
    const r = rangeFromRpm(10_000, 2, 8);
    expect(r.low).toBe(20);
    expect(r.high).toBe(80);
  });
  it('guards bad input', () => {
    expect(earningsFromViews(-1, 4)).toBe(0);
    expect(earningsFromViews(1000, NaN)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/calculators.test.ts`
Expected: FAIL — cannot find `../src/lib/calculators/youtube`.

- [ ] **Step 3: Create `src/data/youtubeConfig.ts`**

```ts
export const RPM_BY_NICHE = [
  { label: 'Gaming', low: 1, high: 4 },
  { label: 'Vlogs / lifestyle', low: 2, high: 6 },
  { label: 'Tech / finance', low: 6, high: 18 },
  { label: 'Education', low: 4, high: 12 },
] as const;
export const DEFAULT_RPM = { low: 2, high: 8 };
```

- [ ] **Step 4: Create `src/lib/calculators/youtube.ts`**

```ts
export function earningsFromViews(views: number, rpm: number): number {
  if (!Number.isFinite(views) || !Number.isFinite(rpm) || views < 0 || rpm < 0) return 0;
  return (views / 1000) * rpm;
}
export function rangeFromRpm(views: number, low: number, high: number) {
  return { low: earningsFromViews(views, low), high: earningsFromViews(views, high), mid: earningsFromViews(views, (low + high) / 2) };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run tests/calculators.test.ts`
Expected: PASS.

- [ ] **Step 6: Create `src/components/calculators/YoutubeCalculator.astro`**

```astro
---
import { RPM_BY_NICHE, DEFAULT_RPM } from '../../data/youtubeConfig';
import { formatCurrency } from '../../lib/format';
---
<form class="yt-calc" data-tool="youtube">
  <label>Monthly views<input type="number" min="0" data-views value="50000"/></label>
  <label>Niche
    <select data-niche>
      {RPM_BY_NICHE.map((n, i) => <option value={i} selected={i === 1}>{n.label}</option>)}
    </select>
  </label>
  <div class="result" data-result aria-live="polite">$0 – $0 / month</div>
</form>
<script>
  import { rangeFromRpm } from '../../lib/calculators/youtube';
  import { RPM_BY_NICHE, DEFAULT_RPM } from '../../data/youtubeConfig';
  import { formatCurrency } from '../../lib/format';
  const form = document.querySelector('[data-tool="youtube"]') as HTMLFormElement;
  const render = () => {
    const views = Number((form.querySelector('[data-views]') as HTMLInputElement)?.value || 0);
    const niche = Number((form.querySelector('[data-niche]') as HTMLSelectElement)?.value || 0);
    const bounds = RPM_BY_NICHE[niche] ?? DEFAULT_RPM;
    const r = rangeFromRpm(views, bounds.low, bounds.high);
    form.querySelector('[data-result]')!.textContent = `${formatCurrency(r.low, 'USD')} – ${formatCurrency(r.high, 'USD')} / month`;
  };
  form.addEventListener('input', render);
  render();
</script>
<style>
  .yt-calc { max-width:480px; margin:0 auto; display:flex; flex-direction:column; gap:1rem; background:var(--color-surface); border:1px solid var(--color-border); border-radius:12px; padding:1.25rem; }
  label { display:flex; flex-direction:column; font-size:.85rem; color:var(--color-text-muted); gap:.25rem; }
  input, select { height:44px; border-radius:6px; border:1px solid var(--color-border); background:var(--color-surface-2); color:var(--color-text); font-family:var(--font-mono); }
  .result { font-family:var(--font-mono); font-size:1.5rem; color:var(--color-accent); }
</style>
```

- [ ] **Step 7: Create `src/pages/youtube-money-calculator.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import YoutubeCalculator from '../components/calculators/YoutubeCalculator.astro';
import { youtubeFaqs } from '../data/faqs';
---
<ToolLayout
  title="YouTube Money Calculator"
  description="Estimate YouTube earnings from RPM × views across niches. See a realistic low–high monthly range."
  slug="youtube-money-calculator"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'YouTube Tools', url: '/youtube-money-calculator' }]}
  faqs={youtubeFaqs}
>
  <YoutubeCalculator />
</ToolLayout>
```

- [ ] **Step 8: Verify build + tests**

Run: `npm run build && npm test`
Expected: PASS.

- [ ] **Step 9: Commit**

```bash
git add src/data/youtubeConfig.ts src/lib/calculators/youtube.ts src/components/calculators/YoutubeCalculator.astro src/pages/youtube-money-calculator.astro tests/calculators.test.ts
git commit -m "feat: YouTube money calculator with niche RPM ranges

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 15: Programmatic SEO variant pages (region + pack-size)

**Files:**
- Create: `src/pages/twitch-bits-to-gbp.astro`, `twitch-bits-to-eur.astro`, `twitch-bits-to-cad.astro`, `twitch-bits-to-aud.astro`, `how-much-is-1000-bits-on-twitch.astro`, `how-much-is-10000-bits-on-twitch.astro`

**Interfaces:**
- Consumes: `LinearConverter`, `bitsFaqs`, `bitsToUsd`/`usdToBits`/`bulkTable`, `REGIONS`, `BULK_TABLE`.

- [ ] **Step 1: Create `src/pages/twitch-bits-to-gbp.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import LinearConverter from '../components/calculators/LinearConverter.astro';
import { bitsToUsd, usdToBits, bulkTable } from '../lib/calculators/bits';
import { BULK_TABLE, VIEWER_PACKS, REGIONS } from '../data/bitsConfig';
import { bitsFaqs } from '../data/faqs';
const region = REGIONS.gb;
---
<ToolLayout
  title="Twitch Bits to GBP Calculator"
  description={`Convert Twitch Bits to British Pounds (GBP). See streamer payout and viewer cost at the ${region.rate}:1 USD rate.`}
  slug="twitch-bits-to-gbp"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: '/twitch-bits-to-gbp' }]}
  faqs={bitsFaqs('gb')}
>
  <LinearConverter config={{
    tool: 'bits', unitName: 'Bits', paramKey: 'bits', region: 'gb', currency: 'GBP',
    toUsd: (n) => bitsToUsd(n, 'gb'), fromUsd: (u) => usdToBits(u, 'gb'),
    bulkRows: BULK_TABLE, toBulkRows: (rows) => bulkTable(rows, 'gb'),
    viewerContext: { perUnitCostUsd: VIEWER_PACKS[0].perBitUsd, label: 'Viewer pays' },
  }} />
</ToolLayout>
```

- [ ] **Step 2: Create the EUR, CAD, AUD variants** — duplicate the GBP file, changing: filename, `region` (`eu`/`ca`/`au`), `title`/`description` currency name, `slug`, `crumbs` URL, and the `region:`/`currency:`/`bitsFaqs(...)` args to match. (EUR → `eur`/`EUR`, CAD → `ca`/`CAD`, AUD → `au`/`AUD`.)

For `twitch-bits-to-eur.astro`: `region = REGIONS.eu`, title "Twitch Bits to EUR Calculator", currency `EUR`, `bitsFaqs('eu')`, slug `twitch-bits-to-eur`.
For `twitch-bits-to-cad.astro`: `region = REGIONS.ca`, "Twitch Bits to CAD Calculator", `CAD`, `bitsFaqs('ca')` (use `'eu'` fallback in faqs if `ca` not a faq region — faqs only branch on `us` vs non-`us`, so any region arg works), slug `twitch-bits-to-cad`.
For `twitch-bits-to-aud.astro`: `region = REGIONS.au`, "Twitch Bits to AUD Calculator", `AUD`, slug `twitch-bits-to-aud`.

- [ ] **Step 3: Create `src/pages/how-much-is-1000-bits-on-twitch.astro`**

```astro
---
import ToolLayout from '../layouts/ToolLayout.astro';
import LinearConverter from '../components/calculators/LinearConverter.astro';
import { bitsToUsd, usdToBits, bulkTable } from '../lib/calculators/bits';
import { BULK_TABLE, VIEWER_PACKS } from '../data/bitsConfig';
import { bitsFaqs } from '../data/faqs';
---
<ToolLayout
  title="How Much Is 1000 Bits on Twitch?"
  description="1000 Bits on Twitch equals $10.00 USD for the streamer. See the full breakdown, viewer cost, and bulk reference table."
  slug="how-much-is-1000-bits-on-twitch"
  crumbs={[{ name: 'Home', url: '/' }, { name: 'Twitch Tools', url: '/how-much-is-1000-bits-on-twitch' }]}
  faqs={bitsFaqs('us')}
>
  <LinearConverter config={{
    tool: 'bits', unitName: 'Bits', paramKey: 'bits',
    toUsd: bitsToUsd, fromUsd: usdToBits, defaultAmount: 1000,
    bulkRows: BULK_TABLE, toBulkRows: (rows) => bulkTable(rows),
    viewerContext: { perUnitCostUsd: VIEWER_PACKS[0].perBitUsd, label: 'Viewer pays' },
  }} />
</ToolLayout>
```

- [ ] **Step 4: Create `src/pages/how-much-is-10000-bits-on-twitch.astro`** — identical to the 1000 page but `defaultAmount: 10000`, title "How Much Is 10000 Bits on Twitch?", description "10000 Bits on Twitch equals $100.00 USD...", slug `how-much-is-10000-bits-on-twitch`.

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds; `dist/twitch-bits-to-gbp/index.html` etc. exist.

- [ ] **Step 6: Commit**

```bash
git add src/pages/twitch-bits-to-*.astro src/pages/how-much-is-*-bits-on-twitch.astro
git commit -m "feat: programmatic region + pack-size Bits variants

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 16: Blog — content collection + 3 posts + index/slug pages

**Files:**
- Create: `src/content/config.ts`, `src/content/blog/twitch-bits-to-usd-2026-guide.md`, `src/content/blog/bits-vs-subs-vs-ads.md`, `src/content/blog/tiktok-coins-vs-twitch-bits.md`, `src/layouts/BlogLayout.astro`, `src/pages/blog/index.astro`, `src/pages/blog/[...slug].astro`

**Interfaces:**
- Consumes: `BaseLayout`.
- Produces: `/blog` index + `/blog/<slug>` posts with `Article` + `Breadcrumb` schema.

- [ ] **Step 1: Create `src/content/config.ts`**

```ts
import { defineCollection, z } from 'astro:content';
const blog = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
  }),
});
export const collections = { blog };
```

- [ ] **Step 2: Create `src/layouts/BlogLayout.astro`**

```astro
---
import BaseLayout from './BaseLayout.astro';
import { buildBreadcrumbSchema } from '../lib/schema';
interface Props { title: string; description: string; pubDate: Date; slug: string; }
const { title, description, pubDate, slug } = Astro.props;
const crumbs = [{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog' }, { name: title, url: `/blog/${slug}` }];
const article = {
  '@context': 'https://schema.org', '@type': 'Article',
  headline: title, description, datePublished: pubDate.toISOString(),
  url: `https://twitchbits-calc.com/blog/${slug}`,
};
---
<BaseLayout title={title} description={description} jsonLd={[article, buildBreadcrumbSchema(crumbs)]}>
  <article class="post">
    <nav class="crumbs"><a href="/">Home</a> › <a href="/blog">Blog</a> › <span>{title}</span></nav>
    <h1>{title}</h1>
    <time datetime={pubDate.toISOString()}>{pubDate.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</time>
    <div class="prose"><slot /></div>
  </article>
</BaseLayout>
<style>
  .post { max-width:680px; margin:0 auto; }
  .prose :global(p) { line-height:1.7; color:var(--color-text); margin:1rem 0; }
  .prose :global(h2) { margin-top:2rem; }
  .crumbs { font-size:.8rem; color:var(--color-text-muted); margin-bottom:1rem; }
  time { color:var(--color-text-muted); font-size:.85rem; }
</style>
```

- [ ] **Step 3: Create `src/content/blog/twitch-bits-to-usd-2026-guide.md`**

```markdown
---
title: "Twitch Bits to USD: The 2026 Guide for New Streamers"
description: "How Bits work, what streamers earn per Bit, viewer pricing, and how to estimate Bits revenue in 2026."
pubDate: 2026-07-19
---
Bits are Twitch's virtual currency. Viewers buy them and cheer them in chat to support streamers. Here's what you actually keep.

## How much do streamers make per Bit?
Streamers receive **$0.01 per Bit** — 100% of the Bits value. 1,000 Bits = $10. This rate is the same for Affiliates and Partners.

## What do viewers pay?
Viewers pay a premium: roughly **$0.0123–$0.0140 per Bit** depending on pack size. That spread is Twitch's margin.

## Estimating your Bits revenue
Use our [Twitch Bits to USD calculator](/twitch-bits-to-usd) to convert a monthly Bits total into dollars, then combine it with subs and ads in the [revenue calculator](/twitch-revenue-calculator).
```

- [ ] **Step 4: Create `src/content/blog/bits-vs-subs-vs-ads.md`**

```markdown
---
title: "Bits vs Subs vs Ads: Which Earns More for Streamers?"
description: "Compare the three main Twitch revenue streams and learn which to prioritize at different channel sizes."
pubDate: 2026-07-19
---
Twitch creators earn three ways: subscriptions, Bits, and ads. Each scales differently.

## Subscriptions — the foundation
A Tier 1 sub is $4.99/month; on the standard 50/50 split you keep ~$2.50. Recurring and predictable.

## Bits — high-margin tips
You keep 100% of Bits value ($0.01 each). Less predictable, but no platform cut.

## Ads — scales with viewership
Ad revenue = CPM × minutes × viewers. High once you have consistent concurrent viewers.

Run all three through the [Twitch revenue calculator](/twitch-revenue-calculator) to model your mix.
```

- [ ] **Step 5: Create `src/content/blog/tiktok-coins-vs-twitch-bits.md`**

```markdown
---
title: "TikTok Coins vs Twitch Bits: Creator Economics Compared"
description: "How TikTok coins and Twitch Bits differ in payout rate, platform cut, and creator experience."
pubDate: 2026-07-19
---
Both platforms let viewers pay to support creators, but the economics differ.

## Twitch Bits
Creators keep 100% of the Bits value — $0.01 per Bit.

## TikTok coins
Viewers buy coins; gifts convert to diamonds, worth roughly $0.005 each. TikTok keeps about half.

Compare both with our [TikTok coins calculator](/tiktok-coins-to-usd) and [Twitch Bits calculator](/twitch-bits-to-usd).
```

- [ ] **Step 6: Create `src/pages/blog/index.astro`**

```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';
import { buildBreadcrumbSchema } from '../../lib/schema';
const posts = (await getCollection('blog')).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
---
<BaseLayout title="Blog — Creator Monetization Guides" description="Guides on Twitch, TikTok, and YouTube creator earnings and how to calculate them." jsonLd={buildBreadcrumbSchema([{ name: 'Home', url: '/' }, { name: 'Blog', url: '/blog' }])}>
  <h1>Creator monetization guides</h1>
  <ul class="posts">
    {posts.map((p) => (
      <li><a href={`/blog/${p.slug}`}><strong>{p.data.title}</strong><span>{p.data.description}</span></a></li>
    ))}
  </ul>
</BaseLayout>
<style>
  .posts { list-style:none; padding:0; display:flex; flex-direction:column; gap:1rem; }
  .posts a { display:flex; flex-direction:column; gap:.25rem; color:var(--color-text); text-decoration:none; padding:1rem; border:1px solid var(--color-border); border-radius:8px; }
  .posts a:hover { border-color:var(--color-accent); }
  .posts span { color:var(--color-text-muted); font-size:.9rem; }
</style>
```

- [ ] **Step 7: Create `src/pages/blog/[...slug].astro`**

```astro
---
import BlogLayout from '../../layouts/BlogLayout.astro';
import { getCollection, render } from 'astro:content';
export async function getStaticPaths() {
  const posts = await getCollection('blog');
  return posts.map((post) => ({ params: { slug: post.slug }, props: { post } }));
}
const { post } = Astro.props;
const { Content } = await render(post);
---
<BlogLayout title={post.data.title} description={post.data.description} pubDate={post.data.pubDate} slug={post.slug}>
  <Content />
</BlogLayout>
```

- [ ] **Step 8: Verify build**

Run: `npm run build`
Expected: Build succeeds; `dist/blog/index.html` and `dist/blog/<slug>/index.html` exist.

- [ ] **Step 9: Commit**

```bash
git add src/content src/layouts/BlogLayout.astro src/pages/blog
git commit -m "feat: blog content collection + 3 cornerstone posts

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 17: Legal pages + 404

**Files:**
- Create: `src/pages/affiliate-disclosure.astro`, `src/pages/privacy.astro`, `src/pages/terms.astro`, `src/pages/404.astro`
- Modify: `src/data/affiliateLinks.ts` (wire the real Streamlabs link placeholder note — left as-is; real link added by user)

**Interfaces:**
- Consumes: `AFFILIATES` from `affiliateLinks.ts`; `BaseLayout`; `SITE`.

- [ ] **Step 1: Create `src/pages/affiliate-disclosure.astro`** (auto-renders from config)

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { AFFILIATES } from '../data/affiliateLinks';
import { SITE } from '../lib/site';
const programs = Object.values(AFFILIATES);
const today = new Date().toISOString().slice(0, 10);
---
<BaseLayout title="Affiliate Disclosure" description="How this site earns money through affiliate links." noindex>
  <article class="legal">
    <h1>Affiliate Disclosure</h1>
    <p>Last updated: {today}</p>
    <p>{SITE.name} participates in affiliate programs. When you click certain links and make a purchase or sign up, we may earn a commission at no extra cost to you.</p>
    <h2>Programs</h2>
    <ul>
      {programs.map((p) => (
        <li><strong>{p.label}</strong> — {p.disclosure}</li>
      ))}
    </ul>
    <p>Calculators and content are estimates and not financial advice.</p>
  </article>
</BaseLayout>
<style>
  .legal { max-width:680px; margin:0 auto; }
</style>
```

- [ ] **Step 2: Create `src/pages/privacy.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE } from '../lib/site';
---
<BaseLayout title="Privacy Policy" description={`${SITE.name} privacy policy — cookieless analytics, no personal data collected.`} noindex>
  <article class="legal">
    <h1>Privacy Policy</h1>
    <p>{SITE.name} uses Cloudflare Web Analytics, which is cookieless and does not collect personal data.</p>
    <p>Shareable calculator URLs use query parameters (e.g. <code>?bits=1000</code>) that stay in your browser and are not stored server-side — we have no backend.</p>
    <p>If you join the email waitlist via Tally.so, your email is processed by Tally under their privacy policy.</p>
    <p>We do not sell data. Contact us via the repository for any privacy questions.</p>
  </article>
</BaseLayout>
<style>
  .legal { max-width:680px; margin:0 auto; }
</style>
```

- [ ] **Step 3: Create `src/pages/terms.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { SITE } from '../lib/site';
---
<BaseLayout title="Terms of Use" description={`Terms of use for ${SITE.name}.`} noindex>
  <article class="legal">
    <h1>Terms of Use</h1>
    <p>All calculators on {SITE.name} provide estimates for informational purposes only and are not financial advice.</p>
    <p>Platform rates (Twitch, TikTok, YouTube) change over time; we update our data periodically but make no guarantee of real-time accuracy.</p>
    <p>Use of affiliate links is optional and never affects calculator results.</p>
    <p>By using this site you accept these terms as-is.</p>
  </article>
</BaseLayout>
<style>
  .legal { max-width:680px; margin:0 auto; }
</style>
```

- [ ] **Step 4: Create `src/pages/404.astro`**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { TOOLS } from '../lib/site';
---
<BaseLayout title="Page not found" description="The page you're looking for doesn't exist." noindex>
  <section style="max-width:560px;margin:0 auto;text-align:center;padding:2rem 0;">
    <h1>404</h1>
    <p>That page doesn't exist. Try one of our calculators:</p>
    <ul style="list-style:none;padding:0;display:flex;flex-direction:column;gap:.5rem;">
      {TOOLS.map((t) => <li><a href={`/${t.slug}`}>{t.name}</a></li>)}
    </ul>
  </section>
</BaseLayout>
```

- [ ] **Step 5: Verify build**

Run: `npm run build`
Expected: Build succeeds; legal + 404 pages emitted.

- [ ] **Step 6: Commit**

```bash
git add src/pages/affiliate-disclosure.astro src/pages/privacy.astro src/pages/terms.astro src/pages/404.astro
git commit -m "feat: affiliate disclosure, privacy, terms, 404

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 18: Hub homepage + analytics + CLAUDE.md + add-tool skill + Lighthouse

**Files:**
- Modify: `src/pages/index.astro` (full hub landing), `src/components/layout/Base.astro` (add Cloudflare Web Analytics)
- Create: `src/components/Newsletter.astro`, `CLAUDE.md`, `.claude/skills/add-calculator-tool/SKILL.md`, `public/og-default.png` (text note — actual image is a design asset)

**Interfaces:**
- Consumes: `TOOLS`, `SITE`; blog collection (latest posts); `BaseLayout`.

- [ ] **Step 1: Create `src/components/Newsletter.astro`** (Tally embed placeholder)

```astro
---
// Replace data-tally-src with your Tally form URL when created.
---
<aside class="newsletter" aria-label="Newsletter signup">
  <h2>Get new creator tools + monetization tips</h2>
  <p>Occasional emails. No spam. Unsubscribe anytime.</p>
  <iframe src="about:blank" data-tally-src="https://tally.so/embed/REPLACE" loading="lazy" width="100%" height="240" frameborder="0" marginheight="0" marginwidth="0" title="Newsletter"></iframe>
</aside>
<style>
  .newsletter { margin-top:2rem; padding:1.25rem; border:1px solid var(--color-border); border-radius:8px; background:var(--color-surface); }
</style>
```

- [ ] **Step 2: Replace `src/pages/index.astro` with the full hub landing**

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import Newsletter from '../components/Newsletter.astro';
import { TOOLS, SITE } from '../lib/site';
import { getCollection } from 'astro:content';
import { buildOrganizationSchema, buildWebSiteSchema } from '../lib/schema';
const posts = (await getCollection('blog')).sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf()).slice(0, 3);
const jsonLd = [buildOrganizationSchema(), buildWebSiteSchema()];
---
<BaseLayout title={`${SITE.name} — ${SITE.tagline}`} description="Free calculators for Twitch Bits, Twitch revenue, TikTok coins, and YouTube money. Know exactly what you earn." jsonLd={jsonLd}>
  <section class="hero">
    <h1>Free creator-economy calculators</h1>
    <p class="sub">Know exactly what you earn — Twitch, TikTok, and YouTube.</p>
    <a class="hero-cta" href="/twitch-bits-to-usd">Twitch Bits → USD →</a>
  </section>
  <section class="tools" aria-label="Calculators">
    <div class="grid">
      {TOOLS.map((t) => (
        <a class="card" href={`/${t.slug}`}><strong>{t.name}</strong><span>{t.desc}</span></a>
      ))}
    </div>
  </section>
  <section class="latest">
    <h2>Latest guides</h2>
    <ul>
      {posts.map((p) => <li><a href={`/blog/${p.slug}`}>{p.data.title}</a></li>)}
    </ul>
  </section>
  <Newsletter />
</BaseLayout>
<style>
  .hero { text-align:center; padding:2rem 0; }
  .hero h1 { font-size:2rem; }
  .sub { color:var(--color-text-muted); }
  .hero-cta { display:inline-block; margin-top:1rem; padding:.75rem 1.5rem; background:var(--color-accent); color:#fff; border-radius:8px; text-decoration:none; }
  .grid { display:grid; grid-template-columns:1fr; gap:.75rem; }
  @media (min-width:720px){ .grid { grid-template-columns:repeat(2,1fr); } }
  .card { display:flex; flex-direction:column; gap:.25rem; padding:1.25rem; border:1px solid var(--color-border); border-radius:10px; background:var(--color-surface); text-decoration:none; color:var(--color-text); }
  .card:hover { border-color:var(--color-accent); }
  .latest { margin-top:2rem; }
  .latest ul { list-style:none; padding:0; display:flex; flex-direction:column; gap:.5rem; }
</style>
```

- [ ] **Step 3: Add Cloudflare Web Analytics to `src/components/layout/Base.astro`** — append before the closing of the component (after the JSON-LD map):

```astro
<!-- Cloudflare Web Analytics (cookieless, first-party CDN) -->
<script is:inline defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"REPLACE_WITH_CLOUDFLARE_TOKEN"}' />
```

(Replace `REPLACE_WITH_CLOUDFLARE_TOKEN` with the token from Cloudflare → Web Analytics → your site, after the domain is added. The script is `defer` so it never blocks render.)

**SRI note (deliberate omission):** This beacon is *not* pinned with `integrity="sha384-..."`. We'd normally add SRI to any external script to block CDN-compromise attacks, but Cloudflare does not publish a stable integrity hash for `beacon.min.js` and the URL isn't versioned — pinning a hash would silently break analytics on Cloudflare's next silent update. Acceptable here because (a) it's Cloudflare's own first-party CDN, (b) the script carries no auth/session data (cookieless, token-only), and (c) it's `defer`-loaded after paint so a compromised beacon can't block rendering. If you later switch to a versioned, hash-publishing provider (e.g. Plausible self-host), add `integrity` + `crossorigin="anonymous"` at that time. The Tally `<iframe>` in `Newsletter.astro` is sandboxed content loaded `lazy` — no script tag, so SRI doesn't apply.

- [ ] **Step 4: Create `public/og-default.png`** — generate a 1200×630 branded image (Twitch-purple background, white "Twitch Bits Calculator" wordmark). If no image tool is available, create a placeholder note file `public/og-default.txt` describing the asset and leave `og-default.png` as a TODO for a design pass; the site still builds (OG image is referenced but its absence only affects social previews).

- [ ] **Step 5: Create `CLAUDE.md`**

````markdown
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
\`\`\`bash
npm run dev        # http://localhost:4321
npm run build      # -> dist/
npm run preview
npm test           # vitest (pure functions)
npm run lint       # prettier + eslint
\`\`\`

## Branch
Work on `build/twitch-bits-hub` (default branch is `develop`). Don't push a red build.

## Adding a new calculator tool or programmatic variant
See `.claude/skills/add-calculator-tool/SKILL.md`.

## Docs
- Design: `docs/superpowers/specs/2026-07-19-twitch-bits-hub-design.md`
- Plan: `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md`
- Research: `../research-engine/output/2026-07-19/twitch-bits-calculator-build-plan-DEEP.md`
````

- [ ] **Step 6: Create `.claude/skills/add-calculator-tool/SKILL.md`**

````markdown
---
name: add-calculator-tool
description: Add a new calculator tool or programmatic-SEO variant to the Twitch Bits Hub, following the data→pure-fn→component→page pattern. Use when extending the hub.
---

# Add a Calculator Tool / Variant

Follow this exact order. Never hardcode rates in a component.

## 1. Data — `src/data/<thing>Config.ts`
Export typed constants (rate, bulk rows, region overrides if relevant). Rates only here.

## 2. Pure function — `src/lib/calculators/<thing>.ts`
Export `<thing>ToUsd` / `usdTo<Thing>` / `<thing>BulkTable`. Input guards: `NaN`/negative/`Infinity` → 0. No DOM, no Astro.

## 3. Tests — append to `tests/calculators.test.ts`
TDD: write the test, watch it fail, implement, watch it pass. Add a `.toMatchSnapshot()` on a representative input.

## 4. Component — `src/components/calculators/<Thing>Calculator.astro`
- If it's a linear unit converter (1 input, 1 rate, dual-direction): reuse `LinearConverter.astro`, pass a config with `tool`, `unitName`, `paramKey`, `toUsd`, `fromUsd`, `bulkRows`, `toBulkRows`. Also add the tool string to the function-resolution map in `LinearConverter.astro`'s `<script>`.
- If multi-input: write a bespoke component with its own inline `<script>` calling the pure function, like `RevenueCalculator.astro`.

## 5. FAQ — `src/data/faqs.ts`
Add an exported array of 5–8 `{ q, a }` items. This single source feeds both the visible FAQ and `FAQPage` schema.

## 6. Page — `src/pages/<slug>.astro`
Wrap in `ToolLayout` with `title`, `description`, `slug`, `crumbs`, `faqs`. `ToolLayout` auto-adds `WebApplication` + `Breadcrumb` schema and renders `RelatedTools` + `AffiliateCTA`.

## 7. Wire internal links
Add the tool to `TOOLS` in `src/lib/site.ts` so it appears in the Tools dropdown, the hub homepage grid, and `RelatedTools` on other calculators.

## 8. Verify
`npm run build && npm test`. Smoke-test the live page. Commit.

## Programmatic variants (region/pack-size)
Skip steps 1–2 (reuse existing data + pure fns). Create only the page in step 6, passing `region`/`currency`/`defaultAmount` to `LinearConverter`. Add region-specific FAQ phrasing via the region arg to the faqs function.
````

- [ ] **Step 7: Verify build + all tests**

Run: `npm run build && npm test`
Expected: Build succeeds; all tests pass; `/`, all tool pages, blog, legal pages emit.

- [ ] **Step 8: Lighthouse check (manual)**

Run: `npm run preview &` then run Lighthouse against `http://localhost:4321/twitch-bits-to-usd` (via browser DevTools or `npx lighthouse http://localhost:4321/twitch-bits-to-usd --view`).
Expected: Performance ≥ 95, LCP < 1.2s, TBT < 50ms, Accessibility ≥ 95. If a target misses, the usual fixes: ensure analytics script is `defer`, no inline render-blocking JS beyond `ThemeScript`, images lazy. Kill the preview server.

- [ ] **Step 9: Commit**

```bash
git add src/pages/index.astro src/components/Newsletter.astro src/components/layout/Base.astro CLAUDE.md .claude/skills/add-calculator-tool/SKILL.md public/og-default.txt 2>/dev/null || true
git add -A
git commit -m "feat: hub homepage, newsletter, analytics, CLAUDE.md, add-tool skill

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Self-Review (run after all tasks)

- [ ] **Spec coverage check:** Every spec section maps to a task: architecture/structure (Tasks 1–3), data model (4, 9 stub, 12–14), components (6–8, 12–14), pages/SEO/schema (3, 9–10, 15–17), UI/UX design system (Tasks 2, 6, 8 via tokens + primitive specs), monetization/legal/analytics/deploy (11, 17, 18), testing (every calc task + plan-wide `npm test`), Claude docs/skills (11, 18). Gaps: none.
- [ ] **Type consistency:** `LinearConfig` fields (`tool`, `unitName`, `paramKey`, `toUsd`, `fromUsd`, `currency`, `defaultAmount`) match between `calculator-behavior.ts`, `LinearConverter.astro`, and every page that builds a config. `estimateRevenue` return shape matches the component's `r.monthly.total` / `r.annual.total` / `r.hourlyEquivalent` reads. `bitsFaqs(region)` signature matches all call sites.
- [ ] **Placeholder scan:** intentional `REPLACE` markers (Tally URL, Cloudflare token, Streamlabs Impact link, og image) are documented as manual user-supplied values in the steps that introduce them — not plan failures.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-19-twitch-bits-hub.md`. Two execution options:

1. **Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?