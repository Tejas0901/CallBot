import { NextRequest, NextResponse } from 'next/server';

const ACCESS_TOKEN_COOKIE = 'callbot_access_token';
const REFRESH_TOKEN_COOKIE = 'callbot_refresh_token';

// Routes that are publicly accessible without authentication.
// Everything else is treated as protected by default.
const PUBLIC_ROUTES = ['/', '/auth/login', '/auth/signup'];

// Auth pages — if user already has a valid session, bounce them to dashboard.
const AUTH_PAGES = ['/auth/login', '/auth/signup'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

function isAuthPage(pathname: string): boolean {
  return AUTH_PAGES.includes(pathname);
}

// Edge-runtime safe base64url decode for JWT payload.
function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';
    const decoded =
      typeof atob === 'function'
        ? atob(payload)
        : Buffer.from(payload, 'base64').toString('binary');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now;
}

function redirectToLogin(request: NextRequest, clearCookies: boolean): NextResponse {
  const loginUrl = new URL('/auth/login', request.url);
  const { pathname, search } = request.nextUrl;
  if (pathname && pathname !== '/auth/login') {
    loginUrl.searchParams.set('redirect', pathname + (search || ''));
  }
  const response = NextResponse.redirect(loginUrl);
  if (clearCookies) {
    response.cookies.delete(ACCESS_TOKEN_COOKIE);
    response.cookies.delete(REFRESH_TOKEN_COOKIE);
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const hasValidToken = !!accessToken && !isTokenExpired(accessToken);

  // Signed-in users shouldn't see login/signup.
  if (hasValidToken && isAuthPage(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Public routes pass through.
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // Protected route: require a valid (non-expired) token.
  if (!accessToken) {
    return redirectToLogin(request, false);
  }
  if (isTokenExpired(accessToken)) {
    return redirectToLogin(request, true);
  }

  return NextResponse.next();
}

// Apply to all routes except API and static assets.
export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)).*)'],
};
