'use client';

import { useEffect, useState } from 'react';
import {
  formatSats,
  formatTimestamp,
  getPaymentHistory,
  PAYMENT_HISTORY_EVENT,
  PAYMENT_HISTORY_KEY,
  truncatePreimage,
  type TPaymentRecord,
} from '../../lib/payment-history';

export function PaymentHistory() {
  const [records, setRecords] = useState<TPaymentRecord[]>([]);

  useEffect(() => {
    function refresh() {
      setRecords(getPaymentHistory());
    }

    refresh();
    window.addEventListener(PAYMENT_HISTORY_EVENT, refresh);
    window.addEventListener('storage', (event) => {
      if (event.key === PAYMENT_HISTORY_KEY) refresh();
    });
    return () => window.removeEventListener(PAYMENT_HISTORY_EVENT, refresh);
  }, []);

  if (records.length === 0) {
    return (
      <div
        className="rounded-xl p-4 text-center"
        style={{
          background: 'var(--color-surface-1)',
          border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-lg)',
        }}
        aria-label="No payment history"
      >
        <p className="text-sm font-medium mb-1" style={{ color: 'var(--color-text)' }}>
          No payments yet
        </p>
        <p className="text-xs leading-[1.65]" style={{ color: 'var(--color-text-muted)' }}>
          Send or receive a Lightning payment and it will appear here. History is stored locally
          in your browser, not on a server.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2" aria-label="Recent payments">
      {records.map((record) => (
        <li
          key={record.id}
          className="rounded-xl p-3"
          style={{
            background: 'var(--color-surface-1)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                {formatSats(record.amountSats)}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {record.memo}
              </p>
            </div>
            <span
              className="text-xs font-medium shrink-0"
              style={{
                color: record.type === 'send' ? 'var(--color-text-subtle)' : 'var(--color-accent)',
              }}
            >
              {record.type === 'send' ? 'Sent' : 'Received'}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <time
              className="text-xs"
              style={{ color: 'var(--color-text-subtle)' }}
              dateTime={new Date(record.timestamp).toISOString()}
            >
              {formatTimestamp(record.timestamp)}
            </time>
            <span
              className="font-mono text-xs"
              style={{ color: 'var(--color-text-muted)' }}
              aria-label={`Preimage ${truncatePreimage(record.preimage)}`}
            >
              {truncatePreimage(record.preimage)}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}
