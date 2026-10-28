import { NextResponse } from 'next/server';
import { boardCtx, handleError, requireAuth } from '../../../lib/board/server';
import { myListings } from '../../../lib/board/service';

export async function GET(req: Request) {
  try {
    const ctx = await boardCtx();
    const pubkey = await requireAuth(req, ctx);
    return NextResponse.json({ listings: await myListings(ctx, pubkey) });
  } catch (e) {
    return handleError(e);
  }
}
