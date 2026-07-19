import { describe, it, expect, vi } from "vitest";

// countUp drives a requestAnimationFrame loop keyed off performance.now().
// We stub rAF (collect callbacks), performance.now() (controllable clock), and
// matchMedia (reduced-motion) so the easing math is deterministic and the loop
// terminates — pumping every frame with a FIXED timestamp would never reach
// p === 1 (start is captured once and is positive), hanging the test.
const rafs: FrameRequestCallback[] = [];
let nowMs = 0;
vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
  rafs.push(cb);
  return 1;
});
vi.stubGlobal("matchMedia", (_q: string) => ({ matches: false }));
vi.stubGlobal("performance", { now: () => nowMs });

import { countUp } from "../src/scripts/calculator-behavior";

describe("countUp", () => {
  it("eases from start to target and terminates on the target", () => {
    rafs.length = 0;
    nowMs = 0;
    const seen: number[] = [];
    countUp(0, 10, 150, (v) => seen.push(v));
    // pump frames, advancing the simulated clock past the 150ms duration
    let guard = 0;
    while (rafs.length && guard < 100) {
      nowMs += 50; // +50ms per frame: 50, 100, 150 → p reaches 1
      const f = rafs.shift()!;
      f(nowMs);
      guard++;
    }
    expect(guard).toBeLessThan(100); // loop terminated (did not runaway)
    expect(seen[seen.length - 1]).toBe(10); // final setter call is exactly the target
  });

  it("jumps straight to target under prefers-reduced-motion (no rAF)", () => {
    vi.stubGlobal("matchMedia", (_q: string) => ({ matches: true }));
    rafs.length = 0;
    const seen: number[] = [];
    countUp(0, 10, 150, (v) => seen.push(v));
    expect(seen).toEqual([10]); // single immediate set
    expect(rafs.length).toBe(0); // no frames queued
    vi.stubGlobal("matchMedia", (_q: string) => ({ matches: false }));
  });
});
