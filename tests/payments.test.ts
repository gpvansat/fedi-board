// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';
import { decodeInvoice } from '../lib/payments/bolt11';
import { LnurlPayBackend, resolveLnurlPayUrl } from '../lib/payments/lnurl';
import { preimageMatches } from '../lib/payments/preimage';
import { decideSettlement } from '../lib/payments/verify';
import type { IPaymentBackend } from '../lib/payments/types';
import { SPEC_HASH, SPEC_INVOICE } from './helpers';

const pre = bytesToHex(randomBytes(32));
const hash = bytesToHex(sha256(Buffer.from(pre, 'hex')));
const pending = { status: 'pending', paymentHash: hash, invoice: 'lnbc...', verifyRef: 'https://x/verify/1' };
const backend = (settled: boolean, preimage?: string, throws = false): IPaymentBackend => ({
  name: 't',
  createInvoice: async () => { throw new Error('n/a'); },
  checkSettlement: async () => { if (throws) throw new Error('down'); return { settled, preimage }; },
});

describe('preimage proof', () => {
  it('matches only the right preimage', () => {
    expect(preimageMatches(pre, hash)).toBe(true);
    expect(preimageMatches(bytesToHex(randomBytes(32)), hash)).toBe(false);
    expect(preimageMatches('zz', hash)).toBe(false);
    expect(preimageMatches(undefined, hash)).toBe(false);
  });
});

describe('decideSettlement', () => {
  it('accepts verify settled=true', async () => {
    expect(await decideSettlement(pending, backend(true), { acceptPreimageProof: false })).toEqual({ settled: true, proof: 'verify' });
  });
  it('rejects when verify says unpaid and no proof', async () => {
    expect((await decideSettlement(pending, backend(false), { acceptPreimageProof: true })).settled).toBe(false);
  });
  it('rejects a fake client preimage', async () => {
    const r = await decideSettlement(pending, backend(false), { acceptPreimageProof: true, clientPreimage: bytesToHex(randomBytes(32)) });
    expect(r.settled).toBe(false);
  });
  it('accepts a correct client preimage only when allowed', async () => {
    expect((await decideSettlement(pending, backend(false), { acceptPreimageProof: true, clientPreimage: pre })).settled).toBe(true);
    expect((await decideSettlement(pending, backend(false), { acceptPreimageProof: false, clientPreimage: pre })).settled).toBe(false);
  });
  it('falls back to preimage when backend is down', async () => {
    expect(await decideSettlement(pending, backend(false, undefined, true), { acceptPreimageProof: true, clientPreimage: pre })).toEqual({ settled: true, proof: 'preimage' });
  });
  it('rejects backend settled with mismatching preimage', async () => {
    expect((await decideSettlement(pending, backend(true, bytesToHex(randomBytes(32))), { acceptPreimageProof: false })).settled).toBe(false);
  });
});

describe('LNURL-pay backend', () => {
  it('resolves lightning addresses', () => {
    expect(resolveLnurlPayUrl('Gerrit@blink.sv')).toBe('https://blink.sv/.well-known/lnurlp/gerrit');
    expect(() => resolveLnurlPayUrl('nope')).toThrow();
  });

  it('decodes the spec invoice', () => {
    const d = decodeInvoice(SPEC_INVOICE);
    expect(d.paymentHash).toBe(SPEC_HASH);
    expect(d.amountMsats).toBe(250_000_000);
  });

  function fakeFetch(pr: string, verify?: string, verifyBody: object = { status: 'OK', settled: false }) {
    const calls: string[] = [];
    const f = (async (url: string) => {
      calls.push(url);
      let body: object;
      if (url.includes('.well-known')) body = { tag: 'payRequest', callback: 'https://w.example/cb', minSendable: 1000, maxSendable: 1e12, metadata: '[]' };
      else if (url.startsWith('https://w.example/cb')) body = { pr, routes: [], ...(verify ? { verify } : {}) };
      else body = verifyBody;
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    return { f, calls };
  }

  it('creates an operator invoice and keeps the LUD-21 verify URL', async () => {
    const { f, calls } = fakeFetch(SPEC_INVOICE, 'https://w.example/verify/abc');
    const inv = await new LnurlPayBackend('op@w.example', f).createInvoice({ amountSats: 250_000, memo: 'post' });
    expect(inv.paymentHash).toBe(SPEC_HASH);
    expect(inv.verifyRef).toBe('https://w.example/verify/abc');
    expect(calls[1]).toContain('amount=250000000');
  });

  it('rejects an invoice whose amount differs from the price', async () => {
    const { f } = fakeFetch(SPEC_INVOICE);
    await expect(new LnurlPayBackend('op@w.example', f).createInvoice({ amountSats: 500, memo: '' })).rejects.toThrow(/amount/);
  });

  it('reads settled from the verify URL', async () => {
    const { f } = fakeFetch(SPEC_INVOICE, undefined, { status: 'OK', settled: true, preimage: null, pr: SPEC_INVOICE });
    const b = new LnurlPayBackend('op@w.example', f);
    expect((await b.checkSettlement({ paymentHash: SPEC_HASH, verifyRef: 'https://w.example/verify/abc' })).settled).toBe(true);
    expect((await b.checkSettlement({ paymentHash: SPEC_HASH, verifyRef: null })).settled).toBe(false);
  });
});
