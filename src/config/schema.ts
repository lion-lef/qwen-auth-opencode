/**
 * Configuration schema for qwen-auth plugin
 * Simplified schema for OpenCode plugin integration
 */

import { z } from "zod";
import { QWEN_MODELS } from "../constants";

/**
 * Schema for API Key authentication configuration
 */
export const ApiKeyConfigSchema = z.object({
  /** The API key for DashScope/Qwen API */
  apiKey: z.string().min(1, "API key is required"),
  /** Optional base URL override */
  baseUrl: z.string().url().optional(),
});

/**
 * Main configuration schema for qwen-auth
 * Focused on OpenCode plugin integration
 */
export const QwenAuthConfigSchema = z.object({
  /** API Key authentication configuration */
  apiKey: ApiKeyConfigSchema.optional(),
  /** Default model to use */
  defaultModel: z.enum(Object.keys(QWEN_MODELS) as [string, ...string[]]).optional(),
  /** Enable debug logging */
  debug: z.boolean().default(false),
  /** Use international endpoint */
  useInternationalEndpoint: z.boolean().default(false),
});

export type ApiKeyConfig = z.infer<typeof ApiKeyConfigSchema>;
export type QwenAuthConfig = z.infer<typeof QwenAuthConfigSchema>;

/**
 * Validates a configuration object against the schema
 */
export function validateConfig(config: unknown): QwenAuthConfig {
  return QwenAuthConfigSchema.parse(config);
}

/**
 * Creates a default configuration for API key authentication
 */
export function createDefaultApiKeyConfig(apiKey: string): QwenAuthConfig {
  return {
    apiKey: { apiKey },
    debug: false,
    useInternationalEndpoint: false,
  };
}
