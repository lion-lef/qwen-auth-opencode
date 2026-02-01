/**
 * API Key authentication provider
 * Simplest authentication method using DashScope API keys
 */

import { AUTH_METHODS, QWEN_API_ENDPOINTS } from "../constants";
import type { ApiKeyConfig } from "../config/schema";
import type { AuthProvider, AuthResult, TokenInfo, ApiRequestConfig } from "./types";

/**
 * API Key authentication provider implementation
 */
export class ApiKeyAuthProvider implements AuthProvider {
  private config: ApiKeyConfig;
  private useInternational: boolean;
  private authenticated: boolean = false;

  constructor(config: ApiKeyConfig, useInternational: boolean = false) {
    this.config = config;
    this.useInternational = useInternational;
  }

  getMethod() {
    return AUTH_METHODS.API_KEY;
  }

  async authenticate(): Promise<AuthResult> {
    // API key authentication is straightforward - validate the key format
    if (!this.config.apiKey || this.config.apiKey.length < 10) {
      return {
        success: false,
        method: AUTH_METHODS.API_KEY,
        error: "Invalid API key format",
      };
    }

    // Mark as authenticated (actual validation happens on first API call)
    this.authenticated = true;

    return {
      success: true,
      method: AUTH_METHODS.API_KEY,
      token: this.config.apiKey,
    };
  }

  async getToken(): Promise<string | null> {
    if (!this.authenticated) {
      const result = await this.authenticate();
      if (!result.success) {
        return null;
      }
    }
    return this.config.apiKey;
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  async refresh(): Promise<boolean> {
    // API keys don't need refreshing
    return this.authenticated;
  }

  async revoke(): Promise<void> {
    this.authenticated = false;
  }

  getTokenInfo(): TokenInfo | null {
    if (!this.authenticated) {
      return null;
    }

    return {
      token: this.config.apiKey,
      tokenType: "Bearer",
      // API keys don't expire
      expiresAt: Number.MAX_SAFE_INTEGER,
    };
  }

  /**
   * Get the API request configuration for making authenticated requests
   */
  getRequestConfig(): ApiRequestConfig {
    const baseUrl =
      this.config.baseUrl ||
      (this.useInternational ? QWEN_API_ENDPOINTS.international : QWEN_API_ENDPOINTS.primary);

    return {
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      baseUrl,
    };
  }
}

/**
 * Validates an API key format
 * Qwen/DashScope API keys are typically 32+ character strings
 */
export function validateApiKeyFormat(apiKey: string): boolean {
  // Basic validation - API keys should be alphanumeric with possible dashes
  const apiKeyPattern = /^[a-zA-Z0-9-_]{20,}$/;
  return apiKeyPattern.test(apiKey);
}

/**
 * Masks an API key for display (shows first 4 and last 4 characters)
 */
export function maskApiKey(apiKey: string): string {
  if (apiKey.length <= 8) {
    return "****";
  }
  return `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
}
