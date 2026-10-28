import { bech32 } from '@scure/base';

export function hexToNpub(hex: string): string {
  const bytes = new Uint8Array(hex.match(/../g)!.map((h) => parseInt(h, 16)));
  return bech32.encodeFromBytes('npub', bytes);
}
