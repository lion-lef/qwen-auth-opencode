# qwen-auth

Authentication plugin for [OpenCode](https://github.com/opencode-ai/opencode) that integrates with Qwen models from Alibaba Cloud DashScope.

## Features

- **OpenCode Plugin Architecture**
  - Follows the same pattern as OpenCode's [codex.ts](https://github.com/anomalyco/opencode/blob/dev/packages/opencode/src/plugin/codex.ts)
  - Compatible with OpenCode's authentication system
  - Provides `auth` and `chat.headers` hooks

- **Authentication Methods**
  - **Qwen OAuth** (recommended, free tier) - Compatible with [qwen-code](https://github.com/QwenLM/qwen-code) OAuth flow
  - **DashScope API Key** - For users with DashScope API access

## Installation

### Option 1: Package Manager

```bash
bun add qwen-auth
# or
npm install qwen-auth
```

### Option 2: One-File Plugin (Local)

For local development or standalone use, you can use the bundled one-file plugin:

```bash
# Clone the repository
git clone https://github.com/lion-lef/qwen-auth-opencode.git
cd qwen-auth-opencode

# Install dependencies and build
bun install
bun run build:plugin

# Copy to your OpenCode plugins directory
cp dist/qwen-auth-plugin.js ~/.config/opencode/plugins/

# Or for project-specific use
mkdir -p .opencode/plugins
cp dist/qwen-auth-plugin.js .opencode/plugins/
```

The bundled plugin (`dist/qwen-auth-plugin.js`) is a self-contained file that includes all dependencies and can be placed directly in OpenCode's plugin directories.

## Quick Start

### OpenCode Plugin Integration

Add to your `opencode.json`:

```json
{
  "providers": {
    "qwen": {
      "name": "Qwen",
      "type": "openai",
      "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
      "models": {
        "qwen-turbo": { "name": "Qwen Turbo" },
        "qwen-coder-plus": { "name": "Qwen Coder Plus" }
      }
    }
  },
  "plugins": {
    "qwen-auth": {}
  }
}
```

### Qwen OAuth (Free Tier)

When OpenCode prompts for authentication, select "Qwen OAuth (Free)":

1. A browser window opens for authentication
2. Sign in with your qwen.ai account
3. Authorize the application
4. You get 2,000 free requests/day

### DashScope API Key

Set the environment variable:

```bash
export QWEN_API_KEY="sk-your-api-key"
# or
export DASHSCOPE_API_KEY="sk-your-api-key"
```

Or select "DashScope API Key" when prompted and enter your key.

## OAuth Configuration

This plugin uses the same OAuth endpoints as [qwen-code](https://github.com/QwenLM/qwen-code):

| Parameter | Value |
|-----------|-------|
| Base URL | `https://chat.qwen.ai` |
| Device Code Endpoint | `https://chat.qwen.ai/api/v1/oauth2/device/code` |
| Token Endpoint | `https://chat.qwen.ai/api/v1/oauth2/token` |
| Client ID | `f0304373b74a44d2b584a3fb70ca9e56` |
| Scope | `openid profile email model.completion` |
| Grant Type | `urn:ietf:params:oauth:grant-type:device_code` |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `QWEN_API_KEY` | API key for DashScope |
| `DASHSCOPE_API_KEY` | Alternative API key variable |
| `QWEN_AUTH_DEBUG` | Enable debug logging (`true`/`false`) |
| `QWEN_USE_INTERNATIONAL` | Use international endpoint (`true`/`false`) |

## API Reference

### QwenAuthPlugin

Main plugin export for OpenCode:

```typescript
import { QwenAuthPlugin } from 'qwen-auth';

// Returns hooks for OpenCode integration
const hooks = await QwenAuthPlugin(pluginInput);

// Hooks provided:
// - auth: Authentication hook with loader and methods
// - chat.headers: Custom headers for Qwen requests
```

### QwenOAuthDeviceFlow

Device flow for Qwen OAuth (programmatic use):

```typescript
import { QwenOAuthDeviceFlow } from 'qwen-auth';

const flow = new QwenOAuthDeviceFlow();

// Start authorization
const authInfo = await flow.startAuthorization();
console.log(`Visit: ${authInfo.verificationUri}`);
console.log(`Enter code: ${authInfo.userCode}`);

// Wait for user to authorize
const credentials = await flow.waitForAuthorization();
console.log('Access token:', credentials.accessToken);

// Cancel if needed
flow.cancel();
```

### Configuration

```typescript
import { loadConfig, createDefaultApiKeyConfig } from 'qwen-auth';

// Load from environment/files
const config = loadConfig(process.cwd());

// Or create manually
const config = createDefaultApiKeyConfig('sk-your-api-key');
```

## Supported Models

- `qwen-turbo` - Fast, general-purpose model
- `qwen-plus` - Enhanced capabilities
- `qwen-max` - Most capable model
- `qwen-max-longcontext` - Extended context window
- `qwen-vl-plus` / `qwen-vl-max` - Vision models
- `qwen-audio-turbo` - Audio model
- `qwen-coder-turbo` / `qwen-coder-plus` - Code-focused models
- `qwen2.5-coder-32b-instruct` - Latest coder model
- `qwen2.5-72b-instruct` - Large instruction model
- `qwq-32b-preview` - Preview model

## Example Repository

See `examples/test-repo/` for a complete example with `opencode.json` configuration.

## Compatibility

This plugin is compatible with:
- [OpenCode](https://github.com/opencode-ai/opencode) - Follows the codex.ts plugin architecture
- [qwen-code](https://github.com/QwenLM/qwen-code) - Uses the same OAuth endpoints and flow

## Development

```bash
# Install dependencies
bun install

# Run tests
bun test

# Build (TypeScript compilation)
bun run build

# Build one-file plugin
bun run build:plugin

# Build all (TypeScript + one-file plugin)
bun run build:all

# Type check
bun run typecheck

# Test the bundled plugin locally
bun run examples/test-local-plugin.ts
```

### Building the One-File Plugin

The one-file plugin build uses [Bun's bundler](https://bun.sh/docs/bundler) to bundle all source files into a single JavaScript file that can be used directly with OpenCode:

```bash
bun run build:plugin
```

This creates:
- `dist/qwen-auth-plugin.js` - Readable bundled plugin (~15KB)
- `dist/qwen-auth-plugin.min.js` - Minified version (~7KB)

## License

MIT License - see [LICENSE](LICENSE) for details.
