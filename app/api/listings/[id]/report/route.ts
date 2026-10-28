import { NextResponse } from 'next/server';
import { boardCtx, handleError, requireAuth } from '../../../../../lib/board/server';
import { reportListing } from '../../../../../lib/board/service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await boardCtx();
    const raw = await req.text();
    const pubkey = await requireAuth(req, ctx, raw);
    const reason = raw ? (JSON.parse(raw) as { reason?: string }).reason : undefined;
    return NextResponse.json(await reportListing(ctx, pubkey, id, typeof reason === 'string' ? reason : undefined));
  } catch (e) {
    return handleError(e);
  }
}
