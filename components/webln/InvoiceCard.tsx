'use client';

import { useState } from 'react';
import { usePayment } from '../../lib/webln';
import { formatSats } from '../../lib/payment-history';
import { InvoiceQr } from '../InvoiceQr';

interface IInvoiceCardProps {
  sats: number;
  memo?: string;
  onPaid?: (preimage: string) => void;
  onInvoice?: (invoice: string) => void;
}

export function InvoiceCard({ sats, memo, onPaid, onInvoice }: IInvoiceCardProps) {
  const { makeInvoice, isCreatingInvoice, paymentError, lastInvoice } = usePayment();
  const [copied, setCopied] = useState(false);
  const [hasCreated, setHasCreated] = useState(false);

  async function handleCreateInvoice() {
    const result = await makeInvoice({ amount: String(sats), defaultMemo: memo ?? '' });
    if (result?.paymentRequest) {
      setHasCreated(true);
      onInvoice?.(result.paymentRequest);
    }
  }

  async function handleCopy() {
    if (!lastInvoice) return;
    await navigator.clipboard.writeText(lastInvoice);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-3"
      style={{
        background: 'var(--color-surface-1)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-lg)',
      }}
      aria-label={`Invoice for ${formatSats(sats)}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
          {formatSats(sats)}
        </span>
        {memo && (
          <span className="text-xs truncate max-w-[50%]" style={{ color: 'var(--color-text-muted)' }}>
            {memo}
          </span>
        )}
      </div>

      {!hasCreated && !lastInvoice && (
        <button
          type="button"
          onClick={() => void handleCreateInvoice()}
          disabled={isCreatingInvoice}
          className="w-full rounded-lg px-4 py-3 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-90 active:opacity-80 disabled:opacity-50"
          style={{
            background: 'var(--color-accent)',
            color: 'var(--color-primary-foreground)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {isCreatingInvoice ? 'Creating invoice…' : 'Create invoice'}
        </button>
      )}

      {isCreatingInvoice && hasCreated === false && (
        <p
          className="text-xs font-mono"
          style={{ color: 'var(--color-text-subtle)' }}
          aria-live="polite"
        >
          Generating invoice…
        </p>
      )}

      {lastInvoice && !isCreatingInvoice && (
        <>
          <InvoiceQr value={lastInvoice} label={`Invoice QR for ${formatSats(sats)}`} />

          <p className="text-center text-xs" style={{ color: 'var(--color-text-subtle)' }}>
            Share this invoice or pay it from the send section below.
          </p>

          <button
            type="button"
            onClick={handleCopy}
            className="w-full rounded-lg px-4 py-2 text-sm font-medium transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80 active:opacity-70"
            style={{
              background: 'var(--color-surface-2)',
              color: 'var(--color-text)',
              borderRadius: 'var(--radius-md)',
            }}
            aria-label={copied ? 'Invoice copied to clipboard' : 'Copy invoice to clipboard'}
          >
            {copied ? 'Copied!' : 'Copy invoice'}
          </button>
        </>
      )}

      {paymentError && (
        <p
          className="text-xs"
          style={{ color: 'var(--color-error, #ef4444)' }}
          role="alert"
        >
          {paymentError.message}
        </p>
      )}
    </div>
  );
}
