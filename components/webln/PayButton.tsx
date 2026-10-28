'use client';

import { useState } from 'react';
import { usePayment } from '../../lib/webln';
import { formatSats, truncatePreimage } from '../../lib/payment-history';

interface IPayButtonProps {
  invoice: string;
  amountSats: number;
  memo?: string;
  onSuccess: (preimage: string) => void;
}

export function PayButton({ invoice, amountSats, memo, onSuccess }: IPayButtonProps) {
  const { sendPayment, isPaying, paymentError } = usePayment();
  const [paid, setPaid] = useState(false);
  const [preimage, setPreimage] = useState<string | null>(null);

  async function handlePay() {
    const result = await sendPayment(invoice);
    if (result?.preimage) {
      setPreimage(result.preimage);
      setPaid(true);
      onSuccess(result.preimage);
    }
  }

  if (paid && preimage) {
    return (
      <div
        className="rounded-lg px-4 py-3 text-sm transition-opacity duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] opacity-100"
        style={{
          background: 'var(--color-accent-dim)',
          color: 'var(--color-accent)',
          borderRadius: 'var(--radius-md)',
        }}
        role="status"
        aria-label={`Payment of ${formatSats(amountSats)} sent successfully`}
      >
        <p className="font-semibold mb-0.5">Payment sent</p>
        <p className="text-xs opacity-80 mb-1">{formatSats(amountSats)}</p>
        <p className="font-mono text-xs opacity-70" aria-label={`Preimage ${truncatePreimage(preimage)}`}>
          {truncatePreimage(preimage)}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={handlePay}
        disabled={isPaying || !invoice}
        className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold transition-opacity duration-200 ease-[cubic-bezier(0.25,1,0.5,1)] hover:opacity-80 active:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: 'var(--color-accent)',
          color: 'var(--color-primary-foreground)',
          borderRadius: 'var(--radius-md)',
        }}
        aria-label={
          isPaying
            ? `Paying ${formatSats(amountSats)}`
            : `Pay ${formatSats(amountSats)}${memo ? ` for ${memo}` : ''}`
        }
        aria-busy={isPaying}
      >
        {isPaying ? (
          <>
            <span
              className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
              aria-hidden
            />
            Paying…
          </>
        ) : (
          `Pay ${formatSats(amountSats)}`
        )}
      </button>
      {paymentError && (
        <p
          className="text-xs"
          style={{ color: 'var(--color-error, #ef4444)' }}
          role="alert"
          aria-label={`Payment failed: ${paymentError.message}`}
        >
          {paymentError.message}
        </p>
      )}
    </div>
  );
}
