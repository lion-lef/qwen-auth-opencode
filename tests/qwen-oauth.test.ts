/**
 * Tests for Qwen OAuth Device Flow
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import {
  generateCodeVerifier,
  generateCodeChallenge,
  generatePKCEPair,
  QWEN_OAUTH_CONSTANTS,
  QwenOAuthDeviceFlow,
} from "../src/qwen-oauth";

describe("PKCE Utilities", () => {
  describe("generateCodeVerifier", () => {
    it("should generate a base64url encoded string", () => {
      const verifier = generateCodeVerifier();
      expect(verifier).toBeDefined();
      expect(typeof verifier).toBe("string");
      // base64url uses A-Z, a-z, 0-9, -, _
      expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    });

    it("should generate a verifier of appropriate length", () => {
      const verifier = generateCodeVerifier();
      // 32 bytes base64url encoded = 43 characters
      expect(verifier.length).toBeGreaterThanOrEqual(40);
      expect(verifier.length).toBeLessThanOrEqual(50);
    });

    it("should generate unique verifiers", () => {
      const verifier1 = generateCodeVerifier();
      const verifier2 = generateCodeVerifier();
      expect(verifier1).not.toBe(verifier2);
    });
  });

  describe("generateCodeChallenge", () => {
    it("should generate a SHA-256 hash of the verifier", () => {
      const verifier = "test-verifier-string";
      const challenge = generateCodeChallenge(verifier);
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe("string");
      // SHA-256 produces 32 bytes, base64url encoded = 43 characters
      expect(challenge.length).toBeGreaterThanOrEqual(40);
    });

    it("should produce consistent output for the same input", () => {
      const verifier = "consistent-verifier";
      const challenge1 = generateCodeChallenge(verifier);
      const challenge2 = generateCodeChallenge(verifier);
      expect(challenge1).toBe(challenge2);
    });

    it("should produce different output for different inputs", () => {
      const challenge1 = generateCodeChallenge("verifier-1");
      const challenge2 = generateCodeChallenge("verifier-2");
      expect(challenge1).not.toBe(challenge2);
    });
  });

  describe("generatePKCEPair", () => {
    it("should return both verifier and challenge", () => {
      const pair = generatePKCEPair();
      expect(pair.codeVerifier).toBeDefined();
      expect(pair.codeChallenge).toBeDefined();
    });

    it("should generate valid PKCE pair", () => {
      const pair = generatePKCEPair();
      // Verify that challenge is derived from verifier
      const expectedChallenge = generateCodeChallenge(pair.codeVerifier);
      expect(pair.codeChallenge).toBe(expectedChallenge);
    });

    it("should generate unique pairs", () => {
      const pair1 = generatePKCEPair();
      const pair2 = generatePKCEPair();
      expect(pair1.codeVerifier).not.toBe(pair2.codeVerifier);
      expect(pair1.codeChallenge).not.toBe(pair2.codeChallenge);
    });
  });
});

describe("QWEN_OAUTH_CONSTANTS", () => {
  it("should have correct base URL", () => {
    expect(QWEN_OAUTH_CONSTANTS.BASE_URL).toBe("https://chat.qwen.ai");
  });

  it("should have correct device code endpoint", () => {
    expect(QWEN_OAUTH_CONSTANTS.DEVICE_CODE_ENDPOINT).toBe(
      "https://chat.qwen.ai/api/v1/oauth2/device/code"
    );
  });

  it("should have correct token endpoint", () => {
    expect(QWEN_OAUTH_CONSTANTS.TOKEN_ENDPOINT).toBe(
      "https://chat.qwen.ai/api/v1/oauth2/token"
    );
  });

  it("should have correct client ID", () => {
    expect(QWEN_OAUTH_CONSTANTS.CLIENT_ID).toBe("f0304373b74a44d2b584a3fb70ca9e56");
  });

  it("should have correct scope", () => {
    expect(QWEN_OAUTH_CONSTANTS.SCOPE).toBe("openid profile email model.completion");
  });

  it("should have correct grant type", () => {
    expect(QWEN_OAUTH_CONSTANTS.GRANT_TYPE).toBe(
      "urn:ietf:params:oauth:grant-type:device_code"
    );
  });
});

describe("QwenOAuthDeviceFlow", () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("startAuthorization", () => {
    it("should make request to device code endpoint", async () => {
      const mockResponse = {
        device_code: "test-device-code",
        user_code: "ABCD-1234",
        verification_uri: "https://chat.qwen.ai/device",
        verification_uri_complete: "https://chat.qwen.ai/device?code=ABCD-1234",
        expires_in: 600,
        interval: 5,
      };

      const mockFetch = mock(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockResponse),
        } as Response)
      );
      global.fetch = mockFetch;

      const flow = new QwenOAuthDeviceFlow();
      const result = await flow.startAuthorization();

      expect(result.userCode).toBe("ABCD-1234");
      expect(result.verificationUri).toBe("https://chat.qwen.ai/device");
      expect(result.verificationUriComplete).toBe("https://chat.qwen.ai/device?code=ABCD-1234");
      expect(result.expiresIn).toBe(600);

      expect(mockFetch).toHaveBeenCalledWith(
        QWEN_OAUTH_CONSTANTS.DEVICE_CODE_ENDPOINT,
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/x-www-form-urlencoded",
          }),
        })
      );
    });

    it("should throw error on failed request", async () => {
      global.fetch = mock(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Bad Request"),
        } as Response)
      );

      const flow = new QwenOAuthDeviceFlow();
      await expect(flow.startAuthorization()).rejects.toThrow("Device authorization failed");
    });
  });

  describe("waitForAuthorization", () => {
    it("should throw error if authorization not started", async () => {
      const flow = new QwenOAuthDeviceFlow();
      await expect(flow.waitForAuthorization()).rejects.toThrow(
        "Authorization not started"
      );
    });

    it("should poll until token is received", async () => {
      // First call - device code request
      const mockDeviceResponse = {
        device_code: "test-device-code",
        user_code: "ABCD-1234",
        verification_uri: "https://chat.qwen.ai/device",
        verification_uri_complete: "https://chat.qwen.ai/device?code=ABCD-1234",
        expires_in: 600,
        interval: 1,
      };

      // Token response
      const mockTokenResponse = {
        access_token: "test-access-token",
        refresh_token: "test-refresh-token",
        token_type: "Bearer",
        expires_in: 3600,
      };

      let callCount = 0;
      global.fetch = mock((url: string | URL | Request) => {
        callCount++;
        const urlStr = url.toString();
        if (urlStr.includes("device/code")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDeviceResponse),
          } as Response);
        } else if (urlStr.includes("token")) {
          // First token poll returns pending, second returns success
          if (callCount === 2) {
            return Promise.resolve({
              ok: false,
              status: 400,
              text: () =>
                Promise.resolve(JSON.stringify({ error: "authorization_pending" })),
            } as Response);
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockTokenResponse),
          } as Response);
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const flow = new QwenOAuthDeviceFlow();
      await flow.startAuthorization();

      // Use a very short timeout for testing
      const credentials = await flow.waitForAuthorization();

      expect(credentials.accessToken).toBe("test-access-token");
      expect(credentials.refreshToken).toBe("test-refresh-token");
      expect(credentials.tokenType).toBe("Bearer");
    }, 10000);

    it("should handle cancellation", async () => {
      const mockDeviceResponse = {
        device_code: "test-device-code",
        user_code: "ABCD-1234",
        verification_uri: "https://chat.qwen.ai/device",
        verification_uri_complete: "https://chat.qwen.ai/device?code=ABCD-1234",
        expires_in: 600,
        interval: 1,
      };

      global.fetch = mock((url: string | URL | Request) => {
        const urlStr = url.toString();
        if (urlStr.includes("device/code")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockDeviceResponse),
          } as Response);
        } else if (urlStr.includes("token")) {
          return Promise.resolve({
            ok: false,
            status: 400,
            text: () =>
              Promise.resolve(JSON.stringify({ error: "authorization_pending" })),
          } as Response);
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      const flow = new QwenOAuthDeviceFlow();
      await flow.startAuthorization();

      // Cancel after a short delay
      setTimeout(() => flow.cancel(), 100);

      await expect(flow.waitForAuthorization()).rejects.toThrow("cancelled");
    });
  });
});
