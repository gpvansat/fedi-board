'use client';

import { useCallback, useState } from 'react';
import { useWebLN } from '../lib/webln';

export type TWalletBalanceState =
  | { status: 'idle' }
  | { status: 'loading' }
  /** No WebLN provider at all — not running inside Fedi (or another LN wallet). */
  | { status: 'unavailable' }
  /** WebLN is present but the wallet does not implement the getBalance extension. */
  | { status: 'unsupported' }
  | { status: 'ready'; balance: number; currency: string }
  | { status: 'error'; message: string };

export interface IUseWalletBalanceResult {
  state: TWalletBalanceState;
  /** Reads the wallet balance. Must be triggered by a user gesture so Fedi can prompt. */
  loadBalance: () => Promise<void>;
}

/**
 * Reads the active wallet balance via the optional WebLN `getBalance()` extension.
 *
 * Mini apps only ever see the balance of the user's *active* Fedi wallet/federation —
 * there is no API to read ecash held in other federations the user hasn't joined.
 * Feature-detects support via `getInfo().methods` plus the function itself so the demo
 * degrades gracefully on wallets that don't implement it.
 */
export function useWalletBalance(): IUseWalletBalanceResult {
  const { provider, connect, isAvailable } = useWebLN();
  const [state, setState] = useState<TWalletBalanceState>({ status: 'idle' });

  const loadBalance = useCallback(async () => {
    setState({ status: 'loading' });

    if (!isAvailable) {
      setState({ status: 'unavailable' });
      return;
    }

    const active = provider ?? (await connect());
    if (!active) {
      setState({ status: 'unavailable' });
      return;
    }

    try {
      let supportsBalance = typeof active.getBalance === 'function';
      try {
        const info = await active.getInfo();
        supportsBalance = supportsBalance && (info.methods?.includes('getBalance') ?? true);
      } catch {
        // getInfo failed — fall back to the function check alone.
      }

      if (!supportsBalance || typeof active.getBalance !== 'function') {
        setState({ status: 'unsupported' });
        return;
      }

      const result = await active.getBalance();
      setState({
        status: 'ready',
        balance: result.balance,
        currency: result.currency ?? 'sats',
      });
    } catch (err) {
      setState({
        status: 'error',
        message: err instanceof Error ? err.message : 'Could not read balance',
      });
    }
  }, [provider, connect, isAvailable]);

  return { state, loadBalance };
}
