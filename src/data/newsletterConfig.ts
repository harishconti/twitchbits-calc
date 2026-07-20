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
