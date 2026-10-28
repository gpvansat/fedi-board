import { bech32 } from '@scure/base';
import { decodeInvoice } from './bolt11';
import { PaymentBackendError, type IPaymentBackend } from './types';

type TFetch = typeof fetch;

/** user@domain (LUD-16), lnurl1... (LUD-01) or a raw https URL -> LNURL-pay endpoint. */
export function resolveLnurlPayUrl(address: string): string {
  const a = address.trim();
  if (/^https?:\/\//i.test(a)) return a;
  if (/^lnurl1/i.test(a)) {
    const { words } = bech32.decode(a.toLowerCase() as `${string}1${string}`, 2000);
    return new TextDecoder().decode(bech32.fromWords(words));
  }
  const m = a.match(/^([a-z0-9._+-]+)@([a-z0-9.-]+\.[a-z]{2,}|localhost(:\d+)?)$/i);
  if (!m) throw new PaymentBackendError(`Not a Lightning address: ${address}`);
  const proto = m[2].startsWith('localhost') ? 'http' : 'https';
  return `${proto}://${m[2]}/.well-known/lnurlp/${m[1].toLowerCase()}`;
}

async function getJson(fetchImpl: TFetch, url: string): Promise<Record<string, unknown>> {
  const res = await fetchImpl(url, { headers: { accept: 'application/json' }, cache: 'no-store' });
  if (!res.ok) throw new PaymentBackendError(`LNURL request failed (${res.status})`);
  const data = (await res.json()) as Record<string, unknown>;
  if (data.status === 'ERROR') throw new PaymentBackendError(`LNURL error: ${String(data.reason ?? 'unknown')}`);
  return data;
}

/**
 * Pays the operator's Lightning address via LNURL-pay. Settlement is checked with the
 * LUD-21 `verify` URL when the address's server provides one.
 */
export class LnurlPayBackend implements IPaymentBackend {
  readonly name = 'lnurl';
  constructor(private address: string, private fetchImpl: TFetch = fetch) {}

  async createInvoice({ amountSats, memo }: { amountSats: number; memo: string }) {
    const meta = await getJson(this.fetchImpl, resolveLnurlPayUrl(this.address));
    if (meta.tag !== 'payRequest' || typeof meta.callback !== 'string') {
      throw new PaymentBackendError('Address is not an LNURL-pay endpoint');
    }
    const msats = amountSats * 1000;
    if (msats < Number(meta.minSendable) || msats > Number(meta.maxSendable)) {
      throw new PaymentBackendError(`Amount ${amountSats} sats outside the address's limits`);
    }
    const cb = new URL(meta.callback);
    cb.searchParams.set('amount', String(msats));
    if (Number(meta.commentAllowed ?? 0) >= memo.length && memo) cb.searchParams.set('comment', memo);
    const res = await getJson(this.fetchImpl, cb.toString());
    if (typeof res.pr !== 'string') throw new PaymentBackendError('LNURL callback returned no invoice');
    const decoded = decodeInvoice(res.pr);
    // Never trust the remote amount: the invoice must be for exactly what we asked.
    if (decoded.amountMsats !== msats) throw new PaymentBackendError('Invoice amount does not match price');
    return {
      invoice: res.pr,
      paymentHash: decoded.paymentHash,
      verifyRef: typeof res.verify === 'string' ? res.verify : undefined,
      expiresAt: decoded.expiresAt,
    };
  }

  async checkSettlement({ verifyRef }: { paymentHash: string; verifyRef?: string | null }) {
    if (!verifyRef) return { settled: false };
    const data = await getJson(this.fetchImpl, verifyRef);
    return {
      settled: data.settled === true,
      preimage: typeof data.preimage === 'string' ? data.preimage : undefined,
    };
  }
}
