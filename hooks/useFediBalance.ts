'use client';

import { useCallback, useEffect, useState } from 'react';
import { isFediPermissionError } from '../lib/fedi';
import type { FediInternal } from '../lib/fedi-types';

type TMiniApp = { url: string };

export type TMiniAppsLoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'loaded'; miniApps: TMiniApp[] }
  | { status: 'permissionDenied' }
  | { status: 'error' };

export type TFediBalanceState =
  | { status: 'loading' }
  | { status: 'unavailable' }
  | {
      status: 'ready';
      version: 0 | 1 | 2;
      miniAppsLoad: TMiniAppsLoadState;
    };

export interface IUseFediBalanceResult {
  state: TFediBalanceState;
  /** Loads installed mini apps (v2 only). Must be triggered by user gesture. */
  loadMiniApps: () => Promise<void>;
}

/**
 * Reads `window.fediInternal` version on mount. Installed mini apps are loaded on demand
 * via `loadMiniApps()` so Fedi can prompt for `manageInstalledMiniApps` permission.
 */
export function useFediBalance(): IUseFediBalanceResult {
  const [state, setState] = useState<TFediBalanceState>({ status: 'loading' });

  const loadMiniApps = useCallback(async () => {
    const fedi = window.fediInternal;
    if (!fedi || fedi.version < 2) return;

    const v2 = fedi as Extract<FediInternal, { version: 2 }>;

    setState((prev) => {
      if (prev.status !== 'ready' || prev.version !== 2) return prev;
      return { ...prev, miniAppsLoad: { status: 'loading' } };
    });

    try {
      const miniApps = await v2.getInstalledMiniApps();
      setState((prev) => {
        if (prev.status !== 'ready' || prev.version !== 2) return prev;
        return { ...prev, miniAppsLoad: { status: 'loaded', miniApps } };
      });
    } catch (err) {
      setState((prev) => {
        if (prev.status !== 'ready' || prev.version !== 2) return prev;
        return {
          ...prev,
          miniAppsLoad: isFediPermissionError(err)
            ? { status: 'permissionDenied' }
            : { status: 'error' },
        };
      });
    }
  }, []);

  useEffect(() => {
    const fedi = window.fediInternal;
    if (!fedi) {
      setState({ status: 'unavailable' });
      return;
    }

    if (fedi.version < 2) {
      setState({
        status: 'ready',
        version: fedi.version,
        miniAppsLoad: { status: 'idle' },
      });
      return;
    }

    setState({
      status: 'ready',
      version: 2,
      miniAppsLoad: { status: 'idle' },
    });
  }, []);

  return { state, loadMiniApps };
}
