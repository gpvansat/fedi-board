import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Payment records for payment-gated content and other Lightning-gated features. */
export const payments = sqliteTable('payments', {
  id: text('id').primaryKey(),
  invoice: text('invoice').notNull(),
  preimage: text('preimage').notNull(),
  paidAt: integer('paid_at', { mode: 'timestamp_ms' }),
  metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
});

export type TPayment = typeof payments.$inferSelect;
export type TNewPayment = typeof payments.$inferInsert;
