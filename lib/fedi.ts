export function isInFedi(): boolean {
  return typeof window !== 'undefined' && typeof window.webln !== 'undefined';
}

export function getFediInternalVersion(): 0 | 1 | 2 | null {
  if (typeof window === 'undefined' || !window.fediInternal) return null;
  return window.fediInternal.version as 0 | 1 | 2;
}

/** True when Fedi rejected a call due to a missing or denied mini-app permission. */
export function isFediPermissionError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /permission denied|missing the following permissions/i.test(message);
}

export function formatSats(sats: number): string {
  if (sats >= 100_000) return `${(sats / 100_000_000).toFixed(6)} BTC`;
  return `${sats.toLocaleString()} sats`;
}

export function shortenNpub(npub: string): string {
  if (npub.length < 16) return npub;
  return `${npub.slice(0, 8)}...${npub.slice(-4)}`;
}
