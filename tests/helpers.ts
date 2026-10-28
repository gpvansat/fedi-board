import { schnorr } from '@noble/curves/secp256k1.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';
import { eventId, sha256Hex, type INostrEvent } from '../lib/auth/nip98';

export function keypair(n: number) {
  const sk = new Uint8Array(32);
  sk[31] = n;
  return { sk, pk: bytesToHex(schnorr.getPublicKey(sk)) };
}

export function signNip98(sk: Uint8Array, url: string, method: string, body?: string, createdAt = Math.floor(Date.now() / 1000)): INostrEvent {
  const pubkey = bytesToHex(schnorr.getPublicKey(sk));
  const tags = [['u', url], ['method', method]];
  if (body) tags.push(['payload', sha256Hex(body)]);
  const base = { pubkey, created_at: createdAt, kind: 27235, tags, content: '' };
  const id = eventId(base);
  return { ...base, id, sig: bytesToHex(schnorr.sign(hexToBytes(id), sk)) };
}

export const header = (e: INostrEvent) => `Nostr ${Buffer.from(JSON.stringify(e)).toString('base64')}`;

/** BOLT11 spec test vector: 2500u (250,000 sats), payment_hash 0001..0102 */
export const SPEC_INVOICE =
  'lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3kdzw5hydlzf03qdgm2hdq27cqv3agm2awhz5se903vruatfhq77w3ls4evs3ch9zw97j25emudupq63nyw24cg27h2rspfj9srp';
export const SPEC_HASH = '0001020304050607080900010203040506070809000102030405060708090102';
