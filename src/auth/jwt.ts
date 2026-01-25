/**
 * JWT authentication provider
 * Supports RSA and EC signed JWTs for service-to-service authentication
 */

import { readFileSync, existsSync } from "node:fs";
import { SignJWT, importPKCS8, importJWK, type KeyLike } from "jose";
import { AUTH_METHODS, QWEN_API_ENDPOINTS, TOKEN_SETTINGS } from "../constants";
import type { JwtConfig } from "../config/schema";
import type { AuthProvider, AuthResult, TokenInfo, JwtClaims, ApiRequestConfig } from "./types";

/**
 * JWT authentication provider implementation
 */
export class JwtAuthProvider implements AuthProvider {
  private config: JwtConfig;
  private useInternational: boolean;
  private privateKey: KeyLike | null = null;
  private currentToken: string | null = null;
  private tokenExpiresAt: number = 0;
  private authenticated: boolean = false;

  constructor(config: JwtConfig, useInternational: boolean = false) {
    this.config = config;
    this.useInternational = useInternational;
  }

  getMethod() {
    return AUTH_METHODS.JWT;
  }

  /**
   * Load the private key from file or string
   */
  private async loadPrivateKey(): Promise<KeyLike> {
    if (this.privateKey) {
      return this.privateKey;
    }

    let keyContent = this.config.privateKey;

    // Check if it's a file path
    if (existsSync(keyContent)) {
      keyContent = readFileSync(keyContent, "utf-8");
    }

    // Try to parse as JWK first
    try {
      const jwk = JSON.parse(keyContent);
      const key = await importJWK(jwk, this.config.algorithm);
      // importJWK can return KeyLike or Uint8Array, we need KeyLike
      if (key instanceof Uint8Array) {
        throw new Error("Symmetric keys are not supported, use RSA or EC keys");
      }
      this.privateKey = key;
      return this.privateKey;
    } catch (err) {
      // Not JWK or invalid, try PEM format
      if (err instanceof Error && err.message.includes("Symmetric keys")) {
        throw err;
      }
    }

    // Parse as PEM
    try {
      this.privateKey = await importPKCS8(keyContent, this.config.algorithm);
      return this.privateKey;
    } catch (error) {
      throw new Error(`Failed to load private key: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  /**
   * Generate a new JWT token
   */
  private async generateToken(): Promise<string> {
    const key = await this.loadPrivateKey();
    const now = Math.floor(Date.now() / 1000);
    const exp = now + (this.config.expirationSeconds || TOKEN_SETTINGS.defaultExpirationSeconds);

    const jwt = new SignJWT({})
      .setProtectedHeader({
        alg: this.config.algorithm,
        kid: this.config.keyId,
        typ: "JWT",
      })
      .setIssuer(this.config.issuer)
      .setIssuedAt(now)
      .setExpirationTime(exp)
      .setJti(generateJti());

    if (this.config.audience) {
      jwt.setAudience(this.config.audience);
    }

    const token = await jwt.sign(key);

    this.currentToken = token;
    this.tokenExpiresAt = exp * 1000; // Convert to milliseconds

    return token;
  }

  async authenticate(): Promise<AuthResult> {
    try {
      const token = await this.generateToken();
      this.authenticated = true;

      return {
        success: true,
        method: AUTH_METHODS.JWT,
        token,
        expiresAt: this.tokenExpiresAt,
      };
    } catch (error) {
      return {
        success: false,
        method: AUTH_METHODS.JWT,
        error: error instanceof Error ? error.message : "Authentication failed",
      };
    }
  }

  async getToken(): Promise<string | null> {
    // Check if we need to refresh the token
    if (this.shouldRefresh()) {
      const success = await this.refresh();
      if (!success) {
        return null;
      }
    }

    return this.currentToken;
  }

  isAuthenticated(): boolean {
    return this.authenticated && !this.isExpired();
  }

  /**
   * Check if the current token is expired
   */
  private isExpired(): boolean {
    return Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Check if we should refresh the token (before it expires)
   */
  private shouldRefresh(): boolean {
    const bufferMs = TOKEN_SETTINGS.refreshBufferSeconds * 1000;
    return Date.now() >= (this.tokenExpiresAt - bufferMs);
  }

  async refresh(): Promise<boolean> {
    try {
      await this.generateToken();
      return true;
    } catch {
      this.authenticated = false;
      return false;
    }
  }

  async revoke(): Promise<void> {
    this.currentToken = null;
    this.tokenExpiresAt = 0;
    this.authenticated = false;
  }

  getTokenInfo(): TokenInfo | null {
    if (!this.currentToken) {
      return null;
    }

    return {
      token: this.currentToken,
      tokenType: "Bearer",
      expiresAt: this.tokenExpiresAt,
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
        "Authorization": `Bearer ${this.currentToken}`,
        "Content-Type": "application/json",
      },
      baseUrl,
    };
  }

  /**
   * Get the JWT claims from the current token
   */
  getClaims(): JwtClaims | null {
    if (!this.currentToken) {
      return null;
    }

    try {
      // Decode the JWT payload (base64url)
      const parts = this.currentToken.split(".");
      if (parts.length !== 3) {
        return null;
      }

      const payload = parts[1];
      if (!payload) {
        return null;
      }
      const decoded = Buffer.from(payload, "base64url").toString("utf-8");
      return JSON.parse(decoded) as JwtClaims;
    } catch {
      return null;
    }
  }
}

/**
 * Generate a unique JWT ID
 */
function generateJti(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Validates JWT configuration
 */
export function validateJwtConfig(config: JwtConfig): string | null {
  if (!config.privateKey) {
    return "Private key is required";
  }

  if (!config.keyId) {
    return "Key ID is required";
  }

  if (!config.issuer) {
    return "Issuer is required";
  }

  if (!["RS256", "ES256"].includes(config.algorithm)) {
    return "Algorithm must be RS256 or ES256";
  }

  return null;
}
