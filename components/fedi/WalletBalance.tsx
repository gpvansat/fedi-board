'use client';

import { useWalletBalance } from '../../hooks/useWalletBalance';
import { formatSats } from '../../lib/fedi';

const CARD_STYLE = {
  background: 'var(--color-surface-1)',
  border: '1px solid var(--color-border)',
  borderRadius: 'var(--radius-lg)',
} as const;

function FederationNote() {
  return (
    <p className="text-xs leading-[1.65] text-[var(--color-text-muted)]">
      A mini app only sees the balance of your <strong className="text-[var(--color-text)]">active
      Fedi wallet</strong> through WebLN. Ecash you hold in a different federation isn&apos;t visible
      here — switch to that federation in Fedi to read its balance. There is no API to total ecash
      across federations you haven&apos;t joined.
    </p>
  );
}

/**
 * Reads the active wallet balance via the optional WebLN `getBalance()` extension,
 * and explains the federation/active-wallet caveat when it can't.
 */
export function WalletBalance() {
  const { state, loadBalance } = useWalletBalance();

  return (
    <div className="flex flex-col gap-4 rounded-xl p-4" style={CARD_STYLE}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[var(--color-text)]">Wallet balance</p>
        {state.status === 'ready' && (
          <span className="font-mono text-xs text-[var(--color-text-subtle)]">via WebLN</span>
        )}
      </div>

      {state.status === 'ready' && (
        <div className="space-y-3">
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--color-text)]">
            {state.currency === 'sats' ? formatSats(state.balance) : `${state.balance} ${state.currency}`}
          </p>
          <FederationNote />
          <button
            type="button"
            onClick={() => void loadBalance()}
            className="self-start text-xs font-semibold transition-opacity duration-200 hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}
          >
            Refresh balance
          </button>
        </div>
      )}

      {(state.status === 'idle' || state.status === 'loading') && (
        <div className="space-y-3">
          <p className="text-xs leading-[1.65] text-[var(--color-text-muted)]">
            Reads <code className="font-mono">window.webln.getBalance()</code> — the spendable balance
            of your active Fedi wallet. Tap to read it.
          </p>
          <button
            type="button"
            onClick={() => void loadBalance()}
            disabled={state.status === 'loading'}
            className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-90 disabled:opacity-50"
            style={{
              background: 'var(--color-accent)',
              color: 'var(--color-primary-foreground)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {state.status === 'loading' ? 'Reading balance…' : 'Check wallet balance'}
          </button>
        </div>
      )}

      {state.status === 'unavailable' && (
        <p className="text-xs leading-[1.65] text-[var(--color-text-muted)]">
          No Lightning wallet detected. <code className="font-mono">window.webln</code> is only
          injected inside Fedi — open this mini app from Fedi to read your balance.
        </p>
      )}

      {state.status === 'unsupported' && (
        <div className="space-y-3">
          <p className="text-xs leading-[1.65] text-[var(--color-text-muted)]">
            Your wallet is connected but doesn&apos;t expose{' '}
            <code className="font-mono">getBalance()</code>. This is an optional WebLN extension; not
            every Fedi build implements it. You can still send and receive — the balance read just
            isn&apos;t available.
          </p>
          <FederationNote />
        </div>
      )}

      {state.status === 'error' && (
        <div className="space-y-3">
          <p className="text-xs text-[var(--color-error,#ef4444)]" role="alert">
            {state.message}
          </p>
          <button
            type="button"
            onClick={() => void loadBalance()}
            className="self-start text-xs font-semibold transition-opacity duration-200 hover:opacity-80"
            style={{ color: 'var(--color-accent)' }}
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
