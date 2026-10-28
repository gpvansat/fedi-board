import { sha256 } from '@noble/hashes/sha256';

function hexToBytes(hex: string): Uint8Array {
  const normalized = hex.replace(/^0x/i, '');
  const bytes = new Uint8Array(normalized.length / 2);
  for (let i = 0; i < normalized.length; i += 2) {
    bytes[i / 2] = Number.parseInt(normalized.slice(i, i + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies that a Lightning payment preimage matches the expected payment hash.
 */
export function verifyPreimage(preimage: string, paymentHashHex: string): boolean {
  try {
    const preimageBytes = hexToBytes(preimage);
    const hash = sha256(preimageBytes);
    const expected = hexToBytes(paymentHashHex);
    if (hash.length !== expected.length) return false;
    return bytesToHex(hash) === bytesToHex(expected);
  } catch {
    return false;
  }
}
