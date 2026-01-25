# OpenCode + Qwen Auth Test Repository

This is a test repository demonstrating how to configure OpenCode with the qwen-auth plugin.

## Configuration

The `opencode.json` file in this directory configures:

1. **Qwen Provider** - Uses DashScope API endpoints
2. **qwen-auth Plugin** - Handles authentication via OAuth or API key
3. **Agents** - Configured to use Qwen models

## Authentication Methods

The qwen-auth plugin supports two authentication methods:

### 1. Qwen OAuth (Recommended - Free Tier)

When you run OpenCode without an API key configured, the plugin will initiate OAuth Device Flow:

1. A browser window opens with the Qwen authorization page
2. Log in with your Qwen account (or create one at chat.qwen.ai)
3. Authorize the application
4. The plugin receives tokens automatically

This method provides 2,000 free requests/day.

### 2. DashScope API Key

Set your API key as an environment variable:

```bash
export QWEN_API_KEY=sk-your-api-key-here
# or
export DASHSCOPE_API_KEY=sk-your-api-key-here
```

Or add it to the provider configuration:

```json
{
  "providers": {
    "qwen": {
      "apiKey": "sk-your-api-key-here"
    }
  }
}
```

## Usage

```bash
# Navigate to this directory
cd examples/test-repo

# Run OpenCode (will use qwen-auth plugin for authentication)
opencode
```

## Supported Models

- `qwen-turbo` - Fast, general-purpose model
- `qwen-plus` - Enhanced capabilities
- `qwen-max` - Most capable model
- `qwen-coder-turbo` - Code-focused, fast
- `qwen-coder-plus` - Enhanced code model
- `qwen2.5-coder-32b-instruct` - Latest coder model
