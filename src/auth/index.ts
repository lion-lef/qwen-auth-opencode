/**
 * Authentication module exports
 */

export type {
  AuthResult,
  TokenInfo,
  AuthProvider,
  OAuthAuthorizationResponse,
  OAuthTokenResponse,
  JwtClaims,
  ApiRequestConfig,
  AuthEventType,
  AuthEvent,
  AuthEventHandler,
} from "./types";

export { ApiKeyAuthProvider, validateApiKeyFormat, maskApiKey } from "./api-key";
export { JwtAuthProvider, validateJwtConfig } from "./jwt";
export { OAuthAuthProvider, validateOAuthConfig } from "./oauth";
