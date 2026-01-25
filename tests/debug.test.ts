/**
 * Tests for debug logging module
 */

import { describe, it, expect, beforeEach, afterEach } from "bun:test";
import {
  isDebugEnabled,
  getDebugLogPath,
  startQwenDebugRequest,
  logQwenDebugResponse,
  logDebugMessage,
} from "../src/plugin/debug";

describe("Debug Module", () => {
  describe("isDebugEnabled", () => {
    it("should return boolean indicating debug state", () => {
      const result = isDebugEnabled();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("getDebugLogPath", () => {
    it("should return undefined when debug is disabled", () => {
      // Since QWEN_AUTH_DEBUG is not set in test environment
      if (!isDebugEnabled()) {
        expect(getDebugLogPath()).toBeUndefined();
      }
    });
  });

  describe("startQwenDebugRequest", () => {
    it("should return null when debug is disabled", () => {
      if (!isDebugEnabled()) {
        const context = startQwenDebugRequest({
          url: "https://api.example.com/test",
          method: "POST",
        });
        expect(context).toBeNull();
      }
    });

    it("should accept all request metadata fields", () => {
      // This just tests that the function accepts the correct types
      const meta = {
        url: "https://api.example.com/test",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test: true }),
        streaming: true,
      };

      const context = startQwenDebugRequest(meta);
      // Will be null if debug disabled, or a context if enabled
      expect(context === null || typeof context === "object").toBe(true);
    });
  });

  describe("logQwenDebugResponse", () => {
    it("should handle null context gracefully", () => {
      // Should not throw
      expect(() => {
        logQwenDebugResponse(null, new Response("test"));
      }).not.toThrow();
    });

    it("should handle undefined context gracefully", () => {
      // Should not throw
      expect(() => {
        logQwenDebugResponse(undefined, new Response("test"));
      }).not.toThrow();
    });
  });

  describe("logDebugMessage", () => {
    it("should not throw when called", () => {
      expect(() => {
        logDebugMessage("Test message");
      }).not.toThrow();
    });
  });
});
