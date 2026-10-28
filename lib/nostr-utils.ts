import { bech32 } from '@scure/base';

/**
 * Derives a stable HSL color from a hex pubkey using a simple string hash.
 */
export function pubkeyToHsl(pubkey: string): { h: number; s: number; l: number } {
  let hash = 0;
  for (let i = 0; i < pubkey.length; i++) {
    hash = pubkey.charCodeAt(i) + ((hash << 5) - hash);
  }
  return {
    h: Math.abs(hash) % 360,
    s: 60,
    l: 50,
  };
}

/** Converts a hex-encoded pubkey to bech32 npub format. */
export function pubkeyToNpub(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.slice(i, i + 2), 16);
  }
  return bech32.encodeFromBytes('npub', bytes);
}

/** Truncated npub for compact display, e.g. `npub1abc...xyz4`. */
export function truncateNpub(npub: string): string {
  return npub.slice(0, 8) + '...' + npub.slice(-4);
}
