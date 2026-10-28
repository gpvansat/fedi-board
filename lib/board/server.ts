import { NextResponse } from 'next/server';
import { serverEnv, setupStatus } from '../../env';
import { AuthError, verifyNip98 } from '../auth/nip98';
import { getDb } from '../db';
import { getPaymentBackend, PaymentBackendError } from '../payments';
import { BoardError, consumeAuthEvent, type IBoardCtx } from './service';

export async function boardCtx(): Promise<IBoardCtx> {
  const env = serverEnv();
  if (!setupStatus().postingOpen) throw new BoardError('Posting opens soon', 503);
  return {
    db: await getDb(),
    backend: getPaymentBackend(),
    postPriceSats: env.POST_PRICE_SATS,
    bumpPriceSats: env.BUMP_PRICE_SATS,
    acceptPreimageProof: env.ACCEPT_PREIMAGE_PROOF === 'true',
    reportHideThreshold: env.REPORT_HIDE_THRESHOLD,
    adminPubkeys: env.ADMIN_PUBKEYS.split(',').map((s) => s.trim()).filter(Boolean),
  };
}

/** Origins whose signed URLs we accept: PUBLIC_BASE_URL plus ALLOWED_BASE_URLS (comma list). */
export function allowedBaseUrls(): string[] {
  const env = serverEnv();
  return [env.PUBLIC_BASE_URL, ...(env.ALLOWED_BASE_URLS ?? '').split(',')]
    .map((s) => s?.trim())
    .filter((s): s is string => !!s);
}

/** URLs the client may have signed: each allowed base + path, else the forwarded origin. */
export function expectedUrls(req: Request): string[] {
  const u = new URL(req.url);
  const bases = allowedBaseUrls();
  if (bases.length) return bases.map((b) => new URL(u.pathname + u.search, b).toString());
  return [expectedUrl(req)];
}

export function expectedUrl(req: Request): string {
  const u = new URL(req.url);
  const host = req.headers.get('x-forwarded-host') ?? req.headers.get('host') ?? u.host;
  const proto = req.headers.get('x-forwarded-proto') ?? u.protocol.replace(':', '');
  return `${proto}://${host}${u.pathname}${u.search}`;
}

/** Verify NIP-98 auth and burn the event id. Returns author pubkey. */
export async function requireAuth(req: Request, ctx: IBoardCtx, body?: string): Promise<string> {
  const ev = verifyNip98({ header: req.headers.get('authorization'), method: req.method, url: expectedUrls(req), body });
  await consumeAuthEvent(ctx, ev.id);
  return ev.pubkey;
}

export function handleError(err: unknown) {
  if (err instanceof AuthError) return NextResponse.json({ error: err.message }, { status: 401 });
  if (err instanceof BoardError) return NextResponse.json({ error: err.message }, { status: err.status });
  if (err instanceof PaymentBackendError) return NextResponse.json({ error: err.message }, { status: 502 });
  if (err && typeof err === 'object' && 'issues' in err) return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  console.error(err);
  return NextResponse.json({ error: 'Server error' }, { status: 500 });
}
