// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AuthError, verifyNip98 } from '../lib/auth/nip98';
import { header, keypair, signNip98 } from './helpers';

const { sk, pk } = keypair(7);
const url = 'https://board.example/api/listings';
const body = JSON.stringify({ title: 'x' });

describe('NIP-98 auth', () => {
  it('accepts a valid signed event', () => {
    const ev = signNip98(sk, url, 'POST', body);
    expect(verifyNip98({ header: header(ev), method: 'POST', url, body }).pubkey).toBe(pk);
  });
  it('accepts either allowed origin (dual-host) and rejects others', () => {
    const allowed = ['https://satsboard-fedi.vercel.app/api/listings', 'https://fedi-board.vercel.app/api/listings'];
    for (const u of allowed) {
      const ev = signNip98(sk, u, 'POST', body);
      expect(verifyNip98({ header: header(ev), method: 'POST', url: allowed, body }).pubkey).toBe(pk);
    }
    const evil = signNip98(sk, 'https://evil.example/api/listings', 'POST', body);
    expect(() => verifyNip98({ header: header(evil), method: 'POST', url: allowed, body })).toThrow(/URL/);
  });
  it('rejects missing header', () => {
    expect(() => verifyNip98({ header: null, method: 'GET', url })).toThrow(AuthError);
  });
  it('rejects tampered content / forged pubkey', () => {
    const ev = signNip98(sk, url, 'POST', body);
    const forged = { ...ev, pubkey: keypair(8).pk };
    expect(() => verifyNip98({ header: header(forged), method: 'POST', url, body })).toThrow(/signature/);
  });
  it('rejects wrong url, method, payload and stale events', () => {
    const ev = signNip98(sk, url, 'POST', body);
    expect(() => verifyNip98({ header: header(ev), method: 'POST', url: url + '/abc', body })).toThrow(/URL/);
    expect(() => verifyNip98({ header: header(ev), method: 'DELETE', url, body })).toThrow(/Method/);
    expect(() => verifyNip98({ header: header(ev), method: 'POST', url, body: body + ' ' })).toThrow(/Payload/);
    const old = signNip98(sk, url, 'POST', body, Math.floor(Date.now() / 1000) - 300);
    expect(() => verifyNip98({ header: header(old), method: 'POST', url, body })).toThrow(/expired/);
  });
});
