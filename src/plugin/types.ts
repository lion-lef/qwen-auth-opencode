/**
 * Type definitions for the qwen-auth plugin
 * Follows the pattern from opencode-google-antigravity-auth
 */

import type { Plugin, PluginInput } from "@opencode-ai/plugin";

/**
 * OAuth authentication details
 */
export interface OAuthAuthDetails {
  type: "oauth";
  refresh: string;
  access: string;
  expires: number;
}

/**
 * API key authentication details
 */
export interface ApiKeyAuthDetails {
  type: "api";
  key?: string;
}

/**
 * Non-OAuth authentication details (catch-all)
 */
export interface NonOAuthAuthDetails {
  type: string;
  [key: string]: unknown;
}

/**
 * Combined auth details type
 */
export type AuthDetails = OAuthAuthDetails | ApiKeyAuthDetails | NonOAuthAuthDetails;

/**
 * Function to get current authentication state
 */
export type GetAuth = () => Promise<AuthDetails>;

/**
 * Provider model configuration
 */
export interface ProviderModel {
  cost?: {
    input: number;
    output: number;
    cache?: {
      read: number;
      write: number;
    };
  };
  [key: string]: unknown;
}

/**
 * Provider configuration
 */
export interface Provider {
  models?: Record<string, ProviderModel>;
}

/**
 * Loader result returned from auth.loader
 */
export interface LoaderResult {
  apiKey?: string;
  fetch?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

/**
 * Plugin client type (from @opencode-ai/plugin)
 */
export type PluginClient = PluginInput["client"];

/**
 * Plugin context passed to the plugin function
 */
export interface PluginContext {
  client: PluginClient;
  project: unknown;
  directory: string;
  worktree: string;
  serverUrl: URL;
}

/**
 * Plugin result type
 */
export type PluginResult = Awaited<ReturnType<Plugin>>;

/**
 * OAuth authorization result
 */
export interface AuthOAuthResult {
  url: string;
  instructions: string;
  method: "auto" | "code";
  callback(): Promise<
    | { type: "success"; refresh: string; access: string; expires: number }
    | { type: "success"; key: string }
    | { type: "failed" }
  >;
}

/**
 * API key authorization result
 */
export interface AuthApiResult {
  type: "success";
  key: string;
}

/**
 * Authorization prompt configuration
 */
export interface AuthPrompt {
  type: "text" | "select";
  key: string;
  message: string;
  placeholder?: string;
  validate?: (value: string) => string | undefined;
  options?: Array<{
    label: string;
    value: string;
    hint?: string;
  }>;
}

/**
 * Authentication method configuration
 */
export interface AuthMethod {
  label: string;
  type: "oauth" | "api";
  prompts?: AuthPrompt[];
  authorize?: (
    inputs?: Record<string, string>,
  ) => Promise<AuthOAuthResult | AuthApiResult | { type: "failed" }>;
}

/**
 * Auth hook configuration
 */
export interface AuthHook {
  provider: string;
  loader?: (getAuth: GetAuth, provider: Provider) => Promise<LoaderResult>;
  methods: AuthMethod[];
}

/**
 * Model reference in chat context
 */
export interface Model {
  providerID: string;
  modelID: string;
}

/**
 * Input for chat.headers hook
 */
export interface ChatHeadersInput {
  sessionID: string;
  agent: string;
  model: Model;
  provider: unknown;
  message: unknown;
}

/**
 * Output for chat.headers hook
 */
export interface ChatHeadersOutput {
  headers: Record<string, string>;
}

/**
 * Plugin hooks interface
 */
export interface Hooks {
  auth?: AuthHook;
  "chat.headers"?: (input: ChatHeadersInput, output: ChatHeadersOutput) => Promise<void>;
}

/**
 * Stored credentials interface
 */
export interface StoredCredentials {
  type: "oauth" | "api_key";
  // OAuth fields
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  // API Key fields
  apiKey?: string;
}
