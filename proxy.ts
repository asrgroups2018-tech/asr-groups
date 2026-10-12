import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { CUSTOMER_ROLE_ID } from '@/lib/types';

const SESSION_CACHE_TTL_MS = 5_000;
const sessionCache = new Map<string, { expiresAt: number; user: Awaited<ReturnType<typeof db.getUserBySessionToken>> }>();

async function getCachedSessionUser(token: string | undefined) {
  if (!token) return null;
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > Date.now()) return cached.user;
  if (cached) sessionCache.delete(token);

  const user = await db.getUserBySessionToken(token);
  sessionCache.set(token, { user, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  return user;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Leave Next internals, public assets, and all API endpoints untouched.
  if (
    pathname.startsWith('/_next') ||
    isPublicAsset(pathname) ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname.startsWith('/api/')
  ) {
    return NextResponse.next();
  }

  if (pathname !== pathname.toLowerCase()) {
    const url = request.nextUrl.clone();
    url.pathname = pathname.toLowerCase();
    return NextResponse.redirect(url, 308);
  }

  let user;
  try {
    user = await getCachedSessionUser(request.cookies.get('asr_session')?.value);
  } catch (error) {
    console.error('Session validation failed:', error);
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Authentication service is temporarily unavailable. Please retry.' },
        { status: 503 },
      );
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${request.nextUrl.search}`);
    loginUrl.searchParams.set('error', 'service-unavailable');
    return NextResponse.redirect(loginUrl);
  }

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
    const isAdministrator = user.assignedRoleIds.some((roleId) => roleId === 0);
    if (!isAdministrator) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'Administrator access required.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  const isCustomer = user.isCustomer || user.primaryRoleId === CUSTOMER_ROLE_ID;
  if (isCustomer) {
    const isDefaultCustomerPage =
      pathname === '/dashboard' || pathname.startsWith('/dashboard/') ||
      pathname === '/loans' || pathname.startsWith('/loans/');
    const permission = routePermission(pathname, request.method, request.nextUrl.searchParams);
    let hasSavedPageAccess = false;
    if (!isDefaultCustomerPage && permission && permission.module !== 'admin') {
      const matrix = await db.getPermissionMatrix();
      hasSavedPageAccess = Boolean(matrix[permission.module]?.[permission.action]?.[user.primaryRoleId]);
    }

    if (!isDefaultCustomerPage && !hasSavedPageAccess) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: 'This page is not enabled for the customer account.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  const permission = routePermission(pathname, request.method, request.nextUrl.searchParams);
  if (permission && !user.assignedRoleIds.includes(0)) {
    const matrix = await db.getPermissionMatrix();
    const allowed = user.assignedRoleIds.some((roleId) => Boolean(matrix[permission.module]?.[permission.action]?.[roleId]));
    if (!allowed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ success: false, error: `Permission required: ${permission.action} ${permission.module}.` }, { status: 403 });
      }
      const deniedUrl = new URL('/access-denied', request.url);
      deniedUrl.searchParams.set('resource', permission.module);
      deniedUrl.searchParams.set('action', permission.action);
      deniedUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(deniedUrl);
    }
  }

  return NextResponse.next();
}

function routePermission(pathname: string, method: string, searchParams: URLSearchParams): { module: string; action: 'view' | 'create' | 'edit' | 'delete' | 'approve' | 'export' } | null {
  if (pathname === '/api/access-requests' || pathname === '/access-denied') return null;
  const module = pathname === '/dashboard' || pathname.startsWith('/api/dashboard') ? 'dashboard'
    : pathname === '/loans' || pathname.startsWith('/loans/') || pathname.startsWith('/api/loans') || pathname.startsWith('/api/receipts') || pathname.startsWith('/api/installments') ? 'loans'
      : pathname === '/customers' || pathname.startsWith('/customers/') || pathname.startsWith('/api/customers') ? 'customers'
        : pathname === '/companies' || pathname.startsWith('/companies/') || pathname.startsWith('/api/companies') ? 'companies'
          : pathname === '/schedule' || pathname.startsWith('/schedule/') ? 'schedule'
            : pathname === '/reports' || pathname.startsWith('/reports/') ? 'reports'
              : pathname === '/requests' || pathname.startsWith('/requests/') || pathname.startsWith('/api/requests') ? 'requests'
                : pathname === '/administration' || pathname.startsWith('/administration/') || pathname.startsWith('/api/admin/') ? 'admin'
                  : null;
  if (!module) return null;
  if (searchParams.has('export') || searchParams.get('format') === 'csv' || searchParams.get('download') === '1') return { module, action: 'export' };
  if (method === 'POST') return { module, action: 'create' };
  if (method === 'PUT' || method === 'PATCH') return { module, action: 'edit' };
  if (method === 'DELETE') return { module, action: 'delete' };
  return { module, action: 'view' };
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
