import type {
  WebLNProvider,
  GetInfoResponse,
  GetBalanceResponse,
  RequestInvoiceArgs,
  RequestInvoiceResponse,
  SendPaymentResponse,
  KeysendArgs,
  SignMessageResponse,
} from '../fedi-types';

function randomHex(bytes: number): string {
  let result = '';
  for (let i = 0; i < bytes * 2; i++) {
    result += Math.floor(Math.random() * 16).toString(16);
  }
  return result;
}

function randomAlphanumeric(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface MockWebLNOptions {
  paymentDelay?: number;
  shouldFail?: boolean;
  failureMessage?: string;
  autoEnable?: boolean;
}

export class MockWebLNProvider implements WebLNProvider {
  private readonly paymentDelay: number;
  private readonly shouldFail: boolean;
  private readonly failureMessage: string;

  constructor({
    paymentDelay = 600,
    shouldFail = false,
    failureMessage,
    autoEnable: _autoEnable = true,
  }: MockWebLNOptions = {}) {
    this.paymentDelay = paymentDelay;
    this.shouldFail = shouldFail;
    this.failureMessage = failureMessage ?? 'Payment failed';
  }

  async enable(): Promise<void> {
    if (this.shouldFail) throw new Error(this.failureMessage);
  }

  async getInfo(): Promise<GetInfoResponse> {
    return {
      node: {
        alias: 'Fedi Dev Node',
        pubkey: '0279be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798',
        color: '#FF6B35',
      },
      methods: ['sendPayment', 'makeInvoice', 'getInfo', 'signMessage', 'getBalance'],
    };
  }

  async getBalance(): Promise<GetBalanceResponse> {
    await delay(this.paymentDelay);
    return { balance: 42_069, currency: 'sats' };
  }

  async makeInvoice(args: RequestInvoiceArgs | string | number): Promise<RequestInvoiceResponse> {
    const amount = typeof args === 'object' ? (args.amount ?? args.defaultAmount ?? 0) : args;
    await delay(this.paymentDelay);
    return {
      paymentRequest: `lnbc${amount}n1p${randomAlphanumeric(100)}`,
    };
  }

  async sendPayment(paymentRequest: string): Promise<SendPaymentResponse> {
    if (!paymentRequest.startsWith('lnbc')) {
      throw new Error('Invalid payment request: must start with lnbc');
    }
    if (this.shouldFail) throw new Error(this.failureMessage);
    await delay(this.paymentDelay);
    return { preimage: randomHex(32) };
  }

  async signMessage(message: string): Promise<SignMessageResponse> {
    return { message, signature: randomHex(64) };
  }

  async verifyMessage(): Promise<void> {}

  async sendKeysend(_args: KeysendArgs): Promise<SendPaymentResponse> {
    return { preimage: randomHex(32) };
  }
}
