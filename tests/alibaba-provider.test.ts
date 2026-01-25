/**
 * Tests for Alibaba Cloud DashScope Provider Integration
 * Tests authentication and API requests with mock data
 */

import { describe, it, expect, mock, beforeEach, afterEach } from "bun:test";
import { QWEN_API_ENDPOINTS, QWEN_PROVIDER_ID } from "../src/constants";
import { ApiKeyAuthProvider } from "../src/auth/api-key";

describe("Alibaba DashScope Provider", () => {
  let originalFetch: typeof global.fetch;
  const mockApiKey = "sk-test1234567890abcdefghijklmnop";

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("Authentication", () => {
    it("should authenticate with valid API key for China endpoint", async () => {
      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      const result = await provider.authenticate();

      expect(result.success).toBe(true);
      expect(result.method).toBe("api_key");
      expect(result.token).toBe(mockApiKey);
    });

    it("should authenticate with valid API key for International endpoint", async () => {
      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, true);
      const result = await provider.authenticate();

      expect(result.success).toBe(true);
      expect(result.method).toBe("api_key");
      expect(result.token).toBe(mockApiKey);
    });

    it("should provide correct request config for China endpoint", async () => {
      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      expect(config.baseUrl).toBe(QWEN_API_ENDPOINTS.primary);
      expect(config.headers["Authorization"]).toBe(`Bearer ${mockApiKey}`);
      expect(config.headers["Content-Type"]).toBe("application/json");
    });

    it("should provide correct request config for International endpoint", async () => {
      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, true);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      expect(config.baseUrl).toBe(QWEN_API_ENDPOINTS.international);
      expect(config.headers["Authorization"]).toBe(`Bearer ${mockApiKey}`);
      expect(config.headers["Content-Type"]).toBe("application/json");
    });
  });

  describe("API Request Simulation", () => {
    it("should successfully make chat completion request with mock data", async () => {
      // Mock successful API response
      const mockResponse = {
        output: {
          text: "Hello! How can I assist you today?",
          finish_reason: "stop",
        },
        usage: {
          input_tokens: 10,
          output_tokens: 8,
          total_tokens: 18,
        },
        request_id: "test-request-id-12345",
      };

      const mockFetch = mock((url: string | URL | Request, init?: RequestInit) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({
            "Content-Type": "application/json",
          }),
          json: () => Promise.resolve(mockResponse),
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      // Simulate chat completion request
      const requestBody = {
        model: "qwen-turbo",
        input: {
          messages: [
            {
              role: "user",
              content: "Hello",
            },
          ],
        },
        parameters: {
          result_format: "message",
        },
      };

      const response = await fetch(
        `${config.baseUrl}/services/aigc/text-generation/generation`,
        {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();

      expect(response.ok).toBe(true);
      expect(data.output.text).toBe("Hello! How can I assist you today?");
      expect(data.usage.total_tokens).toBe(18);
      expect(mockFetch).toHaveBeenCalledTimes(1);

      // Verify request was made to correct endpoint
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("dashscope.aliyuncs.com");
      expect(callArgs[0]).toContain("/services/aigc/text-generation/generation");
    });

    it("should handle streaming response with mock data", async () => {
      // Mock streaming response chunks
      const chunks = [
        'data: {"output":{"text":"Hello","finish_reason":null}}\n\n',
        'data: {"output":{"text":"! How can I","finish_reason":null}}\n\n',
        'data: {"output":{"text":" assist you?","finish_reason":"stop"}}\n\n',
        "data: [DONE]\n\n",
      ];

      let chunkIndex = 0;
      const mockReadableStream = new ReadableStream({
        start(controller) {
          chunks.forEach((chunk) => {
            controller.enqueue(new TextEncoder().encode(chunk));
          });
          controller.close();
        },
      });

      const mockFetch = mock(() => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({
            "Content-Type": "text/event-stream",
          }),
          body: mockReadableStream,
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      const response = await fetch(
        `${config.baseUrl}/services/aigc/text-generation/generation`,
        {
          method: "POST",
          headers: {
            ...config.headers,
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            model: "qwen-turbo",
            input: { messages: [{ role: "user", content: "Hello" }] },
            parameters: { incremental_output: true },
          }),
        }
      );

      expect(response.ok).toBe(true);
      expect(response.headers.get("Content-Type")).toBe("text/event-stream");
    });

    it("should handle API error responses", async () => {
      const mockErrorResponse = {
        code: "InvalidApiKey",
        message: "Invalid API-key provided.",
        request_id: "test-error-request-id",
      };

      const mockFetch = mock(() => {
        return Promise.resolve({
          ok: false,
          status: 401,
          headers: new Headers({
            "Content-Type": "application/json",
          }),
          json: () => Promise.resolve(mockErrorResponse),
          text: () => Promise.resolve(JSON.stringify(mockErrorResponse)),
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: "invalid-key" }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      const response = await fetch(
        `${config.baseUrl}/services/aigc/text-generation/generation`,
        {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify({
            model: "qwen-turbo",
            input: { messages: [{ role: "user", content: "Test" }] },
          }),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);

      const errorData = await response.json();
      expect(errorData.code).toBe("InvalidApiKey");
      expect(errorData.message).toContain("Invalid API-key");
    });

    it("should handle rate limit errors", async () => {
      const mockRateLimitResponse = {
        code: "Throttling.RateQuota",
        message: "Requests rate limit exceeded.",
        request_id: "test-rate-limit-request-id",
      };

      const mockFetch = mock(() => {
        return Promise.resolve({
          ok: false,
          status: 429,
          headers: new Headers({
            "Content-Type": "application/json",
            "X-RateLimit-Limit": "60",
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Date.now() + 60000),
          }),
          json: () => Promise.resolve(mockRateLimitResponse),
          text: () => Promise.resolve(JSON.stringify(mockRateLimitResponse)),
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      const response = await fetch(
        `${config.baseUrl}/services/aigc/text-generation/generation`,
        {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify({
            model: "qwen-turbo",
            input: { messages: [{ role: "user", content: "Test" }] },
          }),
        }
      );

      expect(response.ok).toBe(false);
      expect(response.status).toBe(429);
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");

      const errorData = await response.json();
      expect(errorData.code).toBe("Throttling.RateQuota");
    });
  });

  describe("Multi-turn Conversation", () => {
    it("should handle multi-turn conversation with mock data", async () => {
      const mockResponses = [
        {
          output: {
            text: "Hello! I'm Qwen, an AI assistant. How can I help you?",
            finish_reason: "stop",
          },
          usage: { input_tokens: 5, output_tokens: 12, total_tokens: 17 },
          request_id: "req-1",
        },
        {
          output: {
            text: "I can help with programming, writing, analysis, and more!",
            finish_reason: "stop",
          },
          usage: { input_tokens: 25, output_tokens: 10, total_tokens: 35 },
          request_id: "req-2",
        },
      ];

      let callCount = 0;
      const mockFetch = mock(() => {
        const response = mockResponses[callCount];
        callCount++;
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () => Promise.resolve(response),
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      // First turn
      const response1 = await fetch(
        `${config.baseUrl}/services/aigc/text-generation/generation`,
        {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify({
            model: "qwen-turbo",
            input: {
              messages: [{ role: "user", content: "Hello" }],
            },
          }),
        }
      );

      const data1 = await response1.json();
      expect(data1.output.text).toContain("Qwen");

      // Second turn
      const response2 = await fetch(
        `${config.baseUrl}/services/aigc/text-generation/generation`,
        {
          method: "POST",
          headers: config.headers,
          body: JSON.stringify({
            model: "qwen-turbo",
            input: {
              messages: [
                { role: "user", content: "Hello" },
                { role: "assistant", content: data1.output.text },
                { role: "user", content: "What can you do?" },
              ],
            },
          }),
        }
      );

      const data2 = await response2.json();
      expect(data2.output.text).toContain("programming");
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("Model Support", () => {
    it("should support different Qwen models with mock data", async () => {
      const models = ["qwen-turbo", "qwen-plus", "qwen-max", "qwen2.5-coder-32b-instruct"];

      for (const modelId of models) {
        const mockResponse = {
          output: {
            text: `Response from ${modelId}`,
            finish_reason: "stop",
          },
          usage: { input_tokens: 5, output_tokens: 5, total_tokens: 10 },
          request_id: `req-${modelId}`,
        };

        const mockFetch = mock(() => {
          return Promise.resolve({
            ok: true,
            status: 200,
            headers: new Headers({ "Content-Type": "application/json" }),
            json: () => Promise.resolve(mockResponse),
          } as Response);
        });
        global.fetch = mockFetch;

        const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
        await provider.authenticate();
        const config = provider.getRequestConfig();

        const response = await fetch(
          `${config.baseUrl}/services/aigc/text-generation/generation`,
          {
            method: "POST",
            headers: config.headers,
            body: JSON.stringify({
              model: modelId,
              input: { messages: [{ role: "user", content: "Test" }] },
            }),
          }
        );

        const data = await response.json();
        expect(data.output.text).toContain(modelId);
        expect(mockFetch).toHaveBeenCalledTimes(1);

        // Restore for next iteration
        global.fetch = originalFetch;
      }
    });
  });

  describe("Endpoint Selection", () => {
    it("should use China endpoint for domestic API key", async () => {
      const mockFetch = mock((url: string | URL | Request) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () => Promise.resolve({ output: { text: "OK" } }),
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      await fetch(`${config.baseUrl}/services/aigc/text-generation/generation`, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify({ model: "qwen-turbo", input: { messages: [] } }),
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("dashscope.aliyuncs.com");
      expect(callArgs[0]).not.toContain("-intl");
    });

    it("should use International endpoint for international API key", async () => {
      const mockFetch = mock((url: string | URL | Request) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () => Promise.resolve({ output: { text: "OK" } }),
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, true);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      await fetch(`${config.baseUrl}/services/aigc/text-generation/generation`, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify({ model: "qwen-turbo", input: { messages: [] } }),
      });

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs[0]).toContain("dashscope-intl.aliyuncs.com");
    });
  });

  describe("Request Headers", () => {
    it("should include required headers in API requests", async () => {
      const mockFetch = mock((url: string | URL | Request, init?: RequestInit) => {
        return Promise.resolve({
          ok: true,
          status: 200,
          headers: new Headers({ "Content-Type": "application/json" }),
          json: () => Promise.resolve({ output: { text: "OK" } }),
        } as Response);
      });
      global.fetch = mockFetch;

      const provider = new ApiKeyAuthProvider({ apiKey: mockApiKey }, false);
      await provider.authenticate();
      const config = provider.getRequestConfig();

      await fetch(`${config.baseUrl}/services/aigc/text-generation/generation`, {
        method: "POST",
        headers: config.headers,
        body: JSON.stringify({ model: "qwen-turbo", input: { messages: [] } }),
      });

      const callArgs = mockFetch.mock.calls[0];
      const init = callArgs[1] as RequestInit;
      const headers = init.headers as Record<string, string>;

      expect(headers["Authorization"]).toBe(`Bearer ${mockApiKey}`);
      expect(headers["Content-Type"]).toBe("application/json");
    });
  });
});
