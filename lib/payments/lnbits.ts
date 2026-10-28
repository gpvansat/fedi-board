import { decodeInvoice } from './bolt11';
import { PaymentBackendError, type IPaymentBackend } from './types';

/** Operator's LNbits wallet (invoice/read key only — cannot spend). */
export class LnbitsBackend implements IPaymentBackend {
  readonly name = 'lnbits';
  constructor(private baseUrl: string, private invoiceKey: string, private fetchImpl: typeof fetch = fetch) {}

  private url(path: string) {
    return new URL(path, this.baseUrl.endsWith('/') ? this.baseUrl : this.baseUrl + '/').toString();
  }

  async createInvoice({ amountSats, memo }: { amountSats: number; memo: string }) {
    const res = await this.fetchImpl(this.url('api/v1/payments'), {
      method: 'POST',
      headers: { 'X-Api-Key': this.invoiceKey, 'content-type': 'application/json' },
      body: JSON.stringify({ out: false, amount: amountSats, memo, expiry: 900 }),
    });
    if (!res.ok) throw new PaymentBackendError(`LNbits invoice failed (${res.status})`);
    const data = (await res.json()) as { payment_request?: string; bolt11?: string; payment_hash?: string };
    const pr = data.payment_request ?? data.bolt11;
    if (!pr) throw new PaymentBackendError('LNbits returned no invoice');
    const decoded = decodeInvoice(pr);
    if (decoded.amountMsats !== amountSats * 1000) throw new PaymentBackendError('Invoice amount does not match price');
    return { invoice: pr, paymentHash: decoded.paymentHash, verifyRef: decoded.paymentHash, expiresAt: decoded.expiresAt };
  }

  async checkSettlement({ paymentHash }: { paymentHash: string }) {
    const res = await this.fetchImpl(this.url(`api/v1/payments/${paymentHash}`), {
      headers: { 'X-Api-Key': this.invoiceKey },
      cache: 'no-store',
    });
    if (!res.ok) return { settled: false };
    const data = (await res.json()) as { paid?: boolean; preimage?: string };
    return { settled: data.paid === true, preimage: data.preimage };
  }
}
