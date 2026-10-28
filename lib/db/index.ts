import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { env } from '../../env';
import * as schema from './schema';

const url = env.DATABASE_URL;

if (!url.startsWith('libsql://') && !url.startsWith('file:')) {
  throw new Error(
    'DATABASE_URL must be a libsql:// or file: URL for Turso. Regenerate with database=turso or update your connection string.',
  );
}

const client = createClient({
  url,
  authToken: env.DATABASE_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });
export * from './schema';
