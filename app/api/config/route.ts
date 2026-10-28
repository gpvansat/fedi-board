import { NextResponse } from 'next/server';
import { serverEnv, setupStatus } from '../../../env';

export const dynamic = 'force-dynamic';

export function GET() {
  const env = serverEnv();
  return NextResponse.json({ postPriceSats: env.POST_PRICE_SATS, bumpPriceSats: env.BUMP_PRICE_SATS, postingOpen: setupStatus().postingOpen });
}
