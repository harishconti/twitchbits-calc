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
