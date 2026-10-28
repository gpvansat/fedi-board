'use client';
import type { NostrEvent, UnsignedNostrEvent } from '../fedi-types';

type TSigner = (e: UnsignedNostrEvent) => Promise<NostrEvent | null>;

async function sha256Hex(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function b64(text: string) {
  const bytes = new TextEncoder().encode(text);
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s);
}

/** fetch() with a NIP-98 Authorization header signed by window.nostr. */
export async function authedFetch(sign: TSigner, path: string, method: string, body?: unknown) {
  const url = new URL(path, window.location.origin).toString();
  const raw = body === undefined ? undefined : JSON.stringify(body);
  const tags = [['u', url], ['method', method]];
  if (raw) tags.push(['payload', await sha256Hex(raw)]);
  const ev = await sign({ kind: 27235, created_at: Math.floor(Date.now() / 1000), tags, content: '' });
  if (!ev) throw new Error('Signing was cancelled');
  const res = await fetch(url, {
    method,
    headers: { authorization: `Nostr ${b64(JSON.stringify(ev))}`, ...(raw ? { 'content-type': 'application/json' } : {}) },
    body: raw,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

/** Ask the server to verify a payment; polls a few times because settlement can lag. */
export async function confirmWithServer(paymentId: string, preimage?: string, tries = 10) {
  for (let i = 0; i < tries; i++) {
    const res = await fetch(`/api/payments/${paymentId}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ preimage }),
    });
    const data = await res.json();
    if (data.settled) return true;
    if (data.expired) return false;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}
