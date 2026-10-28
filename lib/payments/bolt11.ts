import { decode } from 'light-bolt11-decoder';

export interface IDecodedInvoice {
  paymentHash: string;
  amountMsats: number | null;
  /** Unix seconds when the invoice expires. */
  expiresAt: number;
}

export function decodeInvoice(invoice: string): IDecodedInvoice {
  const d = decode(invoice);
  const get = (name: string) => d.sections.find((s) => s.name === name) as { value?: unknown } | undefined;
  const hash = get('payment_hash')?.value;
  if (typeof hash !== 'string' || !/^[0-9a-f]{64}$/.test(hash)) throw new Error('Invoice missing payment_hash');
  const amount = get('amount')?.value;
  const ts = Number(get('timestamp')?.value ?? Math.floor(Date.now() / 1000));
  const expiry = Number((d as { expiry?: number }).expiry ?? get('expiry')?.value ?? 3600);
  return {
    paymentHash: hash,
    amountMsats: amount === undefined ? null : Number(amount),
    expiresAt: ts + expiry,
  };
}
