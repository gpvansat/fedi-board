import { NextResponse } from 'next/server';
import { boardCtx, handleError, requireAuth } from '../../../../lib/board/server';
import { editListing, removeListing } from '../../../../lib/board/service';
import { listingPatch } from '../../../../lib/board/validate';

type TParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: TParams) {
  try {
    const { id } = await params;
    const ctx = await boardCtx();
    const raw = await req.text();
    const pubkey = await requireAuth(req, ctx, raw);
    return NextResponse.json({ listing: await editListing(ctx, pubkey, id, listingPatch.parse(JSON.parse(raw))) });
  } catch (e) {
    return handleError(e);
  }
}

export async function DELETE(req: Request, { params }: TParams) {
  try {
    const { id } = await params;
    const ctx = await boardCtx();
    const pubkey = await requireAuth(req, ctx);
    await removeListing(ctx, pubkey, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return handleError(e);
  }
}
