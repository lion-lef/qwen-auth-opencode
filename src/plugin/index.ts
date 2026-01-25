/**
 * Plugin module exports
 * Re-exports all plugin-related functionality
 */

// Type exports
export type {
  AuthDetails,
  OAuthAuthDetails,
  ApiKeyAuthDetails,
  NonOAuthAuthDetails,
  GetAuth,
  Provider,
  ProviderModel,
  LoaderResult,
  PluginClient,
  PluginContext,
  PluginResult,
  AuthOAuthResult,
  AuthApiResult,
  AuthPrompt,
  AuthMethod,
  AuthHook,
  Model,
  ChatHeadersInput,
  ChatHeadersOutput,
  Hooks,
  StoredCredentials,
} from "./types";

// Auth helper exports
export {
  isOAuthAuth,
  isApiAuth,
  accessTokenExpired,
  tokenNeedsRefresh,
  calculateExpiresAt,
  ACCESS_TOKEN_EXPIRY_BUFFER_MS,
} from "./auth";

// Storage exports
export {
  loadCredentials,
  saveCredentials,
  clearCredentials,
  hasStoredCredentials,
  getCredentialsPath,
  getCredentialsDir,
} from "./storage";

// Browser exports
export { openBrowser, isHeadlessEnvironment } from "./browser";

// Fetch wrapper exports
export { createOAuthFetch, OAUTH_DUMMY_KEY } from "./fetch-wrapper";

// Headers exports
export {
  getUserAgent,
  getDashScopeClient,
  QWEN_HEADERS,
  applyQwenHeaders,
} from "./headers";

// Server exports (OAuth callback server)
export {
  startOAuthListener,
  OAUTH_CALLBACK_PORT,
  OAUTH_CALLBACK_PATH,
  OAUTH_REDIRECT_URI,
} from "./server";
export type { OAuthListener, OAuthListenerOptions } from "./server";

// Debug exports
export {
  isDebugEnabled,
  getDebugLogPath,
  startQwenDebugRequest,
  logQwenDebugResponse,
  logDebugMessage,
} from "./debug";
export type {
  QwenDebugContext,
  QwenDebugRequestMeta,
  QwenDebugResponseMeta,
} from "./debug";
