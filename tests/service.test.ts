// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';
import { createDb } from '../lib/db';
import * as svc from '../lib/board/service';
import type { IPaymentBackend } from '../lib/payments/types';
import { keypair } from './helpers';

/** Fake operator wallet: we control when an invoice is "paid". */
class FakeWallet implements IPaymentBackend {
  name = 'fake';
  paid = new Set<string>();
  preimages = new Map<string, string>();
  async createInvoice() {
    const pre = bytesToHex(randomBytes(32));
    const hash = bytesToHex(sha256(Buffer.from(pre, 'hex')));
    this.preimages.set(hash, pre);
    return { invoice: `lnfake_${hash}`, paymentHash: hash, verifyRef: `https://w/verify/${hash}`, expiresAt: Math.floor(Date.now() / 1000) + 600 };
  }
  async checkSettlement({ paymentHash }: { paymentHash: string }) {
    return { settled: this.paid.has(paymentHash) };
  }
  payByInvoice(inv: string) {
    this.paid.add(inv.replace('lnfake_', ''));
  }
}

const alice = keypair(1).pk;
const bob = keypair(2).pk;
const input = { category: 'odd-job' as const, title: 'Paint fence', body: 'Saturday, 2h' };
let ctx: svc.IBoardCtx;
let wallet: FakeWallet;
let now = Date.now();

beforeEach(async () => {
  wallet = new FakeWallet();
  now = Date.now();
  ctx = {
    db: await createDb(':memory:'),
    backend: wallet,
    postPriceSats: 5,
    bumpPriceSats: 100,
    acceptPreimageProof: true,
    reportHideThreshold: 2,
    adminPubkeys: [],
    now: () => now,
  };
});

describe('board service', () => {
  it('listing only goes live after the server confirms payment', async () => {
    const r = await svc.createListing(ctx, alice, input);
    expect(r.amountSats).toBe(5);
    expect(await svc.listLive(ctx)).toHaveLength(0);
    expect((await svc.confirmPayment(ctx, r.paymentId)).settled).toBe(false);
    expect((await svc.confirmPayment(ctx, r.paymentId, bytesToHex(randomBytes(32)))).settled).toBe(false);
    expect(await svc.listLive(ctx)).toHaveLength(0);
    wallet.payByInvoice(r.invoice);
    expect((await svc.confirmPayment(ctx, r.paymentId)).settled).toBe(true);
    const live = await svc.listLive(ctx);
    expect(live).toHaveLength(1);
    expect(live[0].pubkey).toBe(alice);
  });

  it('accepts a valid preimage as proof', async () => {
    const r = await svc.createListing(ctx, alice, input);
    const hash = r.invoice.replace('lnfake_', '');
    expect((await svc.confirmPayment(ctx, r.paymentId, wallet.preimages.get(hash))).settled).toBe(true);
    expect(await svc.listLive(ctx)).toHaveLength(1);
  });

  it('bump is author-only, paid, and applied once', async () => {
    const r = await svc.createListing(ctx, alice, input);
    wallet.payByInvoice(r.invoice);
    await svc.confirmPayment(ctx, r.paymentId);
    await expect(svc.requestBump(ctx, bob, r.listingId)).rejects.toThrow(/author/);
    now += 60_000;
    const b = await svc.requestBump(ctx, alice, r.listingId);
    expect(b.amountSats).toBe(100);
    now += 60_000;
    await svc.confirmPayment(ctx, b.paymentId);
    expect((await svc.listLive(ctx))[0].bumpedAt).toBeLessThan(now - 60_000 + 1); // not applied yet
    wallet.payByInvoice(b.invoice);
    await svc.confirmPayment(ctx, b.paymentId);
    const bumpedAt = (await svc.listLive(ctx))[0].bumpedAt;
    expect(bumpedAt).toBe(now);
    now += 60_000;
    await svc.confirmPayment(ctx, b.paymentId); // idempotent
    expect((await svc.listLive(ctx))[0].bumpedAt).toBe(bumpedAt);
  });

  it('edit/remove are author-only', async () => {
    const r = await svc.createListing(ctx, alice, input);
    wallet.payByInvoice(r.invoice);
    await svc.confirmPayment(ctx, r.paymentId);
    await expect(svc.editListing(ctx, bob, r.listingId, { title: 'hacked' })).rejects.toThrow(/author/);
    await expect(svc.removeListing(ctx, bob, r.listingId)).rejects.toThrow(/author/);
    expect((await svc.editListing(ctx, alice, r.listingId, { title: 'Paint fence (2)' })).title).toBe('Paint fence (2)');
    await svc.removeListing(ctx, alice, r.listingId);
    expect(await svc.listLive(ctx)).toHaveLength(0);
  });

  it('expires after 30 days', async () => {
    const r = await svc.createListing(ctx, alice, input);
    wallet.payByInvoice(r.invoice);
    await svc.confirmPayment(ctx, r.paymentId);
    now += 31 * 86_400_000;
    expect(await svc.listLive(ctx)).toHaveLength(0);
  });

  it('hides after report threshold, one report per pubkey', async () => {
    const r = await svc.createListing(ctx, alice, input);
    wallet.payByInvoice(r.invoice);
    await svc.confirmPayment(ctx, r.paymentId);
    await svc.reportListing(ctx, bob, r.listingId);
    await svc.reportListing(ctx, bob, r.listingId);
    expect(await svc.listLive(ctx)).toHaveLength(1);
    await svc.reportListing(ctx, keypair(3).pk, r.listingId);
    expect(await svc.listLive(ctx)).toHaveLength(0);
  });

  it('rejects replayed auth events', async () => {
    await svc.consumeAuthEvent(ctx, 'abc');
    await expect(svc.consumeAuthEvent(ctx, 'abc')).rejects.toThrow(/already used/);
  });
});
