import { NextResponse } from 'next/server';
import { boardCtx, handleError, requireAuth } from '../../../lib/board/server';
import { createListing, listLive } from '../../../lib/board/service';
import { listingInput } from '../../../lib/board/validate';
import { setupStatus } from '../../../env';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    if (!setupStatus().dbReady) return NextResponse.json({ listings: [], comingSoon: true });
    const category = new URL(req.url).searchParams.get('category') ?? undefined;
    return NextResponse.json({ listings: await listLive(await boardCtx(), category) });
  } catch (e) {
    return handleError(e);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await boardCtx();
    const raw = await req.text();
    const pubkey = await requireAuth(req, ctx, raw);
    const input = listingInput.parse(JSON.parse(raw));
    return NextResponse.json(await createListing(ctx, pubkey, input), { status: 201 });
  } catch (e) {
    return handleError(e);
  }
}
