/**
 * Configuration schema for qwen-auth plugin
 * Defines the structure for authentication settings in opencode.json
 */

import { z } from "zod";
import { AUTH_METHODS, QWEN_MODELS } from "../constants";

/**
 * Schema for API Key authentication configuration
 */
export const ApiKeyConfigSchema = z.object({
  /** The API key for DashScope/Qwen API */
  apiKey: z.string().min(1, "API key is required"),
  /** Optional base URL override */
  baseUrl: z.string().url().optional(),
});

/**
 * Schema for JWT authentication configuration
 */
export const JwtConfigSchema = z.object({
  /** Path to private key file or the key content */
  privateKey: z.string().min(1, "Private key is required"),
  /** Key ID for the JWT header */
  keyId: z.string().min(1, "Key ID is required"),
  /** Issuer claim for the JWT */
  issuer: z.string().min(1, "Issuer is required"),
  /** Audience claim for the JWT */
  audience: z.string().optional(),
  /** Token expiration time in seconds */
  expirationSeconds: z.number().int().positive().default(3600),
  /** Algorithm to use for signing (RS256 or ES256) */
  algorithm: z.enum(["RS256", "ES256"]).default("RS256"),
});

/**
 * Schema for OAuth authentication configuration
 */
export const OAuthConfigSchema = z.object({
  /** OAuth client ID */
  clientId: z.string().min(1, "Client ID is required"),
  /** OAuth client secret */
  clientSecret: z.string().min(1, "Client secret is required"),
  /** OAuth authorization endpoint */
  authorizationEndpoint: z.string().url().optional(),
  /** OAuth token endpoint */
  tokenEndpoint: z.string().url().optional(),
  /** OAuth redirect URI */
  redirectUri: z.string().url().default("http://localhost:8765/callback"),
  /** OAuth scopes */
  scopes: z.array(z.string()).default(["openid", "profile"]),
});

/**
 * Schema for rate limiting configuration
 */
export const RateLimitConfigSchema = z.object({
  /** Maximum authentication attempts per window */
  maxAttempts: z.number().int().positive().default(5),
  /** Rate limit window in milliseconds */
  windowMs: z.number().int().positive().default(60000),
  /** Lockout duration after exceeding limits in milliseconds */
  lockoutMs: z.number().int().positive().default(300000),
  /** Enable/disable rate limiting */
  enabled: z.boolean().default(true),
});

/**
 * Schema for security configuration
 */
export const SecurityConfigSchema = z.object({
  /** Rate limiting settings */
  rateLimit: RateLimitConfigSchema.optional(),
  /** Enable encryption for stored credentials */
  encryptCredentials: z.boolean().default(true),
  /** Custom encryption key (if not provided, uses machine-specific key) */
  encryptionKey: z.string().optional(),
  /** Enable audit logging for authentication events */
  auditLogging: z.boolean().default(false),
});

/**
 * Main configuration schema for qwen-auth
 */
export const QwenAuthConfigSchema = z.object({
  /** Authentication method to use */
  method: z.enum([AUTH_METHODS.API_KEY, AUTH_METHODS.JWT, AUTH_METHODS.OAUTH]).default(AUTH_METHODS.API_KEY),
  /** API Key authentication configuration */
  apiKey: ApiKeyConfigSchema.optional(),
  /** JWT authentication configuration */
  jwt: JwtConfigSchema.optional(),
  /** OAuth authentication configuration */
  oauth: OAuthConfigSchema.optional(),
  /** Security settings */
  security: SecurityConfigSchema.optional(),
  /** Default model to use */
  defaultModel: z.enum(Object.keys(QWEN_MODELS) as [string, ...string[]]).optional(),
  /** Enable debug logging */
  debug: z.boolean().default(false),
  /** Use international endpoint */
  useInternationalEndpoint: z.boolean().default(false),
}).refine(
  (data) => {
    // Ensure the correct auth config is provided based on method
    if (data.method === AUTH_METHODS.API_KEY && !data.apiKey) {
      return false;
    }
    if (data.method === AUTH_METHODS.JWT && !data.jwt) {
      return false;
    }
    if (data.method === AUTH_METHODS.OAUTH && !data.oauth) {
      return false;
    }
    return true;
  },
  {
    message: "Authentication configuration must match the selected method",
  }
);

export type ApiKeyConfig = z.infer<typeof ApiKeyConfigSchema>;
export type JwtConfig = z.infer<typeof JwtConfigSchema>;
export type OAuthConfig = z.infer<typeof OAuthConfigSchema>;
export type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;
export type SecurityConfig = z.infer<typeof SecurityConfigSchema>;
export type QwenAuthConfig = z.infer<typeof QwenAuthConfigSchema>;

/**
 * Validates a configuration object against the schema
 */
export function validateConfig(config: unknown): QwenAuthConfig {
  return QwenAuthConfigSchema.parse(config);
}

/**
 * Creates a default configuration for API key authentication
 */
export function createDefaultApiKeyConfig(apiKey: string): QwenAuthConfig {
  return {
    method: AUTH_METHODS.API_KEY,
    apiKey: { apiKey },
    debug: false,
    useInternationalEndpoint: false,
  };
}

/**
 * Creates a default configuration for JWT authentication
 */
export function createDefaultJwtConfig(
  privateKey: string,
  keyId: string,
  issuer: string
): QwenAuthConfig {
  return {
    method: AUTH_METHODS.JWT,
    jwt: {
      privateKey,
      keyId,
      issuer,
      expirationSeconds: 3600,
      algorithm: "RS256",
    },
    debug: false,
    useInternationalEndpoint: false,
  };
}

/**
 * Creates a default configuration for OAuth authentication
 */
export function createDefaultOAuthConfig(
  clientId: string,
  clientSecret: string
): QwenAuthConfig {
  return {
    method: AUTH_METHODS.OAUTH,
    oauth: {
      clientId,
      clientSecret,
      redirectUri: "http://localhost:8765/callback",
      scopes: ["openid", "profile"],
    },
    debug: false,
    useInternationalEndpoint: false,
  };
}
