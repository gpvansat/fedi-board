import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

/** True when sha256(preimage) equals the invoice payment hash. */
export function preimageMatches(preimage: string | undefined | null, paymentHash: string): boolean {
  if (!preimage || !/^[0-9a-fA-F]{64}$/.test(preimage)) return false;
  return bytesToHex(sha256(hexToBytes(preimage.toLowerCase()))) === paymentHash.toLowerCase();
}
