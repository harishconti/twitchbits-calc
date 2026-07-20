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
