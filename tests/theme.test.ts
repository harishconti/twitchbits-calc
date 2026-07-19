import { describe, it, expect, beforeEach } from "vitest";

// theme.ts uses localStorage; in node test we shim it.
const store: Record<string, string> = {};
(globalThis as any).localStorage = {
  getItem: (k: string) => store[k] ?? null,
  setItem: (k: string, v: string) => {
    store[k] = v;
  },
  removeItem: (k: string) => {
    delete store[k];
  },
};
(globalThis as any).document = {
  documentElement: {
    setAttribute: (_k: string, v: string) => {
      store["_theme_attr"] = v;
    },
  },
};

import { getTheme, setTheme, DEFAULT_THEME } from "../src/scripts/theme";

describe("theme", () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  });

  it("defaults to light", () => {
    expect(DEFAULT_THEME).toBe("light");
    expect(getTheme()).toBe("light");
  });

  it("persists a chosen theme", () => {
    setTheme("dark");
    expect(getTheme()).toBe("dark");
    expect(store["theme"]).toBe("dark");
  });
});
