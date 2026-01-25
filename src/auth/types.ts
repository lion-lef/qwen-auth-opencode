/**
 * Type definitions for authentication module
 */

import type { AuthMethod } from "../constants";

/**
 * Base authentication result
 */
export interface AuthResult {
  success: boolean;
  method: AuthMethod;
  token?: string;
  expiresAt?: number;
  error?: string;
}

/**
 * Token information
 */
export interface TokenInfo {
  /** The access token */
  token: string;
  /** Token type (usually "Bearer") */
  tokenType: string;
  /** Expiration timestamp in milliseconds */
  expiresAt: number;
  /** Refresh token (if available) */
  refreshToken?: string;
  /** Scopes granted */
  scopes?: string[];
}

/**
 * Authentication provider interface
 */
export interface AuthProvider {
  /** Get the authentication method */
  getMethod(): AuthMethod;

  /** Authenticate and get a token */
  authenticate(): Promise<AuthResult>;

  /** Get the current token (or refresh if expired) */
  getToken(): Promise<string | null>;

  /** Check if currently authenticated */
  isAuthenticated(): boolean;

  /** Refresh the current token */
  refresh(): Promise<boolean>;

  /** Revoke the current authentication */
  revoke(): Promise<void>;

  /** Get token information */
  getTokenInfo(): TokenInfo | null;
}

/**
 * OAuth authorization response
 */
export interface OAuthAuthorizationResponse {
  authorizationUrl: string;
  state: string;
  codeVerifier?: string;
}

/**
 * OAuth token response
 */
export interface OAuthTokenResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  refreshToken?: string;
  scope?: string;
  idToken?: string;
}

/**
 * JWT claims
 */
export interface JwtClaims {
  iss: string;
  sub?: string;
  aud?: string;
  exp: number;
  iat: number;
  jti?: string;
  [key: string]: unknown;
}

/**
 * API request configuration
 */
export interface ApiRequestConfig {
  headers: Record<string, string>;
  baseUrl: string;
}

/**
 * Authentication event types
 */
export type AuthEventType =
  | "authenticated"
  | "token_refreshed"
  | "token_expired"
  | "authentication_failed"
  | "revoked"
  | "rate_limited";

/**
 * Authentication event
 */
export interface AuthEvent {
  type: AuthEventType;
  timestamp: number;
  method: AuthMethod;
  details?: Record<string, unknown>;
}

/**
 * Authentication event handler
 */
export type AuthEventHandler = (event: AuthEvent) => void;
