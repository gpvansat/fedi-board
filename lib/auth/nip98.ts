import { schnorr } from '@noble/curves/secp256k1.js';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

export const NIP98_KIND = 27235;

export interface INostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export class AuthError extends Error {}

export function sha256Hex(text: string): string {
  return bytesToHex(sha256(new TextEncoder().encode(text)));
}

export function eventId(e: Omit<INostrEvent, 'id' | 'sig'>): string {
  return sha256Hex(JSON.stringify([0, e.pubkey, e.created_at, e.kind, e.tags, e.content]));
}

export function verifyEventSignature(e: INostrEvent): boolean {
  try {
    if (!/^[0-9a-f]{64}$/.test(e.pubkey) || !/^[0-9a-f]{128}$/.test(e.sig)) return false;
    if (eventId(e) !== e.id) return false;
    return schnorr.verify(hexToBytes(e.sig), hexToBytes(e.id), hexToBytes(e.pubkey));
  } catch {
    return false;
  }
}

function normUrl(u: string): string {
  const url = new URL(u);
  return `${url.protocol}//${url.host.toLowerCase()}${url.pathname.replace(/\/+$/, '')}${url.search}`;
}

/**
 * Verifies a NIP-98 `Authorization: Nostr <base64 event>` header.
 * Checks kind, signature, freshness, URL, method and (for bodies) payload hash.
 */
export function verifyNip98(args: {
  header: string | null;
  method: string;
  url: string | string[];
  body?: string;
  nowSec?: number;
  maxAgeSec?: number;
}): INostrEvent {
  const { header, method, url, body } = args;
  const now = args.nowSec ?? Math.floor(Date.now() / 1000);
  const maxAge = args.maxAgeSec ?? 60;
  if (!header?.startsWith('Nostr ')) throw new AuthError('Missing Nostr authorization');
  let event: INostrEvent;
  try {
    event = JSON.parse(Buffer.from(header.slice(6).trim(), 'base64').toString('utf8'));
  } catch {
    throw new AuthError('Malformed authorization event');
  }
  if (event.kind !== NIP98_KIND) throw new AuthError('Wrong event kind');
  if (!verifyEventSignature(event)) throw new AuthError('Bad signature');
  if (Math.abs(now - event.created_at) > maxAge) throw new AuthError('Authorization expired');
  const tag = (n: string) => event.tags.find((t) => t[0] === n)?.[1];
  const u = tag('u');
  if (!u) throw new AuthError('Missing u tag');
  try {
    const allowed = (Array.isArray(url) ? url : [url]).map(normUrl);
    if (!allowed.includes(normUrl(u))) throw new AuthError('URL mismatch');
  } catch (e) {
    throw e instanceof AuthError ? e : new AuthError('URL mismatch');
  }
  if ((tag('method') ?? '').toUpperCase() !== method.toUpperCase()) throw new AuthError('Method mismatch');
  if (body && body.length > 0) {
    if (tag('payload') !== sha256Hex(body)) throw new AuthError('Payload hash mismatch');
  }
  return event;
}
