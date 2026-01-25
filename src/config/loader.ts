/**
 * Configuration loader for qwen-auth plugin
 * Handles loading configuration from various sources
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { QwenAuthConfig, validateConfig, createDefaultApiKeyConfig } from "./schema";
import { AUTH_METHODS } from "../constants";

/** Environment variable names for configuration */
const ENV_VARS = {
  apiKey: "QWEN_API_KEY",
  jwtPrivateKey: "QWEN_JWT_PRIVATE_KEY",
  jwtKeyId: "QWEN_JWT_KEY_ID",
  jwtIssuer: "QWEN_JWT_ISSUER",
  oauthClientId: "QWEN_OAUTH_CLIENT_ID",
  oauthClientSecret: "QWEN_OAUTH_CLIENT_SECRET",
  authMethod: "QWEN_AUTH_METHOD",
  debug: "QWEN_AUTH_DEBUG",
  useInternational: "QWEN_USE_INTERNATIONAL",
} as const;

/**
 * Configuration file locations to search
 */
function getConfigPaths(workingDir?: string): string[] {
  const paths: string[] = [];

  // Working directory config
  if (workingDir) {
    paths.push(join(workingDir, ".opencode.json"));
    paths.push(join(workingDir, "opencode.json"));
    paths.push(join(workingDir, ".qwen-auth.json"));
  }

  // Home directory config
  const home = homedir();
  paths.push(join(home, ".opencode.json"));
  paths.push(join(home, ".config", "opencode", "config.json"));
  paths.push(join(home, ".config", "qwen-auth", "config.json"));

  // XDG config
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, ".config");
  paths.push(join(xdgConfig, "opencode", "config.json"));
  paths.push(join(xdgConfig, "qwen-auth", "config.json"));

  return paths;
}

/**
 * Loads configuration from environment variables
 */
export function loadFromEnvironment(): Partial<QwenAuthConfig> | null {
  const apiKey = process.env[ENV_VARS.apiKey];
  const authMethod = process.env[ENV_VARS.authMethod];
  const debug = process.env[ENV_VARS.debug] === "true";
  const useInternational = process.env[ENV_VARS.useInternational] === "true";

  // API Key authentication from environment
  if (apiKey) {
    return {
      method: AUTH_METHODS.API_KEY,
      apiKey: { apiKey },
      debug,
      useInternationalEndpoint: useInternational,
    };
  }

  // JWT authentication from environment
  const jwtPrivateKey = process.env[ENV_VARS.jwtPrivateKey];
  const jwtKeyId = process.env[ENV_VARS.jwtKeyId];
  const jwtIssuer = process.env[ENV_VARS.jwtIssuer];

  if (jwtPrivateKey && jwtKeyId && jwtIssuer) {
    return {
      method: AUTH_METHODS.JWT,
      jwt: {
        privateKey: jwtPrivateKey,
        keyId: jwtKeyId,
        issuer: jwtIssuer,
        expirationSeconds: 3600,
        algorithm: "RS256",
      },
      debug,
      useInternationalEndpoint: useInternational,
    };
  }

  // OAuth authentication from environment
  const oauthClientId = process.env[ENV_VARS.oauthClientId];
  const oauthClientSecret = process.env[ENV_VARS.oauthClientSecret];

  if (oauthClientId && oauthClientSecret) {
    return {
      method: AUTH_METHODS.OAUTH,
      oauth: {
        clientId: oauthClientId,
        clientSecret: oauthClientSecret,
        redirectUri: "http://localhost:8765/callback",
        scopes: ["openid", "profile"],
      },
      debug,
      useInternationalEndpoint: useInternational,
    };
  }

  return null;
}

/**
 * Loads configuration from a file
 */
export function loadFromFile(filePath: string): Partial<QwenAuthConfig> | null {
  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);

    // Check if this is an opencode config file
    if (parsed.providers?.qwen) {
      return extractQwenConfig(parsed.providers.qwen);
    }

    // Check if this is a standalone qwen-auth config
    if (parsed.method || parsed.apiKey || parsed.jwt || parsed.oauth) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Extracts qwen-auth config from opencode provider config
 */
function extractQwenConfig(providerConfig: Record<string, unknown>): Partial<QwenAuthConfig> {
  const config: Partial<QwenAuthConfig> = {};

  // Determine auth method
  if (providerConfig.apiKey) {
    config.method = AUTH_METHODS.API_KEY;
    config.apiKey = {
      apiKey: providerConfig.apiKey as string,
      baseUrl: providerConfig.baseUrl as string | undefined,
    };
  } else if (providerConfig.jwt) {
    config.method = AUTH_METHODS.JWT;
    config.jwt = providerConfig.jwt as QwenAuthConfig["jwt"];
  } else if (providerConfig.oauth) {
    config.method = AUTH_METHODS.OAUTH;
    config.oauth = providerConfig.oauth as QwenAuthConfig["oauth"];
  }

  if (providerConfig.security) {
    config.security = providerConfig.security as QwenAuthConfig["security"];
  }

  if (providerConfig.debug !== undefined) {
    config.debug = providerConfig.debug as boolean;
  }

  if (providerConfig.useInternationalEndpoint !== undefined) {
    config.useInternationalEndpoint = providerConfig.useInternationalEndpoint as boolean;
  }

  return config;
}

/**
 * Loads and merges configuration from all sources
 * Priority: Environment > Working Directory > Home Directory
 */
export function loadConfig(workingDir?: string): QwenAuthConfig {
  // Try environment variables first
  const envConfig = loadFromEnvironment();
  if (envConfig) {
    try {
      return validateConfig(envConfig);
    } catch {
      // Fall through to file-based config
    }
  }

  // Search for config files
  const configPaths = getConfigPaths(workingDir);

  for (const path of configPaths) {
    const fileConfig = loadFromFile(path);
    if (fileConfig) {
      try {
        // Merge environment overrides with file config
        const merged = { ...fileConfig };

        // Allow environment to override specific settings
        if (process.env[ENV_VARS.debug] !== undefined) {
          merged.debug = process.env[ENV_VARS.debug] === "true";
        }
        if (process.env[ENV_VARS.useInternational] !== undefined) {
          merged.useInternationalEndpoint = process.env[ENV_VARS.useInternational] === "true";
        }

        return validateConfig(merged);
      } catch {
        // Try next config file
        continue;
      }
    }
  }

  // Check for API key in environment as last resort
  const apiKey = process.env[ENV_VARS.apiKey];
  if (apiKey) {
    return createDefaultApiKeyConfig(apiKey);
  }

  throw new Error(
    "No valid qwen-auth configuration found. Please set QWEN_API_KEY environment variable or create a configuration file."
  );
}

/**
 * Checks if configuration is available
 */
export function hasConfig(workingDir?: string): boolean {
  try {
    loadConfig(workingDir);
    return true;
  } catch {
    return false;
  }
}
