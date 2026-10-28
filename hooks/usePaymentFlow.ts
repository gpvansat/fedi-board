'use client';

import { useCallback, useState } from 'react';
import { usePayment } from '../lib/webln';
import {
  addPaymentRecord,
  getPaymentHistory,
  type TPaymentRecord,
} from '../lib/payment-history';

type TFlowStep = 'idle' | 'paying' | 'success' | 'error';

interface IPayOptions {
  amountSats: number;
  memo?: string;
}

interface IReceiveOptions {
  amountSats: number;
  memo?: string;
  preimage: string;
}

/**
 * Orchestrates WebLN pay/receive flows and persists results to localStorage.
 */
export function usePaymentFlow() {
  const {
    sendPayment,
    makeInvoice,
    isPaying,
    isCreatingInvoice,
    paymentError,
    lastPreimage,
    lastInvoice,
  } = usePayment();
  const [step, setStep] = useState<TFlowStep>('idle');
  const [history, setHistory] = useState<TPaymentRecord[]>(() => getPaymentHistory());

  const refreshHistory = useCallback(() => {
    setHistory(getPaymentHistory());
  }, []);

  async function pay(invoice: string, options: IPayOptions) {
    setStep('paying');
    const result = await sendPayment(invoice);
    if (result?.preimage) {
      addPaymentRecord({
        amountSats: options.amountSats,
        memo: options.memo ?? 'Sent payment',
        timestamp: Date.now(),
        preimage: result.preimage,
        type: 'send',
      });
      refreshHistory();
      setStep('success');
      return result;
    }
    setStep('error');
    return null;
  }

  async function createInvoice(sats: number, memo?: string) {
    setStep('paying');
    const result = await makeInvoice({ amount: String(sats), defaultMemo: memo ?? '' });
    setStep(result ? 'idle' : 'error');
    return result;
  }

  function recordReceivedPayment(options: IReceiveOptions) {
    addPaymentRecord({
      amountSats: options.amountSats,
      memo: options.memo ?? 'Received payment',
      timestamp: Date.now(),
      preimage: options.preimage,
      type: 'receive',
    });
    refreshHistory();
    setStep('success');
  }

  function reset() {
    setStep('idle');
  }

  return {
    step,
    pay,
    createInvoice,
    recordReceivedPayment,
    reset,
    isPaying,
    isCreatingInvoice,
    paymentError,
    lastPreimage,
    lastInvoice,
    history,
    refreshHistory,
  };
}
