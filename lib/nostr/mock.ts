// WARNING: Test keypair only. NEVER use in production
import { schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha256';
import type { NostrProvider, NostrEvent, UnsignedNostrEvent, Nip04 } from '../fedi-types';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Lowest valid secp256k1 private key, famous test vector, NOT for production
const TEST_PRIVKEY = new Uint8Array(32);
TEST_PRIVKEY[31] = 1;

const TEST_PUBKEY_BYTES = schnorr.getPublicKey(TEST_PRIVKEY);
const TEST_PUBKEY_HEX = bytesToHex(TEST_PUBKEY_BYTES);

export class MockNostrProvider implements NostrProvider {
  readonly nip04: Nip04 = {
    async encrypt(_pubkey: string, plaintext: string): Promise<string> {
      return Buffer.from(plaintext).toString('base64') + '?iv=fakefakefakefake';
    },
    async decrypt(_pubkey: string, ciphertext: string): Promise<string> {
      const [b64] = ciphertext.split('?iv=');
      return Buffer.from(b64, 'base64').toString('utf-8');
    },
  };

  async getPublicKey(): Promise<string> {
    return TEST_PUBKEY_HEX;
  }

  async signEvent(event: UnsignedNostrEvent): Promise<NostrEvent> {
    const serialized = JSON.stringify([
      0,
      TEST_PUBKEY_HEX,
      event.created_at,
      event.kind,
      event.tags,
      event.content,
    ]);
    const idBytes = sha256(new TextEncoder().encode(serialized));
    const idHex = bytesToHex(idBytes);
    const sigBytes = schnorr.sign(idBytes, TEST_PRIVKEY);
    return {
      ...event,
      pubkey: TEST_PUBKEY_HEX,
      id: idHex,
      sig: bytesToHex(sigBytes),
    };
  }

  async getRelays(): Promise<Record<string, { read: boolean; write: boolean }>> {
    return {
      'wss://relay.damus.io': { read: true, write: true },
      'wss://nos.lol': { read: true, write: false },
    };
  }
}
