/**
 * Fetch wrapper for OAuth authentication
 * Handles token refresh and header injection for OAuth requests
 */

import type { GetAuth, OAuthAuthDetails, PluginClient } from "./types";
import { isOAuthAuth, accessTokenExpired, calculateExpiresAt } from "./auth";
import { refreshAccessToken } from "../qwen-oauth";
import { QWEN_PROVIDER_ID } from "../constants";

/**
 * OAuth dummy key used for OAuth authentication (OpenCode convention)
 * This is a placeholder key that signals to use OAuth instead of API key
 */
export const OAUTH_DUMMY_KEY = "sk-oauth-qwen-auth";

/**
 * Remove authorization headers from headers object
 * Supports Headers, array, and object formats
 */
function removeAuthorizationHeader(
  headers: HeadersInit | undefined
): HeadersInit | undefined {
  if (!headers) return headers;

  if (headers instanceof Headers) {
    headers.delete("authorization");
    headers.delete("Authorization");
    return headers;
  }

  if (Array.isArray(headers)) {
    return headers.filter(([key]) => key.toLowerCase() !== "authorization");
  }

  // Object format
  const result = { ...headers } as Record<string, string>;
  delete result["authorization"];
  delete result["Authorization"];
  return result;
}

/**
 * Convert various header formats to Headers object
 */
function toHeaders(init: HeadersInit | undefined): Headers {
  const headers = new Headers();

  if (!init) return headers;

  if (init instanceof Headers) {
    init.forEach((value, key) => headers.set(key, value));
  } else if (Array.isArray(init)) {
    for (const [key, value] of init) {
      if (value !== undefined) headers.set(key, String(value));
    }
  } else {
    for (const [key, value] of Object.entries(init)) {
      if (value !== undefined) headers.set(key, String(value));
    }
  }

  return headers;
}

/**
 * Create a custom fetch function that handles OAuth token refresh and header injection
 */
export function createOAuthFetch(
  getAuth: GetAuth,
  client: PluginClient
): (input: RequestInfo | URL, init?: RequestInit) => Promise<Response> {
  return async function oauthFetch(
    requestInput: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> {
    // Remove dummy API key authorization header if present
    if (init?.headers) {
      init.headers = removeAuthorizationHeader(init.headers);
    }

    let currentAuth = await getAuth();

    // If not OAuth auth, fall back to regular fetch
    if (!isOAuthAuth(currentAuth)) {
      return fetch(requestInput, init);
    }

    // Check if token needs refresh
    if (accessTokenExpired(currentAuth)) {
      if (currentAuth.refresh) {
        try {
          const tokens = await refreshAccessToken(currentAuth.refresh);
          const newAuth: OAuthAuthDetails = {
            type: "oauth",
            refresh: tokens.refresh_token || currentAuth.refresh,
            access: tokens.access_token,
            expires: calculateExpiresAt(tokens.expires_in),
          };

          await client.auth.set({
            path: { id: QWEN_PROVIDER_ID },
            body: newAuth,
          });

          currentAuth = await getAuth();
        } catch (error) {
          console.error("Failed to refresh Qwen OAuth token:", error);
          throw new Error(
            "Qwen OAuth token refresh failed. Please re-authenticate."
          );
        }
      }
    }

    // Build headers with OAuth token
    const headers = toHeaders(init?.headers);

    // Set authorization header with access token
    if (isOAuthAuth(currentAuth) && currentAuth.access) {
      headers.set("authorization", `Bearer ${currentAuth.access}`);
    }

    return fetch(requestInput, { ...init, headers });
  };
}
