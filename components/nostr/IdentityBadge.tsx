'use client';

import { useState } from 'react';
import { useIdentity } from '../../lib/nostr';
import { pubkeyToHsl, pubkeyToNpub, truncateNpub } from '../../lib/nostr-utils';

export function IdentityBadge() {
  const { pubkey, npub, displayNpub, getPublicKey, isConnecting } = useIdentity();
  const [localPubkey, setLocalPubkey] = useState<string | null>(null);
  const [isConnectingLocal, setIsConnectingLocal] = useState(false);
  const [copied, setCopied] = useState(false);

  const activePubkey = pubkey ?? localPubkey;
  const activeNpub = npub ?? (localPubkey ? pubkeyToNpub(localPubkey) : null);
  const activeDisplayNpub = displayNpub ?? (activeNpub ? truncateNpub(activeNpub) : null);

  async function handleConnect() {
    setIsConnectingLocal(true);
    try {
      const pk = await getPublicKey();
      if (pk) setLocalPubkey(pk);
    } finally {
      setIsConnectingLocal(false);
    }
  }

  async function handleCopyNpub() {
    if (!activeNpub) return;
    await navigator.clipboard.writeText(activeNpub);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!activePubkey) {
    return (
      <button
        type="button"
        onClick={handleConnect}
        disabled={isConnecting || isConnectingLocal}
        className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-primary-foreground)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label="Connect Nostr identity"
      >
        {isConnecting || isConnectingLocal ? 'Connecting…' : 'Connect'}
      </button>
    );
  }

  const { h, s, l } = pubkeyToHsl(activePubkey);

  return (
    <div
      className="inline-flex items-center gap-3 rounded-xl px-3 py-2"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
      aria-label={`Connected as ${activeDisplayNpub}`}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold select-none"
        style={{
          background: `hsl(${h}, ${s}%, ${l}%)`,
          color: 'var(--color-primary-foreground)',
        }}
        aria-hidden
      >
        {activePubkey.slice(0, 1).toUpperCase()}
      </span>

      <div className="min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate font-mono text-sm text-[var(--color-text)]">
            {activeDisplayNpub}
          </span>
          <span
            className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              background: 'var(--color-accent-dim)',
              color: 'var(--color-accent)',
            }}
          >
            Verified
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleCopyNpub}
        className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80"
        style={{
          background: 'var(--color-surface-2, var(--color-bg))',
          border: '1px solid var(--color-border)',
          color: 'var(--color-text-muted)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label={copied ? 'npub copied' : 'Copy npub to clipboard'}
      >
        {copied ? 'Copied' : 'Copy npub'}
      </button>
    </div>
  );
}
