import { NextRequest, NextResponse } from 'next/server';
import { ModuleAction, User } from '@/lib/types';
import { getPermissionActionLabel, getPermissionModuleLabel, getPermissionRequestReason, resolveRoutePermission } from '@/lib/permissions';
import { db } from './db';

export const SUPER_ADMIN_ROLE_ID = 0;

export type AuthorizationResult =
  | { ok: true; user: User }
  | { ok: false; response: NextResponse };

export async function getRequestUser(request: NextRequest): Promise<User | null> {
  return db.getUserBySessionToken(request.cookies.get('asr_session')?.value);
}

export async function authorizeRequest(
  request: NextRequest,
  module?: string,
  action?: ModuleAction,
): Promise<AuthorizationResult> {
  const user = await getRequestUser(request);
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 }),
    };
  }

  if (!module || !action) return { ok: true, user };

  if (module === 'admin' && !isSuperAdmin(user)) {
    return {
      ok: false,
      response: NextResponse.json({ success: false, error: 'Super Admin access required.' }, { status: 403 }),
    };
  }

  if (!isSuperAdmin(user)) {
    const matrix = await db.getPermissionMatrix();
    const allowed = user.assignedRoleIds.some((roleId) => Boolean(matrix[module]?.[action]?.[roleId]));
    if (!allowed) {
      const actionLabel = getPermissionActionLabel(action).toLowerCase();
      const moduleLabel = getPermissionModuleLabel(module);
      let accessRequestSubmitted = false;
      try {
        if (action !== 'view') {
          const accessRequest = await db.createAccessRequest({
            userId: user.id,
            userName: user.name,
            roleId: user.primaryRoleId,
            moduleId: module,
            action,
            reason: getPermissionRequestReason(module, action),
          });
          accessRequestSubmitted = accessRequest.status === 'Pending';
        }
      } catch (error) {
        console.error('Failed to record access request:', error);
      }
      if (accessRequestSubmitted) {
        return {
          ok: false,
          response: NextResponse.json(
            {
              success: true,
              queued: true,
              accessRequestSubmitted: true,
              message: `Your ${actionLabel} access request for the ${moduleLabel} page was submitted for approval.`,
            },
            { status: 202 },
          ),
        };
      }
      return {
        ok: false,
        response: NextResponse.json(
          {
            success: false,
            error: `Permission required: ${actionLabel} access for the ${moduleLabel} page.`,
            accessRequestSubmitted,
          },
          { status: 403 },
        ),
      };
    }
  }

  return { ok: true, user };
}

export async function authorizeRouteRequest(request: NextRequest): Promise<AuthorizationResult> {
  const permission = resolveRoutePermission(request.nextUrl.pathname, request.method, request.nextUrl.searchParams);
  return authorizeRequest(request, permission?.module, permission?.action);
}

export function isSuperAdmin(user: User): boolean {
  return user.assignedRoleIds.includes(SUPER_ADMIN_ROLE_ID);
}

export function apiAuthError(result: AuthorizationResult): NextResponse | null {
  return result.ok ? null : result.response;
}
