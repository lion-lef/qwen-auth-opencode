/**
 * Authentication helper utilities
 * Contains functions for checking auth type and token expiration
 */

import type { AuthDetails, OAuthAuthDetails } from "./types";

/**
 * Buffer time before access token expiration (5 minutes in milliseconds)
 */
export const ACCESS_TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

/**
 * Type guard to check if auth is OAuth type
 */
export function isOAuthAuth(auth: AuthDetails): auth is OAuthAuthDetails {
  return auth.type === "oauth";
}

/**
 * Type guard to check if auth is API type
 */
export function isApiAuth(
  auth: AuthDetails
): auth is { type: "api"; key?: string } {
  return auth.type === "api";
}

/**
 * Determines whether an access token is expired or missing
 * Includes buffer time for clock skew
 */
export function accessTokenExpired(auth: OAuthAuthDetails): boolean {
  if (!auth.access || typeof auth.expires !== "number") {
    return true;
  }
  return auth.expires <= Date.now() + ACCESS_TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * Check if token needs refresh (within buffer time of expiration)
 */
export function tokenNeedsRefresh(expires: number | undefined): boolean {
  if (!expires || typeof expires !== "number") {
    return true;
  }
  return expires < Date.now() + ACCESS_TOKEN_EXPIRY_BUFFER_MS;
}

/**
 * Calculate expiration timestamp from expires_in seconds
 */
export function calculateExpiresAt(expiresInSeconds: number): number {
  return Date.now() + expiresInSeconds * 1000;
}
