# qwen-auth

Authentication plugin for [OpenCode](https://github.com/opencode-ai/opencode) that integrates with Qwen models from Alibaba Cloud DashScope.

## Features

- **Multiple Authentication Methods**
  - API Key authentication (simplest, recommended for most users)
  - JWT authentication (for service-to-service communication)
  - OAuth 2.0 authentication (for user authorization flows)

- **Security Features**
  - Rate limiting for authentication attempts
  - Encrypted credential storage
  - Secure token management with automatic refresh

- **OpenCode Integration**
  - Follows OpenCode plugin architecture
  - Compatible with OpenCode configuration system
  - Works with existing provider definitions

## Installation

```bash
npm install qwen-auth
```

## Quick Start

### API Key Authentication (Recommended)

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

### Configuration File

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

## Authentication Methods

### API Key

The simplest authentication method. Get your API key from the DashScope console.

```typescript
import { createDefaultApiKeyConfig, AuthManager } from 'qwen-auth';

const config = createDefaultApiKeyConfig('your-api-key');
const authManager = new AuthManager(config);
await authManager.initialize();

const token = await authManager.getToken();
```

### JWT Authentication

For service-to-service authentication using signed JWTs.

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

### OAuth 2.0

For user authorization flows with PKCE support.

```typescript
import { createDefaultOAuthConfig, AuthManager } from 'qwen-auth';

const config = createDefaultOAuthConfig('client-id', 'client-secret');
const authManager = new AuthManager(config);
await authManager.authenticate();
```

Configuration options:
- `clientId`: OAuth client ID
- `clientSecret`: OAuth client secret
- `redirectUri`: Callback URL (default: http://localhost:8765/callback)
- `scopes`: OAuth scopes (default: ["openid", "profile"])

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

### AuthManager

Main class for authentication management.

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

### Plugin Functions

```typescript
// Initialize and load the plugin
async function load(context: PluginContext): Promise<PluginResult>;

// Unload and cleanup
async function unload(): Promise<void>;

// Get the auth manager instance
function getAuthManager(): AuthManager | null;
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
- [DashScope](https://dashscope.aliyun.com/) - Alibaba Cloud AI services
