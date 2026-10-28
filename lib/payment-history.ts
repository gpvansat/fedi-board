export type TPaymentRecord = {
  id: string;
  amountSats: number;
  memo: string;
  timestamp: number;
  preimage: string;
  type: 'send' | 'receive';
};

export const PAYMENT_HISTORY_KEY = 'fedi-payment-history';
export const PAYMENT_HISTORY_EVENT = 'fedi-payment-history-updated';
const MAX_RECORDS = 50;

function notifyHistoryUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(PAYMENT_HISTORY_EVENT));
}

/**
 * Reads payment history from localStorage, newest first.
 */
export function getPaymentHistory(): TPaymentRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PAYMENT_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TPaymentRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Appends a payment record and persists to localStorage.
 */
export function addPaymentRecord(
  record: Omit<TPaymentRecord, 'id'>,
): TPaymentRecord {
  const entry: TPaymentRecord = {
    ...record,
    id: `${record.timestamp}-${record.preimage.slice(0, 8)}`,
  };
  const history = [entry, ...getPaymentHistory()].slice(0, MAX_RECORDS);
  window.localStorage.setItem(PAYMENT_HISTORY_KEY, JSON.stringify(history));
  notifyHistoryUpdated();
  return entry;
}

/**
 * Clears all stored payment records.
 */
export function clearPaymentHistory(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(PAYMENT_HISTORY_KEY);
  notifyHistoryUpdated();
}

export function formatSats(sats: number): string {
  return `${sats.toLocaleString()} sats`;
}

export function truncatePreimage(preimage: string): string {
  if (preimage.length <= 20) return preimage;
  return `${preimage.slice(0, 12)}…${preimage.slice(-8)}`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
