import { integer, sqliteTable, text, primaryKey, index } from 'drizzle-orm/sqlite-core';

export const listings = sqliteTable(
  'listings',
  {
    id: text('id').primaryKey(),
    pubkey: text('pubkey').notNull(),
    category: text('category').notNull(),
    title: text('title').notNull(),
    body: text('body').notNull(),
    priceSats: integer('price_sats'),
    location: text('location'),
    /** pending_payment | live | removed */
    status: text('status').notNull(),
    hidden: integer('hidden', { mode: 'boolean' }).notNull().default(false),
    reportCount: integer('report_count').notNull().default(0),
    createdAt: integer('created_at').notNull(),
    bumpedAt: integer('bumped_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (t) => [index('listings_feed_idx').on(t.status, t.hidden, t.bumpedAt)],
);

export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  /** post | bump */
  purpose: text('purpose').notNull(),
  listingId: text('listing_id').notNull(),
  payerPubkey: text('payer_pubkey').notNull(),
  amountSats: integer('amount_sats').notNull(),
  invoice: text('invoice').notNull(),
  paymentHash: text('payment_hash').notNull().unique(),
  backend: text('backend').notNull(),
  /** Backend-specific lookup reference (LUD-21 verify URL, LNbits hash...) */
  verifyRef: text('verify_ref'),
  /** pending | settled | expired */
  status: text('status').notNull(),
  createdAt: integer('created_at').notNull(),
  expiresAt: integer('expires_at').notNull(),
  settledAt: integer('settled_at'),
  /** How settlement was proven: verify | preimage | backend */
  proof: text('proof'),
});

export const reports = sqliteTable(
  'reports',
  {
    listingId: text('listing_id').notNull(),
    reporterPubkey: text('reporter_pubkey').notNull(),
    reason: text('reason'),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.listingId, t.reporterPubkey] })],
);

/** NIP-98 event ids already used (replay protection). */
export const usedAuthEvents = sqliteTable('used_auth_events', {
  id: text('id').primaryKey(),
  createdAt: integer('created_at').notNull(),
});

export type TListing = typeof listings.$inferSelect;
export type TPayment = typeof payments.$inferSelect;
