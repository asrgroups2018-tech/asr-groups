import { createClient, type Client } from '@libsql/client';

declare global {
  var __turso_client: Client | undefined;
}

const DEFAULT_REMOTE_TIMEOUT_MS = 10_000;

/**
 * Keep a stalled Turso request from holding a Vercel function open forever.
 * The browser has its own timeout, but the server must also stop waiting so a
 * warm function can recover and subsequent requests can try again.
 */
function fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const configuredTimeout = Number(process.env.TURSO_REQUEST_TIMEOUT_MS);
  const timeoutMs = Number.isFinite(configuredTimeout) && configuredTimeout > 0
    ? configuredTimeout
    : DEFAULT_REMOTE_TIMEOUT_MS;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('Turso request timed out')), timeoutMs);

  if (init?.signal) {
    if (init.signal.aborted) {
      controller.abort(init.signal.reason);
    } else {
      init.signal.addEventListener('abort', () => controller.abort(init.signal?.reason), { once: true });
    }
  }

  return fetch(input, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

/**
 * Returns a centralized, reusable Turso libSQL Client instance.
 * Reuses the singleton instance across hot-reloads and requests.
 */
export function getTursoClient(): Client {
  if (globalThis.__turso_client) {
    return globalThis.__turso_client;
  }

  const configuredUrl = process.env.TURSO_DATABASE_URL?.trim();
  if (!configuredUrl && process.env.NODE_ENV === 'production') {
    throw new Error('TURSO_DATABASE_URL is not configured for production.');
  }

  const url = configuredUrl || 'file:local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({
    url,
    authToken,
    fetch: fetchWithTimeout,
  });

  globalThis.__turso_client = client;
  return client;
}

/**
 * Lazy proxy for `turso` export so module importing doesn't immediately crash at build time
 */
export const turso = new Proxy({} as Client, {
  get(_target, prop) {
    const client = getTursoClient();
    const val = (client as unknown as Record<string | symbol, unknown>)[prop];
    if (typeof val === 'function') {
      return val.bind(client);
    }
    return val;
  },
});

