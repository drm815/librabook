import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';

const PUBLIC_PATHS = ['/login', '/api/auth/login'];
const ADMIN_PATHS = ['/admin'];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const payload = await verifyToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (ADMIN_PATHS.some(p => pathname.startsWith(p)) && payload.role !== 'admin') {
    return NextResponse.redirect(new URL('/timetable', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
