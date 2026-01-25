/**
 * Rate limiter for authentication attempts
 * Prevents brute force attacks and excessive API calls
 */

import { RATE_LIMIT_CONFIG } from "../constants";
import type { RateLimitConfig } from "../config/schema";

/**
 * Rate limit state for an identifier (IP, user, etc.)
 */
interface RateLimitState {
  attempts: number;
  windowStart: number;
  lockedUntil: number | null;
}

/**
 * Rate limiter implementation using sliding window
 */
export class RateLimiter {
  private config: Required<RateLimitConfig>;
  private states: Map<string, RateLimitState> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxAttempts: config?.maxAttempts ?? RATE_LIMIT_CONFIG.maxAttempts,
      windowMs: config?.windowMs ?? RATE_LIMIT_CONFIG.windowMs,
      lockoutMs: config?.lockoutMs ?? RATE_LIMIT_CONFIG.lockoutMs,
      enabled: config?.enabled ?? true,
    };

    // Start cleanup interval (every minute)
    this.startCleanup();
  }

  /**
   * Start periodic cleanup of expired states
   */
  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60000);
  }

  /**
   * Stop the cleanup interval
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }

  /**
   * Clean up expired rate limit states
   */
  private cleanup(): void {
    const now = Date.now();

    for (const [key, state] of this.states.entries()) {
      // Remove if window has completely expired and not locked
      if (
        now - state.windowStart > this.config.windowMs &&
        (!state.lockedUntil || now > state.lockedUntil)
      ) {
        this.states.delete(key);
      }
    }
  }

  /**
   * Check if the identifier is rate limited
   */
  isRateLimited(identifier: string): boolean {
    if (!this.config.enabled) {
      return false;
    }

    const state = this.states.get(identifier);
    if (!state) {
      return false;
    }

    const now = Date.now();

    // Check if locked out
    if (state.lockedUntil && now < state.lockedUntil) {
      return true;
    }

    // Check if window has expired
    if (now - state.windowStart > this.config.windowMs) {
      // Reset the window
      this.states.delete(identifier);
      return false;
    }

    // Check if over limit
    return state.attempts >= this.config.maxAttempts;
  }

  /**
   * Record an authentication attempt
   * Returns true if allowed, false if rate limited
   */
  recordAttempt(identifier: string): boolean {
    if (!this.config.enabled) {
      return true;
    }

    const now = Date.now();
    let state = this.states.get(identifier);

    // Check if locked out
    if (state?.lockedUntil && now < state.lockedUntil) {
      return false;
    }

    // Initialize or reset expired state
    if (!state || now - state.windowStart > this.config.windowMs) {
      state = {
        attempts: 0,
        windowStart: now,
        lockedUntil: null,
      };
      this.states.set(identifier, state);
    }

    // Increment attempts
    state.attempts++;

    // Check if exceeded limit
    if (state.attempts > this.config.maxAttempts) {
      state.lockedUntil = now + this.config.lockoutMs;
      return false;
    }

    return true;
  }

  /**
   * Reset the rate limit for an identifier (e.g., after successful auth)
   */
  reset(identifier: string): void {
    this.states.delete(identifier);
  }

  /**
   * Get remaining attempts for an identifier
   */
  getRemainingAttempts(identifier: string): number {
    if (!this.config.enabled) {
      return Number.MAX_SAFE_INTEGER;
    }

    const state = this.states.get(identifier);
    if (!state) {
      return this.config.maxAttempts;
    }

    const now = Date.now();

    // Check if locked
    if (state.lockedUntil && now < state.lockedUntil) {
      return 0;
    }

    // Check if window expired
    if (now - state.windowStart > this.config.windowMs) {
      return this.config.maxAttempts;
    }

    return Math.max(0, this.config.maxAttempts - state.attempts);
  }

  /**
   * Get time until lockout expires (in milliseconds)
   */
  getLockoutRemaining(identifier: string): number {
    const state = this.states.get(identifier);
    if (!state?.lockedUntil) {
      return 0;
    }

    const remaining = state.lockedUntil - Date.now();
    return Math.max(0, remaining);
  }

  /**
   * Get rate limit info for an identifier
   */
  getInfo(identifier: string): {
    isLimited: boolean;
    remainingAttempts: number;
    lockoutRemainingMs: number;
    windowRemainingMs: number;
  } {
    const isLimited = this.isRateLimited(identifier);
    const remainingAttempts = this.getRemainingAttempts(identifier);
    const lockoutRemainingMs = this.getLockoutRemaining(identifier);

    const state = this.states.get(identifier);
    let windowRemainingMs = this.config.windowMs;
    if (state) {
      const elapsed = Date.now() - state.windowStart;
      windowRemainingMs = Math.max(0, this.config.windowMs - elapsed);
    }

    return {
      isLimited,
      remainingAttempts,
      lockoutRemainingMs,
      windowRemainingMs,
    };
  }
}

/**
 * Format duration in milliseconds to human readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

/**
 * Global rate limiter instance
 */
let globalRateLimiter: RateLimiter | null = null;

/**
 * Get or create the global rate limiter
 */
export function getGlobalRateLimiter(config?: Partial<RateLimitConfig>): RateLimiter {
  if (!globalRateLimiter) {
    globalRateLimiter = new RateLimiter(config);
  }
  return globalRateLimiter;
}

/**
 * Reset the global rate limiter
 */
export function resetGlobalRateLimiter(): void {
  if (globalRateLimiter) {
    globalRateLimiter.stop();
    globalRateLimiter = null;
  }
}
