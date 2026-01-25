/**
 * Constants for the qwen-auth plugin
 * Focused on OpenCode plugin integration with Qwen
 */

/**
 * Provider identifier for OpenCode
 * Must match the provider ID in models.dev (https://models.dev/api.json)
 * OpenCode uses "alibaba" as the provider ID for Qwen/DashScope models
 */
export const QWEN_PROVIDER_ID = "alibaba" as const;

/** Qwen API base URL endpoints */
export const QWEN_API_ENDPOINTS = {
  /** Primary Alibaba Cloud DashScope API endpoint */
  primary: "https://dashscope.aliyuncs.com/api/v1",
  /** International endpoint for non-China regions */
  international: "https://dashscope-intl.aliyuncs.com/api/v1",
} as const;

/** Qwen OAuth configuration (chat.qwen.ai - Device Flow) */
export const QWEN_OAUTH_CONFIG = {
  /** Base URL for Qwen OAuth */
  baseUrl: "https://chat.qwen.ai",
  /** Device code endpoint */
  deviceCodeEndpoint: "https://chat.qwen.ai/api/v1/oauth2/device/code",
  /** Token endpoint */
  tokenEndpoint: "https://chat.qwen.ai/api/v1/oauth2/token",
  /** Public client ID for Qwen OAuth (same as qwen-code) */
  clientId: "f0304373b74a44d2b584a3fb70ca9e56",
  /** OAuth scopes */
  scope: "openid profile email model.completion",
  /** Device code grant type */
  grantType: "urn:ietf:params:oauth:grant-type:device_code",
} as const;

/** Supported authentication methods */
export const AUTH_METHODS = {
  API_KEY: "api_key",
  OAUTH: "oauth",
} as const;

/** Token expiration settings */
export const TOKEN_SETTINGS = {
  /** Default token expiration time in seconds (1 hour) */
  defaultExpirationSeconds: 3600,
  /** Refresh token before expiration (5 minutes before) */
  refreshBufferSeconds: 300,
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

/**
 * OAuth-specific models available through portal.qwen.ai
 * These are special model aliases used by the Qwen OAuth tier
 * (same as qwen-code's QWEN_OAUTH_MODELS)
 */
export const QWEN_OAUTH_MODELS = {
  "coder-model": {
    id: "coder-model",
    name: "Qwen Coder (OAuth)",
    description: "The latest Qwen Coder model from Alibaba Cloud ModelStudio (version: qwen3-coder-plus-2025-09-23)",
    family: "qwen",
    attachment: false,
    reasoning: false,
    tool_call: true,
    temperature: true,
    release_date: "2025-09-23",
    modalities: {
      input: ["text"],
      output: ["text"],
    },
    cost: {
      input: 0,
      output: 0,
    },
    limit: {
      context: 1048576,
      output: 65536,
    },
  },
  "vision-model": {
    id: "vision-model",
    name: "Qwen Vision (OAuth)",
    description: "The latest Qwen Vision model from Alibaba Cloud ModelStudio (version: qwen3-vl-plus-2025-09-23)",
    family: "qwen",
    attachment: true,
    reasoning: false,
    tool_call: true,
    temperature: true,
    release_date: "2025-09-23",
    modalities: {
      input: ["text", "image"],
      output: ["text"],
    },
    cost: {
      input: 0,
      output: 0,
    },
    limit: {
      context: 131072,
      output: 8192,
    },
  },
} as const;
