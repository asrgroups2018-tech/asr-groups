import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/lib/server/db';
import { CUSTOMER_ROLE_ID } from '@/lib/types';
import { getFirstPermittedPage, getPermissionActionLabel, getPermissionModuleLabel, getPermissionRequestReason, resolveRoutePermission } from '@/lib/permissions';

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Leave Next internals, public assets, and the authentication endpoints untouched.
  if (
    pathname.startsWith('/_next') ||
    isPublicAsset(pathname) ||
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/api/auth/login' ||
    pathname === '/api/auth/logout' ||
    pathname === '/api/auth/me'
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
    user = await db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
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
    const permission = resolveRoutePermission(pathname, request.method, request.nextUrl.searchParams);
    let hasSavedPageAccess = false;
    if (!isDefaultCustomerPage && permission && permission.module !== 'admin') {
      const matrix = await db.getPermissionMatrix();
      hasSavedPageAccess = Boolean(matrix[permission.module]?.[permission.action]?.[user.primaryRoleId]);
    }

    if (!isDefaultCustomerPage && !hasSavedPageAccess) {
      if (pathname.startsWith('/api/')) {
        if (permission) {
          if (permission.action !== 'view') {
            await createAutomaticAccessRequest(user, permission.module, permission.action);
            return accessRequestQueuedResponse(permission.module, permission.action);
          }
          return accessDeniedResponse(permission.module, permission.action);
        }
        return NextResponse.json({ success: false, error: 'This page is not enabled for the customer account.' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return NextResponse.next();
  }

  const permission = resolveRoutePermission(pathname, request.method, request.nextUrl.searchParams);
  if (permission && !user.assignedRoleIds.includes(0)) {
    const matrix = await db.getPermissionMatrix();
    const allowed = user.assignedRoleIds.some((roleId) => Boolean(matrix[permission.module]?.[permission.action]?.[roleId]));
    if (!allowed) {
      if (pathname.startsWith('/api/')) {
        if (permission.action !== 'view') {
          await createAutomaticAccessRequest(user, permission.module, permission.action);
          return accessRequestQueuedResponse(permission.module, permission.action);
        }
        return accessDeniedResponse(permission.module, permission.action);
      }
      const deniedUrl = new URL('/access-denied', request.url);
      if (permission.action === 'view') {
        const permittedPage = getFirstPermittedPage(matrix, user.assignedRoleIds);
        if (permittedPage && permittedPage !== pathname) {
          return NextResponse.redirect(new URL(permittedPage, request.url));
        }
      }
      deniedUrl.searchParams.set('resource', permission.module);
      deniedUrl.searchParams.set('action', permission.action);
      deniedUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(deniedUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

function isPublicAsset(pathname: string) {
  return !pathname.startsWith('/api/') && /\.[a-z0-9]{2,8}$/i.test(pathname);
}

async function createAutomaticAccessRequest(
  user: Awaited<ReturnType<typeof db.getUserBySessionToken>>,
  moduleId: string,
  action: NonNullable<ReturnType<typeof resolveRoutePermission>>['action'],
) {
  if (!user || moduleId === 'admin' || user.assignedRoleIds.includes(0)) return;
  try {
    await db.createAccessRequest({
      userId: user.id,
      userName: user.name,
      roleId: user.primaryRoleId,
      moduleId,
      action,
      reason: getPermissionRequestReason(moduleId, action),
    });
  } catch (error) {
    console.error('Failed to record automatic access request:', error);
  }
}

function accessRequestQueuedResponse(moduleId: string, action: string) {
  const actionLabel = getPermissionActionLabel(action).toLowerCase();
  const moduleLabel = getPermissionModuleLabel(moduleId);
  return NextResponse.json(
    {
      success: true,
      queued: true,
      accessRequestSubmitted: true,
      message: `Your ${actionLabel} access request for the ${moduleLabel} page was submitted for approval.`,
    },
    { status: 202 },
  );
}

function accessDeniedResponse(moduleId: string, action: string) {
  const actionLabel = getPermissionActionLabel(action).toLowerCase();
  const moduleLabel = getPermissionModuleLabel(moduleId);
  return NextResponse.json(
    {
      success: false,
      error: `Permission required: ${actionLabel} access for the ${moduleLabel} page.`,
      accessRequestSubmitted: false,
    },
    { status: 403 },
  );
}
