/**
 * Authentication module exports
 * For OpenCode plugin integration with Qwen
 */

export type { AuthResult, TokenInfo, AuthProvider, ApiRequestConfig } from "./types";

export { ApiKeyAuthProvider, validateApiKeyFormat, maskApiKey } from "./api-key";
