import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { WebLNProvider, MockWebLNProvider, type RequestInvoiceResponse } from '../../lib/webln';
import { usePaymentFlow } from '../usePaymentFlow';
import {
  clearPaymentHistory,
  getPaymentHistory,
  PAYMENT_HISTORY_KEY,
} from '../../lib/payment-history';

const VALID_INVOICE =
  'lnbc21n1p000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000';

function createWrapper(mock = new MockWebLNProvider({ paymentDelay: 0 })) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <WebLNProvider mockProvider={mock}>{children}</WebLNProvider>;
  };
}

async function waitForProviderReady(
  result: { current: ReturnType<typeof usePaymentFlow> },
) {
  await waitFor(async () => {
    let invoice = null;
    await act(async () => {
      invoice = await result.current.createInvoice(1, 'probe');
    });
    expect(invoice).not.toBeNull();
  });
}

describe('usePaymentFlow', () => {
  beforeEach(() => {
    clearPaymentHistory();
    vi.clearAllMocks();
  });

  it('starts in idle state with empty history', () => {
    const { result } = renderHook(() => usePaymentFlow(), {
      wrapper: createWrapper(),
    });

    expect(result.current.step).toBe('idle');
    expect(result.current.history).toEqual([]);
  });

  it('pay() records a send payment on success', async () => {
    const { result } = renderHook(() => usePaymentFlow(), {
      wrapper: createWrapper(),
    });

    await waitForProviderReady(result);

    await act(async () => {
      await result.current.pay(VALID_INVOICE, { amountSats: 21, memo: 'test send' });
    });

    expect(result.current.step).toBe('success');

    const history = getPaymentHistory();
    expect(history).toHaveLength(1);
    expect(history[0].amountSats).toBe(21);
    expect(history[0].memo).toBe('test send');
    expect(history[0].type).toBe('send');
    expect(history[0].preimage.length).toBeGreaterThan(0);
  });

  it('pay() sets error step when payment fails', async () => {
    const mock = new MockWebLNProvider({
      paymentDelay: 0,
      shouldFail: true,
      failureMessage: 'Insufficient funds',
    });

    const { result } = renderHook(() => usePaymentFlow(), {
      wrapper: createWrapper(mock),
    });

    await waitForProviderReady(result);

    await act(async () => {
      await result.current.pay(VALID_INVOICE, { amountSats: 21 });
    });

    expect(result.current.step).toBe('error');
    expect(getPaymentHistory()).toHaveLength(0);
  });

  it('createInvoice() returns an invoice and resets to idle', async () => {
    const { result } = renderHook(() => usePaymentFlow(), {
      wrapper: createWrapper(),
    });

    await waitForProviderReady(result);

    let invoice: RequestInvoiceResponse | null = null;
    await act(async () => {
      invoice = await result.current.createInvoice(100, 'coffee');
    });

    expect(invoice).not.toBeNull();
    expect(invoice!.paymentRequest).toMatch(/^lnbc/);

    expect(result.current.step).toBe('idle');
    expect(result.current.lastInvoice).toMatch(/^lnbc/);
  });

  it('recordReceivedPayment() adds a receive entry to history', () => {
    const { result } = renderHook(() => usePaymentFlow(), {
      wrapper: createWrapper(),
    });

    act(() => {
      result.current.recordReceivedPayment({
        amountSats: 50,
        memo: 'received',
        preimage: 'abcd'.repeat(16),
      });
    });

    expect(result.current.history).toHaveLength(1);
    expect(result.current.history[0].type).toBe('receive');
    expect(result.current.step).toBe('success');
    expect(window.localStorage.getItem(PAYMENT_HISTORY_KEY)).toBeTruthy();
  });

  it('reset() returns step to idle', async () => {
    const { result } = renderHook(() => usePaymentFlow(), {
      wrapper: createWrapper(),
    });

    await waitForProviderReady(result);

    await act(async () => {
      await result.current.pay(VALID_INVOICE, { amountSats: 21 });
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.step).toBe('idle');
  });

  it('refreshHistory() reloads from localStorage', () => {
    window.localStorage.setItem(
      PAYMENT_HISTORY_KEY,
      JSON.stringify([
        {
          id: '1',
          amountSats: 10,
          memo: 'stored',
          timestamp: Date.now(),
          preimage: 'ee'.repeat(32),
          type: 'send',
        },
      ]),
    );

    const { result } = renderHook(() => usePaymentFlow(), {
      wrapper: createWrapper(),
    });

    act(() => {
      clearPaymentHistory();
      result.current.refreshHistory();
    });

    expect(result.current.history).toHaveLength(0);
  });
});

describe('payment-history utilities', () => {
  beforeEach(() => {
    clearPaymentHistory();
  });

  it('getPaymentHistory returns empty array when storage is empty', () => {
    expect(getPaymentHistory()).toEqual([]);
  });
});
