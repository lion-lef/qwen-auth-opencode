# qwen-auth

Authentication plugin for [OpenCode](https://github.com/opencode-ai/opencode) that enables Qwen model access from Alibaba Cloud DashScope.

## Overview

This plugin integrates with the OpenCode plugin system to provide two authentication methods for accessing Qwen models:

- **Qwen OAuth** (recommended) — Uses the [RFC 8628 Device Authorization Flow](https://datatracker.ietf.org/doc/html/rfc8628) via `chat.qwen.ai`. Free tier with 2,000 requests/day.
- **DashScope API Key** — For users with a DashScope API key from Alibaba Cloud.

Compatible with [OpenCode](https://github.com/opencode-ai/opencode) plugin architecture and [qwen-code](https://github.com/QwenLM/qwen-code) OAuth endpoints.

## Installation

### Directory Plugin (recommended)

Clone the repository and reference it directly in your `opencode.json`. Bun loads TypeScript source files without a build step:

```bash
git clone https://github.com/lion-lef/qwen-auth-opencode.git
cd qwen-auth-opencode
bun install
```

Then add it to your `opencode.json`:

```json
{
  "plugin": ["./path/to/qwen-auth-opencode"]
}
```

### Package Manager

```bash
bun add qwen-auth
# or
npm install qwen-auth
```

### Bundled One-File Plugin

Build a self-contained JavaScript file that can be placed directly in an OpenCode plugins directory:

```bash
git clone https://github.com/lion-lef/qwen-auth-opencode.git
cd qwen-auth-opencode
bun install
bun run build:plugin
```

Then copy the output:

```bash
# Global plugins directory
cp dist/qwen-auth-plugin.js ~/.config/opencode/plugins/

# Or project-specific
mkdir -p .opencode/plugins
cp dist/qwen-auth-plugin.js .opencode/plugins/
```

## Configuration

Add the Qwen provider and plugin to your `opencode.json`:

```json
{
  "provider": {
    "qwen": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "Qwen (DashScope)",
      "options": {
        "baseURL": "https://dashscope.aliyuncs.com/compatible-mode/v1"
      },
      "models": {
        "qwen-turbo": { "name": "Qwen Turbo" },
        "qwen-coder-plus": { "name": "Qwen Coder Plus" }
      }
    }
  },
  "plugin": ["qwen-auth"]
}
```

See [`examples/test-repo/opencode.json`](examples/test-repo/opencode.json) for a complete configuration example.

## Authentication

### Qwen OAuth (free tier)

When OpenCode prompts for authentication, select **"Qwen OAuth (Free)"**:

1. The plugin initiates a device authorization request.
2. A browser window opens to `chat.qwen.ai` for sign-in.
3. After authorization, the plugin polls for tokens automatically.
4. Credentials are stored locally and refreshed as needed.

In headless environments (SSH, containers), the plugin displays a URL and user code to enter manually.

OAuth users get access to additional models (`coder-model`, `vision-model`) routed through `portal.qwen.ai`.

### DashScope API Key

Set an environment variable:

```bash
export QWEN_API_KEY="sk-your-api-key"
# or
export DASHSCOPE_API_KEY="sk-your-api-key"
```

Or select **"DashScope API Key"** when prompted and enter your key interactively. Both China (`dashscope.aliyuncs.com`) and International (`dashscope-intl.aliyuncs.com`) endpoints are supported.

## Environment Variables

| Variable | Description |
|---|---|
| `QWEN_API_KEY` | DashScope API key |
| `DASHSCOPE_API_KEY` | Alternative API key variable |
| `QWEN_AUTH_DEBUG` | Enable debug logging (`true` / `1`) |
| `QWEN_USE_INTERNATIONAL` | Use international endpoint (`true` / `1`) |

## Supported Models

| Model | Description |
|---|---|
| `qwen-turbo` | Fast, general-purpose |
| `qwen-plus` | Enhanced capabilities |
| `qwen-max` | Most capable |
| `qwen-max-longcontext` | Extended context window |
| `qwen-coder-turbo` | Code-focused, fast |
| `qwen-coder-plus` | Enhanced code model |
| `qwen2.5-coder-32b-instruct` | Latest coder instruct model |
| `qwen2.5-72b-instruct` | Large instruct model |
| `qwq-32b-preview` | Preview model |
| `qwen-vl-plus` / `qwen-vl-max` | Vision models |
| `qwen-audio-turbo` | Audio model |

## API

### Plugin Entry Point

```typescript
import { QwenAuthPlugin } from "qwen-auth";

// Returns hooks for OpenCode: auth and chat.headers
const hooks = await QwenAuthPlugin(pluginInput);
```

The plugin provides two hooks:

- **`auth`** — Registers authentication methods (OAuth and API Key) and a loader that handles token refresh and OAuth fetch wrapping.
- **`chat.headers`** — Adds Qwen-specific headers (`User-Agent`, `X-DashScope-Client`) to outgoing requests.

### OAuth Device Flow (programmatic use)

```typescript
import { QwenOAuthDeviceFlow } from "qwen-auth/src/qwen-oauth";

const flow = new QwenOAuthDeviceFlow();
const authInfo = await flow.startAuthorization();

console.log(`Visit: ${authInfo.verificationUri}`);
console.log(`Code:  ${authInfo.userCode}`);

const credentials = await flow.waitForAuthorization();
console.log("Access token:", credentials.accessToken);
```

### Configuration Loading

```typescript
import { loadConfig, createDefaultApiKeyConfig } from "qwen-auth/src/config";

const config = loadConfig(process.cwd());
// or
const config = createDefaultApiKeyConfig("sk-your-api-key");
```

### API Key Provider

```typescript
import { ApiKeyAuthProvider } from "qwen-auth/src/auth";

const provider = new ApiKeyAuthProvider({ apiKey: "sk-..." }, false);
const result = await provider.authenticate();
```

## OAuth Endpoints

This plugin uses the same OAuth endpoints as [qwen-code](https://github.com/QwenLM/qwen-code):

| Parameter | Value |
|---|---|
| Base URL | `https://chat.qwen.ai` |
| Device Code | `https://chat.qwen.ai/api/v1/oauth2/device/code` |
| Token | `https://chat.qwen.ai/api/v1/oauth2/token` |
| Client ID | `f0304373b74a44d2b584a3fb70ca9e56` |
| Scope | `openid profile email model.completion` |
| Grant Type | `urn:ietf:params:oauth:grant-type:device_code` |

## Development

```bash
bun install          # Install dependencies
bun test             # Run tests
bun run typecheck    # Type check
bun run lint         # Lint with ESLint
bun run format:check # Check formatting with Prettier
bun run build        # TypeScript compilation
bun run build:plugin # Build one-file plugin
bun run build:all    # Build everything
```

## Project Structure

```
index.ts                  # Root entry point (exports plugin function + types)
src/
  index.ts                # Internal barrel exports
  opencode-plugin.ts      # Main plugin implementation (auth + chat.headers hooks)
  qwen-oauth.ts           # OAuth 2.0 Device Flow with PKCE
  constants.ts            # Provider IDs, endpoints, OAuth config, model definitions
  auth/
    api-key.ts            # DashScope API key authentication provider
    types.ts              # Auth provider interfaces
  config/
    loader.ts             # Configuration loading from env/files
    schema.ts             # Zod validation schema
  plugin/
    auth.ts               # Auth helper utilities (token expiry, type guards)
    browser.ts            # Browser opening and headless detection
    debug.ts              # Debug logging (enabled via QWEN_AUTH_DEBUG)
    fetch-wrapper.ts      # OAuth fetch wrapper (URL rewriting for portal.qwen.ai)
    headers.ts            # Custom Qwen request headers
    storage.ts            # Credential persistence
    types.ts              # Plugin type definitions
  utils/
    logger.ts             # Logger utility
examples/
  test-repo/              # Complete opencode.json configuration example
scripts/
  build-plugin.ts         # One-file plugin bundler
```

## License

MIT — see [LICENSE](LICENSE).
