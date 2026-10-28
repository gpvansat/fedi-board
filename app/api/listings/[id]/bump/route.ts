import { NextResponse } from 'next/server';
import { boardCtx, handleError, requireAuth } from '../../../../../lib/board/server';
import { requestBump } from '../../../../../lib/board/service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await boardCtx();
    const raw = await req.text();
    const pubkey = await requireAuth(req, ctx, raw);
    return NextResponse.json(await requestBump(ctx, pubkey, id), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
