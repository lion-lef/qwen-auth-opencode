# qwen-auth

Authentication plugin for [OpenCode](https://github.com/opencode-ai/opencode) that integrates with Qwen models from Alibaba Cloud DashScope.

## Features

- **Multiple Authentication Methods**
  - **Qwen OAuth** (recommended, free tier) - Compatible with [qwen-code](https://github.com/QwenLM/qwen-code) OAuth flow
  - API Key authentication (for DashScope API)
  - JWT authentication (for service-to-service communication)

- **Security Features**
  - Rate limiting for authentication attempts
  - Encrypted credential storage
  - Secure token management with automatic refresh

- **OpenCode Integration**
  - Follows OpenCode plugin architecture (compatible with codex.ts pattern)
  - Compatible with OpenCode configuration system
  - Works with existing provider definitions

## Installation

```bash
npm install qwen-auth
```

## Quick Start

### OpenCode Plugin Integration (Recommended)

The plugin follows the same architecture as the OpenCode codex plugin:

```typescript
import { QwenAuthPlugin } from 'qwen-auth';

// Register with OpenCode
export default QwenAuthPlugin;
```

### Qwen OAuth (Free Tier)

The recommended way to authenticate with Qwen models. Compatible with `chat.qwen.ai` OAuth:

1. When prompted, select "Qwen OAuth (Free)"
2. A browser window will open for authentication
3. Sign in with your qwen.ai account
4. You get 2,000 free requests/day

```typescript
import { QwenOAuthDeviceFlow } from 'qwen-auth';

// Start the OAuth device flow
const flow = new QwenOAuthDeviceFlow();
const authInfo = await flow.startAuthorization();

console.log(`Visit: ${authInfo.verificationUri}`);
console.log(`Enter code: ${authInfo.userCode}`);

// Wait for user to authorize
const credentials = await flow.waitForAuthorization();
console.log('Access token:', credentials.accessToken);
```

### DashScope API Key

For users with DashScope API access:

1. Get your API key from [DashScope Console](https://dashscope.console.aliyun.com/)

2. Set the environment variable:
```bash
export QWEN_API_KEY="your-api-key"
```

3. Or add to your `.opencode.json`:
```json
{
  "providers": {
    "qwen": {
      "apiKey": "your-api-key"
    }
  }
}
```

## Authentication Methods

### Qwen OAuth (Recommended)

Uses OAuth 2.0 Device Authorization Grant (RFC 8628) with qwen.ai:

```typescript
import { QwenOAuthDeviceFlow, QWEN_OAUTH_CONSTANTS } from 'qwen-auth';

// OAuth configuration used by this plugin
console.log(QWEN_OAUTH_CONSTANTS);
// {
//   BASE_URL: "https://chat.qwen.ai",
//   DEVICE_CODE_ENDPOINT: "https://chat.qwen.ai/api/v1/oauth2/device/code",
//   TOKEN_ENDPOINT: "https://chat.qwen.ai/api/v1/oauth2/token",
//   CLIENT_ID: "f0304373b74a44d2b584a3fb70ca9e56",
//   SCOPE: "openid profile email model.completion",
//   GRANT_TYPE: "urn:ietf:params:oauth:grant-type:device_code"
// }
```

Benefits:
- Free tier with 2,000 requests/day
- No API key required
- Compatible with qwen-code CLI
- Automatic token refresh

### API Key

The simplest authentication method for DashScope API users:

```typescript
import { createDefaultApiKeyConfig, AuthManager } from 'qwen-auth';

const config = createDefaultApiKeyConfig('your-api-key');
const authManager = new AuthManager(config);
await authManager.initialize();

const token = await authManager.getToken();
```

### JWT Authentication

For service-to-service authentication using signed JWTs:

```typescript
import { createDefaultJwtConfig, AuthManager } from 'qwen-auth';

const config = createDefaultJwtConfig(
  '-----BEGIN PRIVATE KEY-----...', // or path to key file
  'key-id',
  'issuer'
);
const authManager = new AuthManager(config);
await authManager.initialize();
```

Configuration options:
- `privateKey`: PEM-encoded private key or path to key file
- `keyId`: Key ID for the JWT header
- `issuer`: Issuer claim
- `audience`: (optional) Audience claim
- `expirationSeconds`: Token lifetime (default: 3600)
- `algorithm`: RS256 or ES256 (default: RS256)

## Configuration File

Create a `.qwen-auth.json` or add to `.opencode.json`:

```json
{
  "providers": {
    "qwen": {
      "method": "api_key",
      "apiKey": {
        "apiKey": "your-api-key"
      },
      "security": {
        "rateLimit": {
          "maxAttempts": 5,
          "windowMs": 60000
        },
        "encryptCredentials": true
      },
      "debug": false,
      "useInternationalEndpoint": false
    }
  }
}
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `QWEN_API_KEY` | API key for authentication |
| `QWEN_JWT_PRIVATE_KEY` | JWT private key |
| `QWEN_JWT_KEY_ID` | JWT key ID |
| `QWEN_JWT_ISSUER` | JWT issuer |
| `QWEN_OAUTH_CLIENT_ID` | OAuth client ID |
| `QWEN_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `QWEN_AUTH_DEBUG` | Enable debug logging |
| `QWEN_USE_INTERNATIONAL` | Use international endpoint |

## Security Configuration

### Rate Limiting

Prevent brute force attacks:

```json
{
  "security": {
    "rateLimit": {
      "maxAttempts": 5,
      "windowMs": 60000,
      "lockoutMs": 300000,
      "enabled": true
    }
  }
}
```

### Credential Encryption

Credentials are encrypted by default using AES-256-GCM:

```json
{
  "security": {
    "encryptCredentials": true,
    "encryptionKey": "optional-custom-key"
  }
}
```

## API Reference

### QwenAuthPlugin (OpenCode Integration)

The main plugin export for OpenCode:

```typescript
import { QwenAuthPlugin } from 'qwen-auth';

// Use as OpenCode plugin
const hooks = await QwenAuthPlugin(pluginInput);

// Hooks provided:
// - auth: Authentication hook with Qwen OAuth and API Key methods
// - chat.headers: Custom headers for Qwen requests
```

### QwenOAuthDeviceFlow

Device flow for Qwen OAuth:

```typescript
import { QwenOAuthDeviceFlow } from 'qwen-auth';

const flow = new QwenOAuthDeviceFlow();

// Start authorization (returns user code and verification URL)
const authInfo = await flow.startAuthorization();

// Wait for user to authorize (polls until success or timeout)
const credentials = await flow.waitForAuthorization();

// Cancel the flow if needed
flow.cancel();
```

### AuthManager

Main class for authentication management:

```typescript
class AuthManager {
  constructor(config: QwenAuthConfig);

  // Initialize the manager
  async initialize(): Promise<void>;

  // Authenticate with the provider
  async authenticate(identifier?: string): Promise<AuthResult>;

  // Get the current token
  async getToken(): Promise<string | null>;

  // Check if authenticated
  isAuthenticated(): boolean;

  // Refresh the token
  async refresh(): Promise<boolean>;

  // Revoke authentication
  async revoke(): Promise<void>;

  // Get request config for API calls
  getRequestConfig(): { headers: Record<string, string>; baseUrl: string };
}
```

## Supported Models

- `qwen-turbo`
- `qwen-plus`
- `qwen-max`
- `qwen-max-longcontext`
- `qwen-vl-plus`
- `qwen-vl-max`
- `qwen-audio-turbo`
- `qwen-coder-turbo`
- `qwen-coder-plus`
- `qwen2.5-coder-32b-instruct`
- `qwen2.5-72b-instruct`
- `qwq-32b-preview`

## Compatibility

This plugin is compatible with:
- [OpenCode](https://github.com/opencode-ai/opencode) - follows the same plugin architecture as codex.ts
- [qwen-code](https://github.com/QwenLM/qwen-code) - uses the same OAuth endpoints and flow

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build
npm run build

# Type check
npm run typecheck
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Related Projects

- [OpenCode](https://github.com/opencode-ai/opencode) - The open source coding agent
- [qwen-code](https://github.com/QwenLM/qwen-code) - Qwen CLI coding assistant
- [DashScope](https://dashscope.aliyun.com/) - Alibaba Cloud AI services
