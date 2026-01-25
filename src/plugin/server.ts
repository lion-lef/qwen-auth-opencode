/**
 * OAuth Callback Server
 * Provides a local HTTP server to capture OAuth redirect callbacks
 * Similar to opencode-gemini-auth pattern
 */

import { createServer } from "node:http";

/**
 * OAuth callback server port (default: 7777)
 */
export const OAUTH_CALLBACK_PORT = 7777;

/**
 * OAuth callback path
 */
export const OAUTH_CALLBACK_PATH = "/oauth/callback";

/**
 * Full redirect URI for OAuth
 */
export const OAUTH_REDIRECT_URI = `http://localhost:${OAUTH_CALLBACK_PORT}${OAUTH_CALLBACK_PATH}`;

/**
 * Options for the OAuth listener
 */
export interface OAuthListenerOptions {
  /**
   * How long to wait for the OAuth redirect before timing out (in milliseconds).
   * Default: 5 minutes
   */
  timeoutMs?: number;

  /**
   * Custom port to listen on
   * Default: 7777
   */
  port?: number;
}

/**
 * OAuth listener interface
 */
export interface OAuthListener {
  /**
   * Resolves with the callback URL once the redirect is captured
   */
  waitForCallback(): Promise<URL>;

  /**
   * Cleanly stop listening for callbacks
   */
  close(): Promise<void>;
}

/**
 * HTML response for successful OAuth callback
 */
const SUCCESS_RESPONSE = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Qwen Auth - Authorization Successful</title>
    <style>
      :root { color-scheme: light dark; }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
        background: #f5f5f5;
        color: #202124;
      }
      main {
        width: min(420px, calc(100% - 2rem));
        background: #ffffff;
        border-radius: 16px;
        padding: 2rem 2.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 1.5rem;
      }
      .logo {
        width: 36px;
        height: 36px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 18px;
      }
      .brand {
        font-size: 1rem;
        font-weight: 500;
        color: #5f6368;
      }
      h1 {
        margin: 0 0 0.75rem;
        font-size: 1.5rem;
        font-weight: 600;
        color: #1a1a1a;
      }
      p {
        margin: 0 0 1.5rem;
        font-size: 1rem;
        line-height: 1.6;
        color: #5f6368;
      }
      .action {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.6rem 1.5rem;
        border-radius: 8px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: #ffffff;
        font-weight: 500;
        font-size: 0.9rem;
        text-decoration: none;
        transition: transform 0.2s ease, box-shadow 0.2s ease;
      }
      .action:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #1a1a2e;
          color: #e8eaed;
        }
        main {
          background: #2a2a3e;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }
        h1 {
          color: #ffffff;
        }
        p, .brand {
          color: #a3a3a3;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <header>
        <div class="logo">Q</div>
        <span class="brand">Qwen Auth for OpenCode</span>
      </header>
      <h1>Authorization Successful</h1>
      <p>Your Qwen account is now linked to OpenCode. You can close this window and return to your terminal.</p>
      <a class="action" href="javascript:window.close()">Close window</a>
    </main>
  </body>
</html>`;

/**
 * Starts a lightweight HTTP server that listens for the OAuth redirect
 * and resolves with the captured callback URL.
 *
 * @param options Configuration options
 * @returns Promise that resolves to an OAuthListener
 */
export async function startOAuthListener(
  options: OAuthListenerOptions = {}
): Promise<OAuthListener> {
  const { timeoutMs = 5 * 60 * 1000, port = OAUTH_CALLBACK_PORT } = options;
  const origin = `http://localhost:${port}`;

  let settled = false;
  let resolveCallback: (url: URL) => void;
  let rejectCallback: (error: Error) => void;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  const callbackPromise = new Promise<URL>((resolve, reject) => {
    resolveCallback = (url: URL) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      resolve(url);
    };
    rejectCallback = (error: Error) => {
      if (settled) return;
      settled = true;
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
        timeoutHandle = null;
      }
      reject(error);
    };
  });

  // Set up timeout
  timeoutHandle = setTimeout(() => {
    rejectCallback(new Error("Timed out waiting for OAuth callback"));
  }, timeoutMs);

  // Allow the timeout to not keep the process alive
  if (timeoutHandle.unref) {
    timeoutHandle.unref();
  }

  const server = createServer((request, response) => {
    if (!request.url) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end("Invalid request");
      return;
    }

    const url = new URL(request.url, origin);

    // Only handle the callback path
    if (url.pathname !== OAUTH_CALLBACK_PATH) {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("Not found");
      return;
    }

    // Send success response
    response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    response.end(SUCCESS_RESPONSE);

    // Resolve with the callback URL
    resolveCallback(url);

    // Close the server after handling the callback
    setImmediate(() => {
      server.close();
    });
  });

  // Start listening
  await new Promise<void>((resolve, reject) => {
    const handleError = (error: Error) => {
      server.off("error", handleError);
      reject(error);
    };
    server.once("error", handleError);
    server.listen(port, "127.0.0.1", () => {
      server.off("error", handleError);
      resolve();
    });
  });

  // Handle server errors (but not close after callback which is expected)
  server.on("error", (error) => {
    if (!settled) {
      rejectCallback(error instanceof Error ? error : new Error(String(error)));
    }
  });

  return {
    waitForCallback: () => callbackPromise,
    close: () =>
      new Promise<void>((resolve) => {
        server.close((error) => {
          // Server might already be closed after callback, that's OK
          if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") {
            // Only reject the callback promise if we haven't already settled
            if (!settled) {
              rejectCallback(new Error("OAuth listener closed before callback"));
            }
          }
          resolve();
        });
      }),
  };
}
