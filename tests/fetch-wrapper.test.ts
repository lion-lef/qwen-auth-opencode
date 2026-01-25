/**
 * Tests for OAuth Fetch Wrapper URL Rewriting
 */

import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock fs/promises module
mock.module("fs/promises", () => ({
  readFile: mock(() => Promise.resolve("{}")),
  writeFile: mock(() => Promise.resolve(undefined)),
  mkdir: mock(() => Promise.resolve(undefined)),
  unlink: mock(() => Promise.resolve(undefined)),
}));

// Import after mocking
const { createOAuthFetch, OAUTH_DUMMY_KEY } = await import(
  "../src/plugin/fetch-wrapper"
);

describe("OAuth Fetch Wrapper", () => {
  describe("URL Rewriting", () => {
    const mockPluginClient = {
      auth: {
        set: mock(() => Promise.resolve(undefined)),
      },
    };

    const mockOAuthAuth = {
      type: "oauth" as const,
      access: "test-access-token",
      refresh: "test-refresh-token",
      expires: Date.now() + 3600000, // 1 hour from now
    };

    const mockApiAuth = {
      type: "api" as const,
      key: "sk-test-api-key",
    };

    beforeEach(() => {
      // Reset fetch mock before each test
      globalThis.fetch = mock((url: string | URL | Request, init?: RequestInit) => {
        return Promise.resolve(
          new Response(JSON.stringify({ url: url.toString() }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        );
      }) as typeof fetch;
    });

    it("should rewrite DashScope international URL to portal.qwen.ai for OAuth", async () => {
      const getAuth = mock(() => Promise.resolve(mockOAuthAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      const dashscopeUrl =
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
      await oauthFetch(dashscopeUrl, { method: "POST" });

      // Verify fetch was called with rewritten URL
      expect(globalThis.fetch).toHaveBeenCalled();
      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toBe("https://portal.qwen.ai/v1/chat/completions");
    });

    it("should rewrite DashScope China URL to portal.qwen.ai for OAuth", async () => {
      const getAuth = mock(() => Promise.resolve(mockOAuthAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      const dashscopeUrl =
        "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions";
      await oauthFetch(dashscopeUrl, { method: "POST" });

      // Verify fetch was called with rewritten URL
      expect(globalThis.fetch).toHaveBeenCalled();
      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toBe("https://portal.qwen.ai/v1/chat/completions");
    });

    it("should NOT rewrite URL for non-OAuth (API key) auth", async () => {
      const getAuth = mock(() => Promise.resolve(mockApiAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      const dashscopeUrl =
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions";
      await oauthFetch(dashscopeUrl, { method: "POST" });

      // Verify fetch was called with original URL
      expect(globalThis.fetch).toHaveBeenCalled();
      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toBe(dashscopeUrl);
    });

    it("should NOT rewrite non-DashScope URLs", async () => {
      const getAuth = mock(() => Promise.resolve(mockOAuthAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      const otherUrl = "https://api.openai.com/v1/chat/completions";
      await oauthFetch(otherUrl, { method: "POST" });

      // Verify fetch was called with original URL
      expect(globalThis.fetch).toHaveBeenCalled();
      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toBe(otherUrl);
    });

    it("should preserve query parameters when rewriting URL", async () => {
      const getAuth = mock(() => Promise.resolve(mockOAuthAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      const dashscopeUrl =
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/chat/completions?model=coder-model";
      await oauthFetch(dashscopeUrl, { method: "POST" });

      // Verify fetch was called with rewritten URL and query preserved
      expect(globalThis.fetch).toHaveBeenCalled();
      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toBe(
        "https://portal.qwen.ai/v1/chat/completions?model=coder-model"
      );
    });

    it("should handle other API paths (e.g., /responses)", async () => {
      const getAuth = mock(() => Promise.resolve(mockOAuthAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      const dashscopeUrl =
        "https://dashscope-intl.aliyuncs.com/compatible-mode/v1/responses";
      await oauthFetch(dashscopeUrl, { method: "POST" });

      // Verify fetch was called with rewritten URL
      expect(globalThis.fetch).toHaveBeenCalled();
      const calledUrl = (globalThis.fetch as any).mock.calls[0][0];
      expect(calledUrl).toBe("https://portal.qwen.ai/v1/responses");
    });
  });

  describe("Authorization Header", () => {
    const mockPluginClient = {
      auth: {
        set: mock(() => Promise.resolve(undefined)),
      },
    };

    const mockOAuthAuth = {
      type: "oauth" as const,
      access: "test-access-token",
      refresh: "test-refresh-token",
      expires: Date.now() + 3600000,
    };

    beforeEach(() => {
      globalThis.fetch = mock(
        (url: string | URL | Request, init?: RequestInit) => {
          return Promise.resolve(
            new Response(JSON.stringify({ ok: true }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            })
          );
        }
      ) as typeof fetch;
    });

    it("should add Bearer token for OAuth requests", async () => {
      const getAuth = mock(() => Promise.resolve(mockOAuthAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      await oauthFetch("https://portal.qwen.ai/v1/chat/completions", {
        method: "POST",
      });

      // Verify authorization header was set
      expect(globalThis.fetch).toHaveBeenCalled();
      const callArgs = (globalThis.fetch as any).mock.calls[0];
      const headers = new Headers(callArgs[1]?.headers);
      expect(headers.get("authorization")).toBe("Bearer test-access-token");
    });

    it("should remove dummy API key if present in headers", async () => {
      const getAuth = mock(() => Promise.resolve(mockOAuthAuth));
      const oauthFetch = createOAuthFetch(getAuth, mockPluginClient);

      await oauthFetch("https://portal.qwen.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OAUTH_DUMMY_KEY}`,
        },
      });

      // Verify the dummy key was replaced with real token
      expect(globalThis.fetch).toHaveBeenCalled();
      const callArgs = (globalThis.fetch as any).mock.calls[0];
      const headers = new Headers(callArgs[1]?.headers);
      expect(headers.get("authorization")).toBe("Bearer test-access-token");
      expect(headers.get("authorization")).not.toContain(OAUTH_DUMMY_KEY);
    });
  });
});
