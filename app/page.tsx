'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useWebLN } from '../lib/webln';
import { useNostr } from '../lib/nostr';
import { cn } from '../lib/utils';

function ConnectionStatus() {
  const {
    isAvailable: weblnAvailable,
    isConnected: weblnConnected,
    isLoading: weblnLoading,
    connect: connectWebLN,
    error: weblnError,
  } = useWebLN();
  const {
    isAvailable: nostrAvailable,
    isConnected: nostrConnected,
    isLoading: nostrLoading,
    connect: connectNostr,
    error: nostrError,
  } = useNostr();
  const [isConnectingWebLN, setIsConnectingWebLN] = useState(false);
  const [isConnectingNostr, setIsConnectingNostr] = useState(false);

  async function handleConnectWebLN() {
    setIsConnectingWebLN(true);
    try {
      await connectWebLN();
    } finally {
      setIsConnectingWebLN(false);
    }
  }

  async function handleConnectNostr() {
    setIsConnectingNostr(true);
    try {
      await connectNostr();
    } finally {
      setIsConnectingNostr(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <StatusPill
          label="WebLN"
          active={weblnConnected}
          loading={weblnLoading}
          available={weblnAvailable}
        />
        <StatusPill
          label="Nostr"
          active={nostrConnected}
          loading={nostrLoading}
          available={nostrAvailable}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        {weblnAvailable && !weblnConnected && (
          <button
            type="button"
            onClick={() => void handleConnectWebLN()}
            disabled={isConnectingWebLN || weblnLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity duration-200 hover:opacity-80 disabled:opacity-40"
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {isConnectingWebLN ? 'Connecting WebLN…' : 'Connect WebLN'}
          </button>
        )}
        {nostrAvailable && !nostrConnected && (
          <button
            type="button"
            onClick={() => void handleConnectNostr()}
            disabled={isConnectingNostr || nostrLoading}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-opacity duration-200 hover:opacity-80 disabled:opacity-40"
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text)',
            }}
          >
            {isConnectingNostr ? 'Connecting Nostr…' : 'Connect Nostr'}
          </button>
        )}
      </div>

      {(weblnError || nostrError) && (
        <p className="text-xs" style={{ color: 'var(--color-error, #ef4444)' }} role="alert">
          {weblnError?.message ?? nostrError?.message}
        </p>
      )}
    </div>
  );
}

function StatusPill({
  label,
  active,
  loading,
  available,
}: {
  label: string;
  active: boolean;
  loading: boolean;
  available: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 text-xs font-mono',
        loading
          ? 'bg-[var(--color-surface-2)] text-[var(--color-text-subtle)]'
          : active
            ? 'bg-[var(--color-accent-dim)] text-[var(--color-accent)]'
            : available
              ? 'bg-[var(--color-surface-2)] text-[var(--color-text-muted)]'
              : 'bg-[var(--color-surface-2)] text-[var(--color-text-subtle)]',
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full',
          loading
            ? 'bg-current opacity-40'
            : active
              ? 'bg-[var(--color-accent)]'
              : 'bg-[var(--color-text-subtle)]',
        )}
      />
      {label}
      {!loading && !active && available && (
        <span className="opacity-60">(available)</span>
      )}
    </span>
  );
}

export default function HomePage() {
  return (
    <main
      className="mx-auto min-h-dvh w-full max-w-[390px] px-4 pt-6 pb-20"
      style={{ paddingBottom: 'max(5rem, env(safe-area-inset-bottom, 20px))' }}
    >
      <div className="flex flex-col gap-6">
        <div className="space-y-2">
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold leading-tight text-[var(--color-text)]">
            fedi-board-v2
          </h1>
          <p className="max-w-[75ch] text-sm leading-[1.65] text-[var(--color-text-muted)]">
            Your mini app is running. Explore the demo pages to see WebLN payments and Nostr
            identity in action.
          </p>
        </div>

        <ConnectionStatus />

        <Link
          href="/demo"
          className="inline-flex h-10 items-center justify-center rounded-md bg-[var(--color-accent)] px-5 text-sm font-semibold text-[var(--color-text)] transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-90 active:opacity-80"
        >
          Explore demos →
        </Link>
      </div>
    </main>
  );
}
