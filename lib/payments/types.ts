export interface ICreatedInvoice {
  /** BOLT11 payment request that pays the OPERATOR. */
  invoice: string;
  paymentHash: string;
  /** Backend-specific reference used later to check settlement (e.g. LUD-21 verify URL). */
  verifyRef?: string;
  /** Unix seconds. */
  expiresAt: number;
}

export interface ISettlementStatus {
  settled: boolean;
  preimage?: string;
}

/**
 * Adapter interface for "who receives the money and how do we know it arrived".
 * Implementations: LNURL-pay + LUD-21 verify (lnurl), LNbits wallet API (lnbits), dev mock.
 * A Blink (GraphQL) adapter can be added by implementing these two methods.
 */
export interface IPaymentBackend {
  readonly name: string;
  createInvoice(args: { amountSats: number; memo: string }): Promise<ICreatedInvoice>;
  checkSettlement(args: { paymentHash: string; verifyRef?: string | null; invoice: string }): Promise<ISettlementStatus>;
}

export class PaymentBackendError extends Error {}
