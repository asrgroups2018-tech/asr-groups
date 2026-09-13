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

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;

  if (!url) {
    throw new Error(
      'Missing TURSO_DATABASE_URL environment variable. Please check your .env.local or production environment settings.'
    );
  }

  const client = createClient({
    url,
    authToken,
  });

  globalThis.__turso_client = client;
  return client;
}

export const turso = getTursoClient();
