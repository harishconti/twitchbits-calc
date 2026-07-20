// Pure email validation + normalization for the newsletter capture flow.
// No DOM, no fetch, no Astro imports, no side effects. Deterministic + sync.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Trim + lowercase. Returns "" for non-strings. Pure. */
export function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

export type EmailValidation =
  | { ok: true; email: string }
  | { ok: false; reason: "empty" | "format" | "length" };

/** Validate + normalize an email. maxLen defaults to 254 (RFC 5321 practical cap). */
export function validateEmail(input: unknown, maxLen = 254): EmailValidation {
  const email = normalizeEmail(input);
  if (email === "") return { ok: false, reason: "empty" };
  if (email.length > maxLen) return { ok: false, reason: "length" };
  if (!EMAIL_REGEX.test(email)) return { ok: false, reason: "format" };
  return { ok: true, email };
}
