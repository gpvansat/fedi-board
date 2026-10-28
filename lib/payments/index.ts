import { serverEnv } from '../../env';
import { LnbitsBackend } from './lnbits';
import { LnurlPayBackend } from './lnurl';
import { MockBackend } from './mock';
import { PaymentBackendError, type IPaymentBackend } from './types';

export * from './types';

export function getPaymentBackend(): IPaymentBackend {
  const env = serverEnv();
  switch (env.PAYMENT_BACKEND) {
    case 'mock':
      if (env.NODE_ENV === 'production') throw new PaymentBackendError('Mock payments are disabled in production');
      return new MockBackend();
    case 'lnbits':
      if (!env.LNBITS_URL || !env.LNBITS_INVOICE_KEY) throw new PaymentBackendError('LNBITS_URL / LNBITS_INVOICE_KEY not set');
      return new LnbitsBackend(env.LNBITS_URL, env.LNBITS_INVOICE_KEY);
    default:
      if (!env.OPERATOR_LIGHTNING_ADDRESS) throw new PaymentBackendError('OPERATOR_LIGHTNING_ADDRESS not set');
      return new LnurlPayBackend(env.OPERATOR_LIGHTNING_ADDRESS);
  }
}
