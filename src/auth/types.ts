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
 * API request configuration
 */
export interface ApiRequestConfig {
  headers: Record<string, string>;
  baseUrl: string;
}
