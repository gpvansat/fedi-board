'use client';

import { useState } from 'react';
import { useIdentity } from '../../lib/nostr';
import { pubkeyToHsl, pubkeyToNpub, truncateNpub } from '../../lib/nostr-utils';

interface INostrLoginProps {
  /** Called after a successful login with the user's pubkey and npub. */
  onLogin?: (pubkey: string, npub: string) => void;
  className?: string;
}

/**
 * Drop-in Nostr login component. Calls `getPublicKey()` on user action and shows
 * the connected identity on success. No passwords, no account creation.
 */
export function NostrLogin({ onLogin, className }: INostrLoginProps) {
  const { pubkey, npub, getPublicKey } = useIdentity();
  const [localPubkey, setLocalPubkey] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const activePubkey = pubkey ?? localPubkey;
  const activeNpub = npub ?? (localPubkey ? pubkeyToNpub(localPubkey) : null);

  async function handleLogin() {
    setLoginError(null);
    setIsLoggingIn(true);
    try {
      const pk = await getPublicKey();
      if (!pk) {
        setLoginError('Nostr provider not available. Open this app inside Fedi.');
        return;
      }
      setLocalPubkey(pk);
      const encodedNpub = pubkeyToNpub(pk);
      onLogin?.(pk, encodedNpub);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoggingIn(false);
    }
  }

  if (activePubkey && activeNpub) {
    const { h, s, l } = pubkeyToHsl(activePubkey);

    return (
      <div
        className={`rounded-xl px-4 py-4 ${className ?? ''}`}
        style={{
          background: 'var(--color-accent-dim)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
        role="status"
        aria-label="Logged in with Nostr identity"
      >
        <p className="mb-3 text-sm font-semibold text-[var(--color-accent)]">Logged in</p>
        <div className="flex items-center gap-3">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold"
            style={{
              background: `hsl(${h}, ${s}%, ${l}%)`,
              color: 'var(--color-primary-foreground)',
            }}
            aria-hidden
          >
            {activePubkey.slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="truncate font-mono text-sm text-[var(--color-text)]">
              {truncateNpub(activeNpub)}
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">
              Your Fedi Nostr key, stable across every mini app.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className ?? ''}`}>
      <button
        type="button"
        onClick={handleLogin}
        disabled={isLoggingIn}
        className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-primary-foreground)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label="Login with Fedi Nostr identity"
      >
        {isLoggingIn ? 'Connecting…' : 'Login with Fedi'}
      </button>
      {loginError && (
        <p className="text-xs text-[var(--color-error,#ef4444)]" role="alert">
          {loginError}
        </p>
      )}
    </div>
  );
}
