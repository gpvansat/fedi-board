import { NextResponse } from 'next/server';
import { boardCtx, handleError } from '../../../../lib/board/server';
import { confirmPayment } from '../../../../lib/board/service';

/**
 * Check a pending payment server-side. Body may include { preimage } returned by
 * webln.sendPayment; it is only used as cryptographic proof (sha256 must match the hash).
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const raw = await req.text();
    const preimage = raw ? (JSON.parse(raw) as { preimage?: unknown }).preimage : undefined;
    return NextResponse.json(await confirmPayment(await boardCtx(), id, typeof preimage === 'string' ? preimage : null));
  } catch (e) {
    return handleError(e);
  }
}
