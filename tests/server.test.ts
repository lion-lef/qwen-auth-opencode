/**
 * Tests for OAuth callback server module
 */

import { describe, it, expect, afterEach } from "bun:test";
import {
  startOAuthListener,
  OAUTH_CALLBACK_PORT,
  OAUTH_CALLBACK_PATH,
  OAUTH_REDIRECT_URI,
} from "../src/plugin/server";

describe("OAuth Callback Server", () => {
  describe("Constants", () => {
    it("should export correct callback port", () => {
      expect(OAUTH_CALLBACK_PORT).toBe(7777);
    });

    it("should export correct callback path", () => {
      expect(OAUTH_CALLBACK_PATH).toBe("/oauth/callback");
    });

    it("should export correct redirect URI", () => {
      expect(OAUTH_REDIRECT_URI).toBe("http://localhost:7777/oauth/callback");
    });
  });

  describe("startOAuthListener", () => {
    let listener: Awaited<ReturnType<typeof startOAuthListener>> | null = null;

    afterEach(async () => {
      if (listener) {
        try {
          await listener.close();
        } catch {
          // Ignore cleanup errors - expected when listener already closed
        }
        listener = null;
      }
    });

    it("should start listener on custom port", async () => {
      const port = 8888;
      listener = await startOAuthListener({ port });
      expect(listener).toBeDefined();
      expect(listener.waitForCallback).toBeInstanceOf(Function);
      expect(listener.close).toBeInstanceOf(Function);
    });

    it("should receive callback when request made to callback path", async () => {
      const port = 8891;
      listener = await startOAuthListener({ port, timeoutMs: 5000 });

      // Make request to the callback endpoint
      const callbackPromise = listener.waitForCallback();

      // Simulate OAuth callback
      const testCode = "test_auth_code";
      const testState = "test_state";
      const response = await fetch(
        `http://localhost:${port}${OAUTH_CALLBACK_PATH}?code=${testCode}&state=${testState}`
      );

      expect(response.ok).toBe(true);

      const callbackUrl = await callbackPromise;
      expect(callbackUrl.searchParams.get("code")).toBe(testCode);
      expect(callbackUrl.searchParams.get("state")).toBe(testState);

      // Server auto-closes after handling callback, so clear listener
      listener = null;
    });

    it("should return 404 for non-callback paths", async () => {
      const port = 8892;
      listener = await startOAuthListener({ port, timeoutMs: 5000 });

      const response = await fetch(`http://localhost:${port}/other-path`);
      expect(response.status).toBe(404);
    });

    it("should return correct HTML response", async () => {
      const port = 8893;
      listener = await startOAuthListener({ port, timeoutMs: 5000 });

      const response = await fetch(`http://localhost:${port}${OAUTH_CALLBACK_PATH}?code=test`);
      expect(response.ok).toBe(true);

      const html = await response.text();
      expect(html).toContain("Authorization Successful");
      expect(html).toContain("Qwen Auth");

      // Server auto-closes after handling callback
      listener = null;
    });
  });
});
