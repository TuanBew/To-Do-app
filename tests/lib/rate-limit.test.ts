import { describe, expect, it, vi } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("allows requests up to the limit within the window", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
    expect(rateLimit(key, 3, 60_000)).toBe(true);
  });

  it("blocks the request once the limit is exceeded", () => {
    const key = `test-${Math.random()}`;
    rateLimit(key, 2, 60_000);
    rateLimit(key, 2, 60_000);
    expect(rateLimit(key, 2, 60_000)).toBe(false);
  });

  it("keeps separate buckets per key", () => {
    const keyA = `a-${Math.random()}`;
    const keyB = `b-${Math.random()}`;
    rateLimit(keyA, 1, 60_000);
    expect(rateLimit(keyA, 1, 60_000)).toBe(false);
    expect(rateLimit(keyB, 1, 60_000)).toBe(true);
  });

  it("allows requests again once the window has elapsed", () => {
    vi.useFakeTimers();
    try {
      const key = `test-${Math.random()}`;
      expect(rateLimit(key, 1, 1_000)).toBe(true);
      expect(rateLimit(key, 1, 1_000)).toBe(false);
      vi.advanceTimersByTime(1_001);
      expect(rateLimit(key, 1, 1_000)).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});
