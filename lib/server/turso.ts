import { createClient, type Client } from '@libsql/client';

declare global {
  // eslint-disable-next-line no-var
  var __turso_client: Client | undefined;
}

/**
 * Returns a centralized, reusable Turso libSQL Client instance.
 * Reuses the singleton instance across hot-reloads and requests.
 */
export function getTursoClient(): Client {
  if (globalThis.__turso_client) {
    return globalThis.__turso_client;
  }

  const url = process.env.TURSO_DATABASE_URL || 'file:local.db';
  const authToken = process.env.TURSO_AUTH_TOKEN;

  const client = createClient({
    url,
    authToken,
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

