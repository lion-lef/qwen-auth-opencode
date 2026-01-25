# OpenCode + Codex & Qwen Auth Test Repository

This is a test repository demonstrating how to configure OpenCode with both **Codex OAuth** (OpenAI) and **Qwen OAuth** plugins for authentication.

## Configuration

The `opencode.json` file in this directory configures:

1. **OpenAI Provider** (Codex) - Uses ChatGPT OAuth for GPT-5.1/5.2 Codex models
2. **Qwen Provider** - Uses DashScope API endpoints with OAuth or API key
3. **Plugins** - Both `codex` and `qwen-auth` for dual authentication
4. **Agents** - Configured to use both providers

## Plugins

The configuration loads two authentication plugins:

```json
{
  "plugin": [
    "codex",
    "qwen-auth"
  ]
}
```

### Codex Plugin (OpenAI)

The `codex` plugin enables OAuth authentication with ChatGPT:
- Requires ChatGPT Pro/Plus subscription
- Provides access to GPT-5.1 Codex and GPT-5.2 Codex models
- Zero cost (included with subscription)
- Uses PKCE-based OAuth flow via `auth.openai.com`

### Qwen Auth Plugin

The `qwen-auth` plugin enables authentication with Qwen models:
- Supports OAuth Device Flow (free tier with 2,000 requests/day)
- Supports DashScope API Key authentication
- Compatible with `chat.qwen.ai` OAuth endpoints

## Authentication Methods

### Codex OAuth (OpenAI/ChatGPT)

When using OpenAI models, the codex plugin will:
1. Open a browser window to auth.openai.com
2. Authenticate with your ChatGPT account
3. Handle the OAuth callback automatically

### Qwen OAuth (Free Tier)

When using Qwen models without an API key, the qwen-auth plugin will:
1. Initiate OAuth Device Flow
2. Open browser to chat.qwen.ai authorization page
3. Log in with your Qwen account (or create one)
4. Authorize the application
5. Receive tokens automatically

### Qwen API Key

Alternatively, set your DashScope API key:

```bash
export QWEN_API_KEY=sk-your-api-key-here
# or
export DASHSCOPE_API_KEY=sk-your-api-key-here
```

## Usage

```bash
# Navigate to this directory
cd examples/test-repo

# Run OpenCode - will use appropriate auth for each provider
opencode

# The coder agent uses OpenAI Codex:
# agent.coder -> openai:gpt-5.1-codex

# The task agent uses Qwen:
# agent.task -> qwen:qwen-turbo
```

## Supported Models

### OpenAI Codex (via codex plugin)

| Model | Description |
|-------|-------------|
| `gpt-5.1-codex` | GPT-5.1 Codex |
| `gpt-5.1-codex-mini` | GPT-5.1 Codex Mini |
| `gpt-5.2-codex` | GPT-5.2 Codex |

### Qwen (via qwen-auth plugin)

| Model | Context | Description |
|-------|---------|-------------|
| `qwen-turbo` | 128k | Fast, general-purpose |
| `qwen-plus` | 128k | Enhanced capabilities |
| `qwen-max` | 32k | Most capable |
| `qwen-coder-turbo` | 128k | Code-focused, fast |
| `qwen-coder-plus` | 128k | Enhanced code model |
| `qwen2.5-coder-32b-instruct` | 32k | Latest coder model |

## Example Agent Configuration

```json
{
  "agent": {
    "coder": {
      "model": "openai:gpt-5.1-codex",
      "systemPrompt": "You are an expert software developer."
    },
    "task": {
      "model": "qwen:qwen-turbo"
    }
  }
}
```

This configuration allows you to:
- Use GPT-5.1 Codex for complex coding tasks (via ChatGPT subscription)
- Use Qwen Turbo for simpler tasks (via free OAuth or API key)
