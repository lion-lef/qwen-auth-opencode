/**
 * OAuth authentication provider
 * Supports OAuth 2.0 authorization code flow with PKCE
 */

import { createServer } from "node:http";
import { exec } from "node:child_process";
import { randomBytes, createHash } from "node:crypto";
import { AUTH_METHODS, QWEN_API_ENDPOINTS, OAUTH_CONFIG, TOKEN_SETTINGS } from "../constants";
import type { OAuthConfig } from "../config/schema";
import type {
  AuthProvider,
  AuthResult,
  TokenInfo,
  OAuthAuthorizationResponse,
  OAuthTokenResponse,
  ApiRequestConfig,
} from "./types";

/**
 * OAuth authentication provider implementation
 */
export class OAuthAuthProvider implements AuthProvider {
  private config: OAuthConfig;
  private useInternational: boolean;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private scopes: string[] = [];
  private authenticated: boolean = false;
  private server: ReturnType<typeof createServer> | null = null;

  constructor(config: OAuthConfig, useInternational: boolean = false) {
    this.config = config;
    this.useInternational = useInternational;
  }

  getMethod() {
    return AUTH_METHODS.OAUTH;
  }

  /**
   * Generate PKCE code verifier and challenge
   */
  private generatePkce(): { codeVerifier: string; codeChallenge: string } {
    const codeVerifier = randomBytes(32).toString("base64url");
    const codeChallenge = createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    return { codeVerifier, codeChallenge };
  }

  /**
   * Generate a random state parameter
   */
  private generateState(): string {
    return randomBytes(16).toString("hex");
  }

  /**
   * Build the authorization URL
   */
  buildAuthorizationUrl(): OAuthAuthorizationResponse {
    const state = this.generateState();
    const { codeVerifier, codeChallenge } = this.generatePkce();

    const authEndpoint = this.config.authorizationEndpoint || OAUTH_CONFIG.authorizationEndpoint;
    const url = new URL(authEndpoint);

    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", this.config.clientId);
    url.searchParams.set("redirect_uri", this.config.redirectUri);
    url.searchParams.set("scope", this.config.scopes.join(" "));
    url.searchParams.set("state", state);
    url.searchParams.set("code_challenge", codeChallenge);
    url.searchParams.set("code_challenge_method", "S256");

    return {
      authorizationUrl: url.toString(),
      state,
      codeVerifier,
    };
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCode(
    code: string,
    codeVerifier: string
  ): Promise<OAuthTokenResponse> {
    const tokenEndpoint = this.config.tokenEndpoint || OAUTH_CONFIG.tokenEndpoint;

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri,
      code_verifier: codeVerifier,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;

    return {
      accessToken: data.access_token as string,
      tokenType: (data.token_type as string) || "Bearer",
      expiresIn: (data.expires_in as number) || TOKEN_SETTINGS.defaultExpirationSeconds,
      refreshToken: data.refresh_token as string | undefined,
      scope: data.scope as string | undefined,
      idToken: data.id_token as string | undefined,
    };
  }

  /**
   * Refresh the access token using the refresh token
   */
  private async refreshAccessToken(): Promise<OAuthTokenResponse> {
    if (!this.refreshToken) {
      throw new Error("No refresh token available");
    }

    const tokenEndpoint = this.config.tokenEndpoint || OAUTH_CONFIG.tokenEndpoint;

    const body = new URLSearchParams({
      grant_type: "refresh_token",
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: this.refreshToken,
    });

    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token refresh failed: ${errorText}`);
    }

    const data = await response.json() as Record<string, unknown>;

    return {
      accessToken: data.access_token as string,
      tokenType: (data.token_type as string) || "Bearer",
      expiresIn: (data.expires_in as number) || TOKEN_SETTINGS.defaultExpirationSeconds,
      refreshToken: data.refresh_token as string | undefined,
      scope: data.scope as string | undefined,
    };
  }

  /**
   * Start a local server to receive the OAuth callback
   */
  private async startCallbackServer(
    state: string,
    codeVerifier: string
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const redirectUrl = new URL(this.config.redirectUri);
      const port = parseInt(redirectUrl.port, 10) || 8765;

      this.server = createServer((req, res) => {
        const url = new URL(req.url || "", `http://localhost:${port}`);
        const code = url.searchParams.get("code");
        const returnedState = url.searchParams.get("state");
        const error = url.searchParams.get("error");

        if (error) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end(`<html><body><h1>Authentication Failed</h1><p>${error}</p></body></html>`);
          this.server?.close();
          reject(new Error(error));
          return;
        }

        if (returnedState !== state) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h1>Authentication Failed</h1><p>State mismatch</p></body></html>");
          this.server?.close();
          reject(new Error("State mismatch"));
          return;
        }

        if (!code) {
          res.writeHead(400, { "Content-Type": "text/html" });
          res.end("<html><body><h1>Authentication Failed</h1><p>No code received</p></body></html>");
          this.server?.close();
          reject(new Error("No authorization code received"));
          return;
        }

        res.writeHead(200, { "Content-Type": "text/html" });
        res.end(`
          <html>
            <body>
              <h1>Authentication Successful!</h1>
              <p>You can close this window and return to the terminal.</p>
              <script>setTimeout(() => window.close(), 2000);</script>
            </body>
          </html>
        `);

        this.server?.close();
        resolve(code);
      });

      this.server.listen(port, () => {
        console.log(`OAuth callback server listening on port ${port}`);
      });

      this.server.on("error", (error) => {
        reject(error);
      });

      // Timeout after 5 minutes
      setTimeout(() => {
        this.server?.close();
        reject(new Error("OAuth callback timeout"));
      }, 300000);
    });
  }

  /**
   * Open the authorization URL in the default browser
   */
  private openBrowser(url: string): void {
    const platform = process.platform;

    if (platform === "darwin") {
      exec(`open "${url}"`);
    } else if (platform === "win32") {
      exec(`start "" "${url}"`);
    } else {
      // Linux and others
      exec(`xdg-open "${url}"`);
    }
  }

  async authenticate(): Promise<AuthResult> {
    try {
      // Build authorization URL
      const { authorizationUrl, state, codeVerifier } = this.buildAuthorizationUrl();

      if (!codeVerifier) {
        return {
          success: false,
          method: AUTH_METHODS.OAUTH,
          error: "Failed to generate PKCE code verifier",
        };
      }

      console.log("\nStarting OAuth authentication flow...");
      console.log("Opening browser for authentication...");
      console.log(`\nIf the browser doesn't open automatically, visit:\n${authorizationUrl}\n`);

      // Start callback server
      const codePromise = this.startCallbackServer(state, codeVerifier);

      // Open browser
      this.openBrowser(authorizationUrl);

      // Wait for callback
      const code = await codePromise;

      // Exchange code for tokens
      const tokenResponse = await this.exchangeCode(code, codeVerifier);

      // Store tokens
      this.accessToken = tokenResponse.accessToken;
      this.refreshToken = tokenResponse.refreshToken || null;
      this.tokenExpiresAt = Date.now() + tokenResponse.expiresIn * 1000;
      this.scopes = tokenResponse.scope?.split(" ") || this.config.scopes;
      this.authenticated = true;

      return {
        success: true,
        method: AUTH_METHODS.OAUTH,
        token: this.accessToken,
        expiresAt: this.tokenExpiresAt,
      };
    } catch (error) {
      return {
        success: false,
        method: AUTH_METHODS.OAUTH,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  async getToken(): Promise<string | null> {
    // Check if we need to refresh
    if (this.shouldRefresh()) {
      const success = await this.refresh();
      if (!success) {
        return null;
      }
    }

    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return this.authenticated && !this.isExpired();
  }

  private isExpired(): boolean {
    return Date.now() >= this.tokenExpiresAt;
  }

  private shouldRefresh(): boolean {
    const bufferMs = TOKEN_SETTINGS.refreshBufferSeconds * 1000;
    return Date.now() >= (this.tokenExpiresAt - bufferMs);
  }

  async refresh(): Promise<boolean> {
    if (!this.refreshToken) {
      // No refresh token, need to re-authenticate
      this.authenticated = false;
      return false;
    }

    try {
      const tokenResponse = await this.refreshAccessToken();

      this.accessToken = tokenResponse.accessToken;
      if (tokenResponse.refreshToken) {
        this.refreshToken = tokenResponse.refreshToken;
      }
      this.tokenExpiresAt = Date.now() + tokenResponse.expiresIn * 1000;
      if (tokenResponse.scope) {
        this.scopes = tokenResponse.scope.split(" ");
      }

      return true;
    } catch {
      this.authenticated = false;
      return false;
    }
  }

  async revoke(): Promise<void> {
    // Close callback server if running
    if (this.server) {
      this.server.close();
      this.server = null;
    }

    this.accessToken = null;
    this.refreshToken = null;
    this.tokenExpiresAt = 0;
    this.scopes = [];
    this.authenticated = false;
  }

  getTokenInfo(): TokenInfo | null {
    if (!this.accessToken) {
      return null;
    }

    return {
      token: this.accessToken,
      tokenType: "Bearer",
      expiresAt: this.tokenExpiresAt,
      refreshToken: this.refreshToken || undefined,
      scopes: this.scopes,
    };
  }

  /**
   * Get the API request configuration for making authenticated requests
   */
  getRequestConfig(): ApiRequestConfig {
    const baseUrl = this.useInternational
      ? QWEN_API_ENDPOINTS.international
      : QWEN_API_ENDPOINTS.primary;

    return {
      headers: {
        "Authorization": `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
      },
      baseUrl,
    };
  }

  /**
   * Set tokens from external source (e.g., loaded from storage)
   */
  setTokens(
    accessToken: string,
    refreshToken: string | null,
    expiresAt: number,
    scopes?: string[]
  ): void {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    this.tokenExpiresAt = expiresAt;
    this.scopes = scopes || this.config.scopes;
    this.authenticated = true;
  }
}

/**
 * Validates OAuth configuration
 */
export function validateOAuthConfig(config: OAuthConfig): string | null {
  if (!config.clientId) {
    return "Client ID is required";
  }

  if (!config.clientSecret) {
    return "Client secret is required";
  }

  try {
    new URL(config.redirectUri);
  } catch {
    return "Invalid redirect URI";
  }

  return null;
}
