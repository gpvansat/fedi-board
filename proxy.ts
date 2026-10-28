import { NextRequest, NextResponse } from 'next/server';

export const LEGACY_HOST = 'fedi-board.vercel.app';
export const PRIMARY_ORIGIN = 'https://satsboard-fedi.vercel.app';

/** 308 page navigations on the legacy host to the primary origin; APIs stay served on both. */
export default function proxy(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').toLowerCase();
  const { pathname, search } = request.nextUrl;
  if (host === LEGACY_HOST && request.method === 'GET' && !pathname.startsWith('/api/')) {
    return NextResponse.redirect(new URL(pathname + search, PRIMARY_ORIGIN), 308);
  }
  return NextResponse.next();
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
