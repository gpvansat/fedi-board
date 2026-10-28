import { and, desc, eq, gt, lt, sql } from 'drizzle-orm';
import { randomBytes, bytesToHex } from '@noble/hashes/utils';
import { LISTING_TTL_DAYS } from '../config';
import { listings, payments, reports, usedAuthEvents, type TDb, type TListing, type TPayment } from '../db';
import type { IPaymentBackend } from '../payments/types';
import { decideSettlement } from '../payments/verify';
import type { TListingInput } from './validate';

export interface IBoardCtx {
  db: TDb;
  backend: IPaymentBackend;
  postPriceSats: number;
  bumpPriceSats: number;
  acceptPreimageProof: boolean;
  reportHideThreshold: number;
  adminPubkeys: string[];
  now?: () => number;
}

export class BoardError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}

const DAY = 86_400_000;
const newId = () => bytesToHex(randomBytes(12));
const nowOf = (ctx: IBoardCtx) => (ctx.now ? ctx.now() : Date.now());

export function publicListing(l: TListing) {
  return {
    id: l.id,
    pubkey: l.pubkey,
    category: l.category,
    title: l.title,
    body: l.body,
    priceSats: l.priceSats,
    location: l.location,
    createdAt: l.createdAt,
    bumpedAt: l.bumpedAt,
    expiresAt: l.expiresAt,
  };
}

/** Replay protection for NIP-98 events. */
export async function consumeAuthEvent(ctx: IBoardCtx, id: string) {
  const t = nowOf(ctx);
  await ctx.db.delete(usedAuthEvents).where(lt(usedAuthEvents.createdAt, t - 10 * 60_000));
  const res = await ctx.db.insert(usedAuthEvents).values({ id, createdAt: t }).onConflictDoNothing().returning();
  if (res.length === 0) throw new BoardError('Authorization already used', 401);
}

export async function listLive(ctx: IBoardCtx, category?: string) {
  const t = nowOf(ctx);
  const where = [eq(listings.status, 'live'), eq(listings.hidden, false), gt(listings.expiresAt, t)];
  if (category) where.push(eq(listings.category, category));
  const rows = await ctx.db.select().from(listings).where(and(...where)).orderBy(desc(listings.bumpedAt)).limit(200);
  return rows.map(publicListing);
}

async function createPayment(ctx: IBoardCtx, purpose: 'post' | 'bump', listingId: string, payer: string, amountSats: number) {
  const inv = await ctx.backend.createInvoice({ amountSats, memo: `${purpose} ${listingId}` });
  const row = {
    id: newId(),
    purpose,
    listingId,
    payerPubkey: payer,
    amountSats,
    invoice: inv.invoice,
    paymentHash: inv.paymentHash,
    backend: ctx.backend.name,
    verifyRef: inv.verifyRef ?? null,
    status: 'pending',
    createdAt: nowOf(ctx),
    expiresAt: inv.expiresAt * 1000,
  };
  await ctx.db.insert(payments).values(row);
  return { paymentId: row.id, invoice: row.invoice, amountSats, expiresAt: row.expiresAt, hasVerify: !!row.verifyRef };
}

export async function createListing(ctx: IBoardCtx, pubkey: string, input: TListingInput) {
  const t = nowOf(ctx);
  const id = newId();
  await ctx.db.insert(listings).values({
    id,
    pubkey,
    category: input.category,
    title: input.title,
    body: input.body,
    priceSats: input.priceSats ?? null,
    location: input.location || null,
    status: 'pending_payment',
    createdAt: t,
    bumpedAt: t,
    expiresAt: t + LISTING_TTL_DAYS * DAY,
    updatedAt: t,
  });
  const pay = await createPayment(ctx, 'post', id, pubkey, ctx.postPriceSats);
  return { listingId: id, ...pay };
}

async function getListing(ctx: IBoardCtx, id: string) {
  const [l] = await ctx.db.select().from(listings).where(eq(listings.id, id));
  if (!l) throw new BoardError('Listing not found', 404);
  return l;
}

function assertAuthor(l: TListing, pubkey: string) {
  if (l.pubkey !== pubkey) throw new BoardError('Only the author can do that', 403);
}

export async function requestBump(ctx: IBoardCtx, pubkey: string, listingId: string) {
  const l = await getListing(ctx, listingId);
  assertAuthor(l, pubkey);
  if (l.status !== 'live' || l.expiresAt <= nowOf(ctx)) throw new BoardError('Only live listings can be bumped');
  return createPayment(ctx, 'bump', listingId, pubkey, ctx.bumpPriceSats);
}

/**
 * Server-side check of a pending payment. Applies the effect (go live / bump) exactly once,
 * using a conditional UPDATE on status so concurrent confirms cannot double-apply.
 */
export async function confirmPayment(ctx: IBoardCtx, paymentId: string, clientPreimage?: string | null) {
  const [p] = await ctx.db.select().from(payments).where(eq(payments.id, paymentId));
  if (!p) throw new BoardError('Payment not found', 404);
  if (p.status === 'settled') return { settled: true, purpose: p.purpose, listingId: p.listingId };

  const decision = await decideSettlement(p, ctx.backend, {
    clientPreimage,
    acceptPreimageProof: ctx.acceptPreimageProof,
  });
  const t = nowOf(ctx);
  if (!decision.settled) {
    if (t > p.expiresAt + 60_000) {
      await ctx.db.update(payments).set({ status: 'expired' }).where(and(eq(payments.id, p.id), eq(payments.status, 'pending')));
      return { settled: false, expired: true, purpose: p.purpose, listingId: p.listingId };
    }
    return { settled: false, purpose: p.purpose, listingId: p.listingId };
  }

  const won = await ctx.db
    .update(payments)
    .set({ status: 'settled', settledAt: t, proof: decision.proof })
    .where(and(eq(payments.id, p.id), sql`${payments.status} != 'settled'`))
    .returning();
  if (won.length > 0) await applyPayment(ctx, p, t);
  return { settled: true, purpose: p.purpose, listingId: p.listingId };
}

async function applyPayment(ctx: IBoardCtx, p: TPayment, t: number) {
  if (p.purpose === 'post') {
    await ctx.db
      .update(listings)
      .set({ status: 'live', createdAt: t, bumpedAt: t, expiresAt: t + LISTING_TTL_DAYS * DAY, updatedAt: t })
      .where(and(eq(listings.id, p.listingId), eq(listings.status, 'pending_payment')));
  } else {
    await ctx.db.update(listings).set({ bumpedAt: t, updatedAt: t }).where(eq(listings.id, p.listingId));
  }
}

export async function editListing(ctx: IBoardCtx, pubkey: string, id: string, patch: Partial<TListingInput>) {
  const l = await getListing(ctx, id);
  assertAuthor(l, pubkey);
  if (l.status === 'removed') throw new BoardError('Listing was removed', 410);
  const t = nowOf(ctx);
  const set: Partial<TListing> = { updatedAt: t };
  if (patch.category) set.category = patch.category;
  if (patch.title) set.title = patch.title;
  if (patch.body) set.body = patch.body;
  if (patch.priceSats !== undefined) set.priceSats = patch.priceSats ?? null;
  if (patch.location !== undefined) set.location = patch.location || null;
  await ctx.db.update(listings).set(set).where(eq(listings.id, id));
  return publicListing(await getListing(ctx, id));
}

export async function removeListing(ctx: IBoardCtx, pubkey: string, id: string) {
  const l = await getListing(ctx, id);
  assertAuthor(l, pubkey);
  await ctx.db.update(listings).set({ status: 'removed', updatedAt: nowOf(ctx) }).where(eq(listings.id, id));
}

export async function reportListing(ctx: IBoardCtx, pubkey: string, id: string, reason?: string) {
  const l = await getListing(ctx, id);
  if (ctx.adminPubkeys.includes(pubkey)) {
    await ctx.db.update(listings).set({ hidden: true }).where(eq(listings.id, id));
    return { hidden: true };
  }
  const ins = await ctx.db
    .insert(reports)
    .values({ listingId: id, reporterPubkey: pubkey, reason: reason?.slice(0, 200) ?? null, createdAt: nowOf(ctx) })
    .onConflictDoNothing()
    .returning();
  if (ins.length === 0) return { hidden: l.hidden };
  const count = l.reportCount + 1;
  const hidden = l.hidden || count >= ctx.reportHideThreshold;
  await ctx.db.update(listings).set({ reportCount: count, hidden }).where(eq(listings.id, id));
  return { hidden };
}

export async function myListings(ctx: IBoardCtx, pubkey: string) {
  const rows = await ctx.db.select().from(listings).where(eq(listings.pubkey, pubkey)).orderBy(desc(listings.createdAt));
  return rows.filter((r) => r.status !== 'removed').map((r) => ({ ...publicListing(r), status: r.status, hidden: r.hidden }));
}
