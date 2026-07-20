import { describe, expect, it } from "vitest";
import {
  validateEmail,
  normalizeEmail,
} from "../src/lib/newsletter/validateEmail";
import { subscriberKey, shortHash } from "../src/lib/newsletter/keys";

describe("normalizeEmail", () => {
  it("trims + lowercases", () => {
    expect(normalizeEmail("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
  it("returns empty for non-strings", () => {
    expect(normalizeEmail(undefined)).toBe("");
    expect(normalizeEmail(null)).toBe("");
    expect(normalizeEmail(123)).toBe("");
  });
  it("returns empty for empty/whitespace", () => {
    expect(normalizeEmail("   ")).toBe("");
  });
});

describe("validateEmail", () => {
  it("accepts a normal email", () => {
    expect(validateEmail("  Foo@Bar.COM ")).toEqual({
      ok: true,
      email: "foo@bar.com",
    });
  });
  it("rejects empty", () => {
    expect(validateEmail("")).toEqual({ ok: false, reason: "empty" });
    expect(validateEmail("   ")).toEqual({ ok: false, reason: "empty" });
  });
  it("rejects missing @", () => {
    expect(validateEmail("foo.bar.com")).toEqual({
      ok: false,
      reason: "format",
    });
  });
  it("rejects no dot in domain", () => {
    expect(validateEmail("foo@bar")).toEqual({ ok: false, reason: "format" });
  });
  it("rejects spaces", () => {
    expect(validateEmail("foo @bar.com")).toEqual({
      ok: false,
      reason: "format",
    });
  });
  it("rejects too long", () => {
    const long = "x".repeat(250) + "@b.com"; // > 254
    expect(validateEmail(long)).toEqual({ ok: false, reason: "length" });
  });
  it("respects custom maxLen", () => {
    expect(validateEmail("a@b.co", 3)).toEqual({ ok: false, reason: "length" });
  });
});

describe("subscriberKey", () => {
  it("is deterministic for same email+salt", async () => {
    const a = await subscriberKey("Foo@Bar.com", "salt");
    const b = await subscriberKey("  foo@bar.com  ", "salt");
    expect(a).toBe(b);
  });
  it("changes with salt", async () => {
    const a = await subscriberKey("foo@bar.com", "salt1");
    const b = await subscriberKey("foo@bar.com", "salt2");
    expect(a).not.toBe(b);
  });
  it("changes with email", async () => {
    const a = await subscriberKey("a@b.com", "salt");
    const b = await subscriberKey("c@d.com", "salt");
    expect(a).not.toBe(b);
  });
  it("is prefixed sub: and is 64-char hex", async () => {
    const k = await subscriberKey("foo@bar.com", "salt");
    expect(k.startsWith("sub:")).toBe(true);
    expect(k.slice(4)).toMatch(/^[0-9a-f]{64}$/);
  });
  it("does not leak the email", async () => {
    const k = await subscriberKey("foo@bar.com", "salt");
    expect(k).not.toContain("foo");
    expect(k).not.toContain("bar.com");
  });
});

describe("shortHash", () => {
  it("is deterministic", async () => {
    expect(await shortHash("1.2.3.4", "salt")).toBe(
      await shortHash("1.2.3.4", "salt"),
    );
  });
  it("respects length", async () => {
    expect((await shortHash("x", "s", 8)).length).toBe(8);
  });
  it("changes with salt", async () => {
    expect(await shortHash("x", "s1")).not.toBe(await shortHash("x", "s2"));
  });
});
