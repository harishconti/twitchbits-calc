import { describe, it, expect } from "vitest";
import { slugFor } from "./slug";

describe("slugFor", () => {
  it("matches old manual bits-amount slugs", () => {
    expect(slugFor("bitsAmount", 100)).toBe("how-much-is-100-bits-on-twitch");
    expect(slugFor("bitsAmount", 50000)).toBe(
      "how-much-is-50000-bits-on-twitch",
    );
    expect(slugFor("bitsAmount", 100000)).toBe(
      "how-much-is-100000-bits-on-twitch",
    );
  });
  it("matches old manual bits-currency slugs (lowercase ISO code)", () => {
    expect(slugFor("bitsCurrency", "gbp")).toBe("twitch-bits-to-gbp");
    expect(slugFor("bitsCurrency", "inr")).toBe("twitch-bits-to-inr");
    expect(slugFor("bitsCurrency", "jpy")).toBe("twitch-bits-to-jpy");
  });
  it("matches old manual tiktok-amount slugs", () => {
    expect(slugFor("tiktokAmount", 100)).toBe("tiktok-coins-100-to-usd");
    expect(slugFor("tiktokAmount", 1000)).toBe("tiktok-coins-1000-to-usd");
  });
  it("matches old manual youtube-views slugs", () => {
    expect(slugFor("youtubeViews", 1000)).toBe("youtube-money-1000-views");
    expect(slugFor("youtubeViews", 10000)).toBe("youtube-money-10000-views");
  });
});
