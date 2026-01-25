/**
 * Tests for rate limiter
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter, formatDuration } from "../src/security/rate-limiter";

describe("RateLimiter", () => {
  let rateLimiter: RateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter({
      maxAttempts: 3,
      windowMs: 1000,
      lockoutMs: 5000,
      enabled: true,
    });
  });

  afterEach(() => {
    rateLimiter.stop();
  });

  describe("isRateLimited", () => {
    it("should return false for new identifier", () => {
      expect(rateLimiter.isRateLimited("user1")).toBe(false);
    });

    it("should return false within limit", () => {
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      expect(rateLimiter.isRateLimited("user1")).toBe(false);
    });

    it("should return true when limit exceeded", () => {
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1"); // This exceeds the limit

      expect(rateLimiter.isRateLimited("user1")).toBe(true);
    });
  });

  describe("recordAttempt", () => {
    it("should return true when within limit", () => {
      expect(rateLimiter.recordAttempt("user1")).toBe(true);
      expect(rateLimiter.recordAttempt("user1")).toBe(true);
      expect(rateLimiter.recordAttempt("user1")).toBe(true);
    });

    it("should return false when limit exceeded", () => {
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");

      expect(rateLimiter.recordAttempt("user1")).toBe(false);
    });

    it("should track different identifiers separately", () => {
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");

      // user1 is at limit, but user2 should be fine
      expect(rateLimiter.recordAttempt("user2")).toBe(true);
    });
  });

  describe("reset", () => {
    it("should clear rate limit state for identifier", () => {
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");

      expect(rateLimiter.isRateLimited("user1")).toBe(true);

      rateLimiter.reset("user1");

      expect(rateLimiter.isRateLimited("user1")).toBe(false);
    });
  });

  describe("getRemainingAttempts", () => {
    it("should return max attempts for new identifier", () => {
      expect(rateLimiter.getRemainingAttempts("user1")).toBe(3);
    });

    it("should decrease after attempts", () => {
      rateLimiter.recordAttempt("user1");
      expect(rateLimiter.getRemainingAttempts("user1")).toBe(2);

      rateLimiter.recordAttempt("user1");
      expect(rateLimiter.getRemainingAttempts("user1")).toBe(1);
    });

    it("should return 0 when locked", () => {
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");

      expect(rateLimiter.getRemainingAttempts("user1")).toBe(0);
    });
  });

  describe("getInfo", () => {
    it("should return complete rate limit info", () => {
      const info = rateLimiter.getInfo("user1");

      expect(info.isLimited).toBe(false);
      expect(info.remainingAttempts).toBe(3);
      expect(info.lockoutRemainingMs).toBe(0);
      expect(info.windowRemainingMs).toBeGreaterThan(0);
    });

    it("should show lockout info when limited", () => {
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");

      const info = rateLimiter.getInfo("user1");

      expect(info.isLimited).toBe(true);
      expect(info.lockoutRemainingMs).toBeGreaterThan(0);
    });
  });

  describe("disabled rate limiter", () => {
    it("should always allow when disabled", () => {
      const disabled = new RateLimiter({ enabled: false });

      for (let i = 0; i < 100; i++) {
        expect(disabled.recordAttempt("user1")).toBe(true);
      }

      expect(disabled.isRateLimited("user1")).toBe(false);

      disabled.stop();
    });
  });

  describe("window expiration", () => {
    it("should reset after window expires", async () => {
      vi.useFakeTimers();

      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");
      rateLimiter.recordAttempt("user1");

      expect(rateLimiter.getRemainingAttempts("user1")).toBe(0);

      // Advance time past window
      vi.advanceTimersByTime(1100);

      expect(rateLimiter.isRateLimited("user1")).toBe(false);
      expect(rateLimiter.getRemainingAttempts("user1")).toBe(3);

      vi.useRealTimers();
    });
  });
});

describe("formatDuration", () => {
  it("should format milliseconds", () => {
    expect(formatDuration(500)).toBe("500ms");
  });

  it("should format seconds", () => {
    expect(formatDuration(5000)).toBe("5s");
    expect(formatDuration(30000)).toBe("30s");
  });

  it("should format minutes", () => {
    expect(formatDuration(60000)).toBe("1m");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(300000)).toBe("5m");
  });

  it("should format hours", () => {
    expect(formatDuration(3600000)).toBe("1h");
    expect(formatDuration(3900000)).toBe("1h 5m");
  });
});
