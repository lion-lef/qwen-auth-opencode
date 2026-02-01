/**
 * Configuration loader for qwen-auth plugin
 * Handles loading configuration from environment and files
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import type { QwenAuthConfig } from "./schema";
import { validateConfig, createDefaultApiKeyConfig } from "./schema";

/** Environment variable names for configuration */
const ENV_VARS = {
  apiKey: "QWEN_API_KEY",
  dashScopeApiKey: "DASHSCOPE_API_KEY",
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
    paths.push(join(workingDir, "opencode.json"));
    paths.push(join(workingDir, ".opencode.json"));
  }

  // Home directory config
  const home = homedir();
  paths.push(join(home, ".opencode.json"));
  paths.push(join(home, ".config", "opencode", "config.json"));

  // XDG config
  const xdgConfig = process.env.XDG_CONFIG_HOME || join(home, ".config");
  paths.push(join(xdgConfig, "opencode", "config.json"));

  return paths;
}

/**
 * Loads configuration from environment variables
 */
export function loadFromEnvironment(): Partial<QwenAuthConfig> | null {
  const apiKey = process.env[ENV_VARS.apiKey] || process.env[ENV_VARS.dashScopeApiKey];
  const debug = process.env[ENV_VARS.debug] === "true";
  const useInternational = process.env[ENV_VARS.useInternational] === "true";

  if (apiKey) {
    return {
      apiKey: { apiKey },
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

    // Check if this is an opencode config file with qwen provider
    if (parsed.providers?.qwen) {
      return extractQwenConfig(parsed.providers.qwen);
    }

    // Check if this is a standalone qwen-auth config
    if (parsed.apiKey) {
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

  if (typeof providerConfig.apiKey === "string") {
    config.apiKey = {
      apiKey: providerConfig.apiKey,
      baseUrl: typeof providerConfig.baseUrl === "string" ? providerConfig.baseUrl : undefined,
    };
  } else if (typeof providerConfig.apiKey === "object" && providerConfig.apiKey !== null) {
    config.apiKey = providerConfig.apiKey as { apiKey: string; baseUrl?: string };
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
  const apiKey = process.env[ENV_VARS.apiKey] || process.env[ENV_VARS.dashScopeApiKey];
  if (apiKey) {
    return createDefaultApiKeyConfig(apiKey);
  }

  // Return empty config - Qwen OAuth does not require pre-configuration
  return {
    debug: false,
    useInternationalEndpoint: false,
  };
}

/**
 * Checks if configuration is available
 */
export function hasConfig(workingDir?: string): boolean {
  try {
    const config = loadConfig(workingDir);
    return config.apiKey !== undefined;
  } catch {
    return false;
  }
}
