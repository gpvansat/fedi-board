import { useContext, useState } from 'react';
import { WebLNContext } from './provider';
import type { RequestInvoiceArgs } from '../fedi-types';

export function useWebLN() {
  const ctx = useContext(WebLNContext);
  if (ctx === null) {
    throw new Error('useWebLN must be used within a WebLNProvider');
  }
  return {
    provider: ctx.provider,
    isAvailable: ctx.isAvailable,
    isLoading: ctx.isLoading,
    error: ctx.error,
    isConnected: ctx.provider !== null,
    connect: ctx.connect,
  };
}

export function usePayment() {
  const { provider, connect, isAvailable } = useWebLN();
  const [isPaying, setIsPaying] = useState(false);
  const [isCreatingInvoice, setIsCreatingInvoice] = useState(false);
  const [paymentError, setPaymentError] = useState<Error | null>(null);
  const [lastPreimage, setLastPreimage] = useState<string | null>(null);
  const [lastInvoice, setLastInvoice] = useState<string | null>(null);

  async function ensureEnabled() {
    if (provider) return provider;
    if (!isAvailable) return null;
    return connect();
  }

  async function sendPayment(paymentRequest: string) {
    const active = await ensureEnabled();
    if (!active) return null;
    setIsPaying(true);
    setPaymentError(null);
    try {
      const result = await active.sendPayment(paymentRequest);
      setLastPreimage(result.preimage);
      return result;
    } catch (err) {
      setPaymentError(err instanceof Error ? err : new Error('Payment failed'));
      return null;
    } finally {
      setIsPaying(false);
    }
  }

  async function makeInvoice(args: RequestInvoiceArgs | string | number) {
    const active = await ensureEnabled();
    if (!active) return null;
    setIsCreatingInvoice(true);
    setPaymentError(null);
    try {
      const result = await active.makeInvoice(args);
      setLastInvoice(result.paymentRequest);
      return result;
    } catch (err) {
      setPaymentError(err instanceof Error ? err : new Error('Failed to create invoice'));
      return null;
    } finally {
      setIsCreatingInvoice(false);
    }
  }

  return {
    sendPayment,
    makeInvoice,
    isPaying,
    isCreatingInvoice,
    paymentError,
    lastPreimage,
    lastInvoice,
  };
}
