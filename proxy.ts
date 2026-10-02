import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Leave Next internals, public assets, and the authentication endpoints untouched.
  if (
    pathname.startsWith('/_next') ||
    isPublicAsset(pathname) ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth/')
  ) {
    return normalizePath(request);
  }

  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  const user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
  if (!user) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  const isAdministratorRoute =
    pathname === '/administration' ||
    pathname.startsWith('/administration/') ||
    pathname.startsWith('/api/admin/');

  if (isAdministratorRoute) {
    const isAdministrator = user.assignedRoleIds.some((roleId) => roleId === 0 || roleId === 1);
    if (!isAdministrator) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Administrator access required.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

function normalizePath(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

function isPublicAsset(pathname: string) {
  return !pathname.startsWith('/api/') && /\.[a-z0-9]{2,8}$/i.test(pathname);
}
