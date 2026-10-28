import { createClient, type Client } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { serverEnv } from '../../env';
import * as schema from './schema';

export type TDb = LibSQLDatabase<typeof schema>;

const DDL = [
  `CREATE TABLE IF NOT EXISTS listings (id TEXT PRIMARY KEY, pubkey TEXT NOT NULL, category TEXT NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL, price_sats INTEGER, location TEXT, status TEXT NOT NULL, hidden INTEGER NOT NULL DEFAULT 0, report_count INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL, bumped_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS listings_feed_idx ON listings (status, hidden, bumped_at)`,
  `CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, purpose TEXT NOT NULL, listing_id TEXT NOT NULL, payer_pubkey TEXT NOT NULL, amount_sats INTEGER NOT NULL, invoice TEXT NOT NULL, payment_hash TEXT NOT NULL UNIQUE, backend TEXT NOT NULL, verify_ref TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL, settled_at INTEGER, proof TEXT)`,
  `CREATE TABLE IF NOT EXISTS reports (listing_id TEXT NOT NULL, reporter_pubkey TEXT NOT NULL, reason TEXT, created_at INTEGER NOT NULL, PRIMARY KEY (listing_id, reporter_pubkey))`,
  `CREATE TABLE IF NOT EXISTS used_auth_events (id TEXT PRIMARY KEY, created_at INTEGER NOT NULL)`,
];

export async function migrate(client: Client) {
  for (const sql of DDL) await client.execute(sql);
}

let dbPromise: Promise<TDb> | null = null;

export function createDb(url: string, authToken?: string): Promise<TDb> {
  const client = createClient({ url, authToken });
  return migrate(client).then(() => drizzle(client, { schema }));
}

/** Lazily-initialised shared DB (tables auto-created; also usable with `npm run db:push`). */
export function getDb(): Promise<TDb> {
  if (!dbPromise) {
    const env = serverEnv();
    dbPromise = createDb(env.DATABASE_URL, env.DATABASE_AUTH_TOKEN);
  }
  return dbPromise;
}

export * from './schema';
