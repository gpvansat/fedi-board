import { preimageMatches } from './preimage';
import type { IPaymentBackend } from './types';

export interface IPendingPaymentLike {
  status: string;
  paymentHash: string;
  invoice: string;
  verifyRef: string | null;
}

export type TSettlementDecision =
  | { settled: true; proof: 'already' | 'verify' | 'preimage' | 'backend' }
  | { settled: false; reason: string };

/**
 * Decides whether a stored pending payment is paid. The client is never trusted:
 * - the backend (LUD-21 verify URL / LNbits API) saying "settled" is accepted, but if it also
 *   returns a preimage that preimage must hash to the stored payment hash;
 * - a client-supplied preimage is accepted only if `acceptPreimageProof` and
 *   sha256(preimage) === payment hash of the invoice the SERVER obtained from the operator.
 *   Only the payee's node can release that preimage, and only once paid.
 */
export async function decideSettlement(
  payment: IPendingPaymentLike,
  backend: IPaymentBackend,
  opts: { clientPreimage?: string | null; acceptPreimageProof: boolean },
): Promise<TSettlementDecision> {
  if (payment.status === 'settled') return { settled: true, proof: 'already' };

  try {
    const status = await backend.checkSettlement({
      paymentHash: payment.paymentHash,
      verifyRef: payment.verifyRef,
      invoice: payment.invoice,
    });
    if (status.settled) {
      if (status.preimage && !preimageMatches(status.preimage, payment.paymentHash)) {
        return { settled: false, reason: 'backend preimage mismatch' };
      }
      return { settled: true, proof: payment.verifyRef?.startsWith('http') ? 'verify' : 'backend' };
    }
  } catch {
    // fall through to preimage proof
  }

  if (opts.acceptPreimageProof && preimageMatches(opts.clientPreimage, payment.paymentHash)) {
    return { settled: true, proof: 'preimage' };
  }
  return { settled: false, reason: 'not paid yet' };
}
