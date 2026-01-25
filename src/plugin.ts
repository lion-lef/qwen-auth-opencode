/**
 * Main plugin implementation for qwen-auth
 * Integrates with the opencode plugin system
 */

import { AUTH_METHODS, QWEN_PROVIDER_ID, QWEN_API_ENDPOINTS } from "./constants";
import { loadConfig, type QwenAuthConfig } from "./config";
import { ApiKeyAuthProvider, JwtAuthProvider, OAuthAuthProvider, type AuthProvider, type AuthResult } from "./auth";
import { RateLimiter, getGlobalRateLimiter } from "./security";
import { loadCredentials, saveCredentials, tokenInfoToStoredCredentials, apiKeyToStoredCredentials } from "./storage";
import { initLogger, getLogger } from "./utils";

/**
 * Plugin context provided by opencode
 */
export interface PluginContext {
  workingDir: string;
  debug?: boolean;
}

/**
 * Plugin result returned to opencode
 */
export interface PluginResult {
  provider: string;
  headers: Record<string, string>;
  baseUrl: string;
}

/**
 * Authentication manager class
 * Handles authentication lifecycle and provider management
 */
export class AuthManager {
  private config: QwenAuthConfig;
  private provider: AuthProvider | null = null;
  private rateLimiter: RateLimiter;
  private initialized: boolean = false;

  constructor(config: QwenAuthConfig) {
    this.config = config;
    this.rateLimiter = getGlobalRateLimiter(config.security?.rateLimit);
    initLogger(config.debug);
  }

  /**
   * Initialize the authentication manager
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    const logger = getLogger();
    logger.debug("Initializing authentication manager");

    // Create the appropriate provider based on config
    this.provider = this.createProvider();

    // Try to load existing credentials
    const stored = loadCredentials(this.config.security?.encryptionKey);
    if (stored) {
      logger.debug("Found stored credentials");
      await this.restoreCredentials(stored);
    }

    this.initialized = true;
    logger.info("Authentication manager initialized");
  }

  /**
   * Create an authentication provider based on config
   */
  private createProvider(): AuthProvider {
    const useInternational = this.config.useInternationalEndpoint ?? false;

    switch (this.config.method) {
      case AUTH_METHODS.API_KEY:
        if (!this.config.apiKey) {
          throw new Error("API key configuration is required for API key authentication");
        }
        return new ApiKeyAuthProvider(this.config.apiKey, useInternational);

      case AUTH_METHODS.JWT:
        if (!this.config.jwt) {
          throw new Error("JWT configuration is required for JWT authentication");
        }
        return new JwtAuthProvider(this.config.jwt, useInternational);

      case AUTH_METHODS.OAUTH:
        if (!this.config.oauth) {
          throw new Error("OAuth configuration is required for OAuth authentication");
        }
        return new OAuthAuthProvider(this.config.oauth, useInternational);

      default:
        throw new Error(`Unknown authentication method: ${this.config.method}`);
    }
  }

  /**
   * Restore credentials from storage
   */
  private async restoreCredentials(stored: import("./storage").StoredCredentials): Promise<void> {
    const logger = getLogger();

    if (this.config.method === AUTH_METHODS.OAUTH && stored.oauth && this.provider instanceof OAuthAuthProvider) {
      logger.debug("Restoring OAuth tokens");
      this.provider.setTokens(
        stored.oauth.accessToken,
        stored.oauth.refreshToken || null,
        stored.oauth.expiresAt,
        stored.oauth.scopes
      );
    }
  }

  /**
   * Authenticate with the configured provider
   */
  async authenticate(identifier: string = "default"): Promise<AuthResult> {
    const logger = getLogger();

    if (!this.provider) {
      await this.initialize();
    }

    // Check rate limiting
    if (!this.rateLimiter.recordAttempt(identifier)) {
      const info = this.rateLimiter.getInfo(identifier);
      logger.warn(`Rate limited: ${info.lockoutRemainingMs}ms remaining`);
      return {
        success: false,
        method: this.config.method,
        error: `Too many authentication attempts. Please try again in ${Math.ceil(info.lockoutRemainingMs / 1000)} seconds.`,
      };
    }

    logger.debug(`Authenticating with method: ${this.config.method}`);

    const result = await this.provider!.authenticate();

    if (result.success) {
      // Reset rate limit on success
      this.rateLimiter.reset(identifier);

      // Save credentials
      if (this.config.security?.encryptCredentials !== false) {
        const tokenInfo = this.provider!.getTokenInfo();
        if (tokenInfo) {
          if (this.config.method === AUTH_METHODS.OAUTH) {
            saveCredentials(
              tokenInfoToStoredCredentials(tokenInfo),
              true,
              this.config.security?.encryptionKey
            );
          } else if (this.config.method === AUTH_METHODS.API_KEY && this.config.apiKey) {
            saveCredentials(
              apiKeyToStoredCredentials(this.config.apiKey.apiKey),
              true,
              this.config.security?.encryptionKey
            );
          }
        }
      }

      logger.info("Authentication successful");
    } else {
      logger.error(`Authentication failed: ${result.error}`);
    }

    return result;
  }

  /**
   * Get the current authentication token
   */
  async getToken(): Promise<string | null> {
    if (!this.provider) {
      await this.initialize();
    }

    return this.provider!.getToken();
  }

  /**
   * Check if currently authenticated
   */
  isAuthenticated(): boolean {
    return this.provider?.isAuthenticated() ?? false;
  }

  /**
   * Refresh the current authentication
   */
  async refresh(): Promise<boolean> {
    if (!this.provider) {
      return false;
    }

    const logger = getLogger();
    logger.debug("Refreshing authentication");

    const success = await this.provider.refresh();

    if (success) {
      // Update stored credentials
      const tokenInfo = this.provider.getTokenInfo();
      if (tokenInfo && this.config.security?.encryptCredentials !== false) {
        saveCredentials(
          tokenInfoToStoredCredentials(tokenInfo),
          true,
          this.config.security?.encryptionKey
        );
      }
      logger.info("Authentication refreshed successfully");
    } else {
      logger.warn("Authentication refresh failed");
    }

    return success;
  }

  /**
   * Revoke the current authentication
   */
  async revoke(): Promise<void> {
    if (this.provider) {
      await this.provider.revoke();
    }
    this.initialized = false;
    getLogger().info("Authentication revoked");
  }

  /**
   * Get the request configuration for API calls
   */
  getRequestConfig(): { headers: Record<string, string>; baseUrl: string } {
    if (!this.provider) {
      throw new Error("Authentication manager not initialized");
    }

    const token = this.provider.getTokenInfo()?.token;
    const baseUrl = this.config.useInternationalEndpoint
      ? QWEN_API_ENDPOINTS.international
      : QWEN_API_ENDPOINTS.primary;

    return {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      baseUrl: this.config.apiKey?.baseUrl || baseUrl,
    };
  }

  /**
   * Get the current configuration
   */
  getConfig(): QwenAuthConfig {
    return this.config;
  }
}

/**
 * Global auth manager instance
 */
let globalAuthManager: AuthManager | null = null;

/**
 * Initialize the qwen-auth plugin
 */
export async function initPlugin(context: PluginContext): Promise<AuthManager> {
  const config = loadConfig(context.workingDir);

  if (context.debug !== undefined) {
    config.debug = context.debug;
  }

  globalAuthManager = new AuthManager(config);
  await globalAuthManager.initialize();

  return globalAuthManager;
}

/**
 * Get the global auth manager
 */
export function getAuthManager(): AuthManager | null {
  return globalAuthManager;
}

/**
 * Plugin loader function for opencode
 */
export async function load(context: PluginContext): Promise<PluginResult> {
  const authManager = await initPlugin(context);

  // Authenticate if not already
  if (!authManager.isAuthenticated()) {
    const result = await authManager.authenticate();
    if (!result.success) {
      throw new Error(`Authentication failed: ${result.error}`);
    }
  }

  const requestConfig = authManager.getRequestConfig();

  return {
    provider: QWEN_PROVIDER_ID,
    headers: requestConfig.headers,
    baseUrl: requestConfig.baseUrl,
  };
}

/**
 * Plugin unload function for opencode
 */
export async function unload(): Promise<void> {
  if (globalAuthManager) {
    await globalAuthManager.revoke();
    globalAuthManager = null;
  }
}
