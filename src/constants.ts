/**
 * Constants for the qwen-auth plugin
 */

/** Qwen provider identifier for opencode */
export const QWEN_PROVIDER_ID = "qwen" as const;

/** Qwen API base URL endpoints */
export const QWEN_API_ENDPOINTS = {
  /** Primary Alibaba Cloud DashScope API endpoint */
  primary: "https://dashscope.aliyuncs.com/api/v1",
  /** International endpoint for non-China regions */
  international: "https://dashscope-intl.aliyuncs.com/api/v1",
} as const;

/** OAuth configuration for Alibaba Cloud (legacy) */
export const OAUTH_CONFIG = {
  authorizationEndpoint: "https://account.aliyun.com/oauth/authorize",
  tokenEndpoint: "https://oauth.aliyun.com/v1/token",
  scope: "openid profile",
  clientId: "", // To be configured by user
} as const;

/** Qwen OAuth configuration (chat.qwen.ai - Device Flow) */
export const QWEN_OAUTH_CONFIG = {
  /** Base URL for Qwen OAuth */
  baseUrl: "https://chat.qwen.ai",
  /** Device code endpoint */
  deviceCodeEndpoint: "https://chat.qwen.ai/api/v1/oauth2/device/code",
  /** Token endpoint */
  tokenEndpoint: "https://chat.qwen.ai/api/v1/oauth2/token",
  /** Public client ID for Qwen OAuth */
  clientId: "f0304373b74a44d2b584a3fb70ca9e56",
  /** OAuth scopes */
  scope: "openid profile email model.completion",
  /** Device code grant type */
  grantType: "urn:ietf:params:oauth:grant-type:device_code",
  /** Local callback port (for compatibility) */
  callbackPort: 7777,
  /** Callback path */
  callbackPath: "/oauth/callback",
} as const;

/** Supported authentication methods */
export const AUTH_METHODS = {
  API_KEY: "api_key",
  JWT: "jwt",
  OAUTH: "oauth",
} as const;

/** Token expiration settings */
export const TOKEN_SETTINGS = {
  /** Default token expiration time in seconds (1 hour) */
  defaultExpirationSeconds: 3600,
  /** Refresh token before expiration (5 minutes before) */
  refreshBufferSeconds: 300,
  /** Maximum retry attempts for token refresh */
  maxRefreshRetries: 3,
} as const;

/** Rate limiting configuration */
export const RATE_LIMIT_CONFIG = {
  /** Maximum authentication attempts per window */
  maxAttempts: 5,
  /** Rate limit window in milliseconds (1 minute) */
  windowMs: 60000,
  /** Lockout duration after exceeding limits (5 minutes) */
  lockoutMs: 300000,
  /** Backoff tiers for rate limit retries */
  backoffTiersMs: [1000, 5000, 10000, 30000, 60000],
} as const;

/** Storage keys for credential persistence */
export const STORAGE_KEYS = {
  credentials: "qwen_auth_credentials",
  tokens: "qwen_auth_tokens",
  rateLimitState: "qwen_auth_rate_limit",
} as const;

/** Supported Qwen model IDs */
export const QWEN_MODELS = {
  "qwen-turbo": "qwen-turbo",
  "qwen-plus": "qwen-plus",
  "qwen-max": "qwen-max",
  "qwen-max-longcontext": "qwen-max-longcontext",
  "qwen-vl-plus": "qwen-vl-plus",
  "qwen-vl-max": "qwen-vl-max",
  "qwen-audio-turbo": "qwen-audio-turbo",
  "qwen-coder-turbo": "qwen-coder-turbo",
  "qwen-coder-plus": "qwen-coder-plus",
  "qwen2.5-coder-32b-instruct": "qwen2.5-coder-32b-instruct",
  "qwen2.5-72b-instruct": "qwen2.5-72b-instruct",
  "qwq-32b-preview": "qwq-32b-preview",
} as const;

export type QwenModelId = keyof typeof QWEN_MODELS;
export type AuthMethod = (typeof AUTH_METHODS)[keyof typeof AUTH_METHODS];
