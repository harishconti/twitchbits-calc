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
