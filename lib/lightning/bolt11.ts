import { decode } from 'light-bolt11-decoder';

/**
 * Extracts the payment hash (hex) from a BOLT11 invoice string.
 */
export function getPaymentHashFromInvoice(invoice: string): string {
  const decoded = decode(invoice);
  const section = decoded.sections.find((s) => s.name === 'payment_hash');

  if (!section || typeof section.value !== 'string') {
    throw new Error('Invoice missing payment_hash');
  }

  return section.value;
}
