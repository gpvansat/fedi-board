'use client';

import { useState } from 'react';
import { useIdentityFlow } from '../../hooks/useIdentityFlow';
import {
  njumpUrl,
  publishSignedEvent,
  resolvePublishRelays,
  type TRelayPublishResult,
} from '../../lib/nostr-publish';

interface ISignedMessageProps {
  defaultMessage?: string;
}

export function SignedMessage({ defaultMessage = 'Hello from create-fedi-app!' }: ISignedMessageProps) {
  const { isConnected, isConnecting, signTextNote, lastSignedEvent, signError } = useIdentityFlow();
  const [message, setMessage] = useState(defaultMessage);
  const [isSigning, setIsSigning] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [publishResults, setPublishResults] = useState<TRelayPublishResult[] | null>(null);
  const [broadcastError, setBroadcastError] = useState<string | null>(null);

  async function handleSign() {
    if (!message.trim()) return;
    setIsSigning(true);
    setPublishResults(null);
    setBroadcastError(null);
    try {
      await signTextNote(message.trim());
    } finally {
      setIsSigning(false);
    }
  }

  async function handleBroadcast() {
    if (!lastSignedEvent) return;
    setIsBroadcasting(true);
    setBroadcastError(null);
    setPublishResults(null);
    try {
      const results = await publishSignedEvent(lastSignedEvent);
      setPublishResults(results);
      if (!results.some((r) => r.ok)) {
        setBroadcastError('No relay accepted the note. Try again or configure your own relay.');
      }
    } catch (err) {
      setBroadcastError(err instanceof Error ? err.message : 'Broadcast failed');
    } finally {
      setIsBroadcasting(false);
    }
  }

  const acceptedCount = publishResults?.filter((r) => r.ok).length ?? 0;

  if (!isConnected) {
    return (
      <p className="text-sm text-[var(--color-text-subtle)]">
        Connect your identity above to sign a message.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="max-w-[75ch] text-sm leading-[1.65] text-[var(--color-text-muted)]">
        Signing creates a cryptographic proof that you hold the private key for your pubkey, without
        ever revealing the key itself. Anyone can verify the signature against your public identity.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
          Message to sign
        </span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={3}
          className="w-full resize-none rounded-lg px-3 py-2 text-sm"
          style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            color: 'var(--color-text)',
            borderRadius: 'var(--radius-md)',
          }}
        />
      </label>

      <button
        type="button"
        onClick={handleSign}
        disabled={!message.trim() || isSigning || isConnecting}
        className="self-start rounded-lg px-4 py-2 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-primary-foreground)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label="Sign message with Nostr key"
      >
        {isSigning ? 'Signing…' : 'Sign'}
      </button>

      {signError && (
        <p className="text-xs text-[var(--color-error,#ef4444)]" role="alert">
          {signError.message}
        </p>
      )}

      {lastSignedEvent && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-subtle)]">
            Signed Nostr event
          </p>
          <pre
            className="overflow-auto rounded-lg p-3 font-mono text-xs leading-relaxed"
            style={{
              background: 'var(--color-surface-1)',
              border: '1px solid var(--color-border)',
              color: 'var(--color-text-muted)',
              borderRadius: 'var(--radius-md)',
            }}
          >
            {JSON.stringify(lastSignedEvent, null, 2)}
          </pre>
          <p className="text-xs leading-[1.65] text-[var(--color-text-subtle)]">
            The <code className="font-mono">sig</code> field is a Schnorr signature over the event
            hash. The <code className="font-mono">pubkey</code> identifies who signed it.
          </p>

          <div className="space-y-2 border-t border-[var(--color-border)] pt-3">
            <p className="text-xs leading-[1.65] text-[var(--color-text-muted)]">
              A signed event is portable. Broadcast it to public Nostr relays and anyone can read it,
              forever, addressed only by your pubkey — no server of yours required.
            </p>
            <button
              type="button"
              onClick={handleBroadcast}
              disabled={isBroadcasting}
              className="self-start rounded-lg px-4 py-2 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80 active:opacity-70 disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                background: 'var(--color-surface-2)',
                border: '1px solid var(--color-border)',
                color: 'var(--color-text)',
                borderRadius: 'var(--radius-md)',
              }}
              aria-label="Broadcast signed note to Nostr relays"
            >
              {isBroadcasting ? 'Broadcasting…' : 'Broadcast to Nostr'}
            </button>

            {publishResults && (
              <ul className="space-y-1" aria-label="Relay publish results">
                {publishResults.map((result) => (
                  <li
                    key={result.relay}
                    className="flex items-center justify-between gap-2 font-mono text-[11px]"
                  >
                    <span className="truncate text-[var(--color-text-muted)]">
                      {result.relay.replace(/^wss:\/\//, '')}
                    </span>
                    <span
                      style={{
                        color: result.ok
                          ? 'var(--color-accent)'
                          : 'var(--color-error, #ef4444)',
                      }}
                    >
                      {result.ok ? 'accepted' : (result.message ?? 'rejected')}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {acceptedCount > 0 && (
              <a
                href={njumpUrl(lastSignedEvent.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-semibold transition-opacity duration-200 hover:opacity-80"
                style={{ color: 'var(--color-accent)' }}
              >
                View your note on njump.me →
              </a>
            )}

            {broadcastError && (
              <p className="text-xs text-[var(--color-error,#ef4444)]" role="alert">
                {broadcastError}
              </p>
            )}

            <p className="text-[11px] leading-[1.5] text-[var(--color-text-subtle)]">
              Relays: {resolvePublishRelays().map((r) => r.replace(/^wss:\/\//, '')).join(', ')}.
              Override with <code className="font-mono">NEXT_PUBLIC_NOSTR_RELAY</code>.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
