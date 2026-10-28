// WebLN types
export interface RequestInvoiceArgs {
  amount?: string | number;
  defaultAmount?: string | number;
  minimumAmount?: string | number;
  maximumAmount?: string | number;
  defaultMemo?: string;
}

export interface RequestInvoiceResponse {
  paymentRequest: string;
}

export interface SendPaymentResponse {
  preimage: string;
}

export interface KeysendArgs {
  destination: string;
  amount: string | number;
  customRecords?: Record<string, string>;
}

export interface SignMessageResponse {
  message: string;
  signature: string;
}

export interface GetInfoResponse {
  node: {
    alias: string;
    pubkey: string;
    color: string;
  };
  methods: string[];
}

export interface GetBalanceResponse {
  /** Spendable balance in the wallet's active account. */
  balance: number;
  /** Currency/unit of `balance`, e.g. "sats" or "BTC". Defaults to sats when omitted. */
  currency?: string;
}

export interface WebLNProvider {
  enable(): Promise<void>;
  getInfo(): Promise<GetInfoResponse>;
  sendPayment(paymentRequest: string): Promise<SendPaymentResponse>;
  makeInvoice(args: RequestInvoiceArgs | string | number): Promise<RequestInvoiceResponse>;
  signMessage(message: string): Promise<SignMessageResponse>;
  verifyMessage(signature: string, message: string): Promise<void>;
  sendKeysend(args: KeysendArgs): Promise<SendPaymentResponse>;
  /**
   * Optional WebLN extension. Not all wallets implement it; check
   * `getInfo().methods` for "getBalance" (and feature-detect the function)
   * before calling. Fedi exposes the active wallet/federation balance here.
   */
  getBalance?(): Promise<GetBalanceResponse>;
}

// Nostr types
export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export type UnsignedNostrEvent = Omit<NostrEvent, 'id' | 'pubkey' | 'sig'>;

export interface Nip04 {
  encrypt(pubkey: string, plaintext: string): Promise<string>;
  decrypt(pubkey: string, ciphertext: string): Promise<string>;
}

export interface NostrProvider {
  getPublicKey(): Promise<string>;
  signEvent(event: UnsignedNostrEvent): Promise<NostrEvent>;
  getRelays(): Promise<Record<string, { read: boolean; write: boolean }>>;
  nip04: Nip04;
}

// Fedi internal types
type FediInternalV0 = { version: 0 };
type FediInternalV1 = { version: 1 };
type FediInternalV2 = {
  version: 2;
  /**
   * Lists mini apps installed in the user's Fedi wallet.
   * Requires the `manageInstalledMiniApps` permission — call only on user gesture
   * and handle rejection (user may deny or remember denial).
   */
  getInstalledMiniApps(): Promise<Array<{ url: string }>>;
  /**
   * Prompts the user to install a mini app in Fedi.
   * Requires the `manageInstalledMiniApps` permission — call only on user gesture
   * and handle rejection (user may deny or remember denial).
   */
  installMiniApp(miniApp: {
    id: string;
    title: string;
    url: string;
    imageUrl?: string | null;
    description?: string;
  }): Promise<void>;
};

export type FediInternal = FediInternalV0 | FediInternalV1 | FediInternalV2;

declare global {
  interface Window {
    webln?: WebLNProvider;
    nostr?: NostrProvider;
    fediInternal?: FediInternal;
  }
}
