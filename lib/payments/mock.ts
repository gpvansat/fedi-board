import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, randomBytes } from '@noble/hashes/utils';
import type { IPaymentBackend } from './types';

/** DEV ONLY: fake invoices that settle the first time they are checked. Refused in production. */
export class MockBackend implements IPaymentBackend {
  readonly name = 'mock';
  async createInvoice({ amountSats }: { amountSats: number; memo: string }) {
    const hash = bytesToHex(sha256(randomBytes(32)));
    return { invoice: `lnmock${amountSats}_${hash}`, paymentHash: hash, verifyRef: hash, expiresAt: Math.floor(Date.now() / 1000) + 900 };
  }
  async checkSettlement() {
    return { settled: true };
  }
}
