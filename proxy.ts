import { NextRequest, NextResponse } from 'next/server';
export default function proxy(request: NextRequest) {
  // Base: pass-through. payment-gated-content module extends this.
  return NextResponse.next();
}
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
