import { ModuleAction, PermissionMatrixState, RoleId } from './types';
import { MODULES_DATA } from './seedData';

export interface RoutePermission {
  module: string;
  action: ModuleAction;
}

export function getPermissionModuleLabel(moduleId: string): string {
  return MODULES_DATA.find((module) => module.id === moduleId)?.name
    || moduleId
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
}

export function getPermissionActionLabel(action: ModuleAction | string): string {
  return action.charAt(0).toUpperCase() + action.slice(1);
}

export function getPermissionRequestReason(moduleId: string, action: ModuleAction | string): string {
  const actionLabel = getPermissionActionLabel(action).toLowerCase();
  const moduleLabel = getPermissionModuleLabel(moduleId);
  return `Requested ${actionLabel} access for the ${moduleLabel} page.`;
}

export function formatPermissionRequestReason(
  moduleId: string,
  action: ModuleAction | string,
  reason?: string,
): string {
  if (!reason?.trim() || /\bthrough\s+(GET|POST|PUT|PATCH|DELETE)\s+\/api\//i.test(reason)) {
    return getPermissionRequestReason(moduleId, action);
  }
  return reason.trim();
}

export const APPLICATION_PAGE_ROUTES: Array<{ module: string; path: string }> = [
  { module: 'dashboard', path: '/dashboard' },
  { module: 'loans', path: '/loans' },
  { module: 'customers', path: '/customers' },
  { module: 'companies', path: '/companies' },
  { module: 'cheques', path: '/cheques' },
  { module: 'schedule', path: '/schedule' },
  { module: 'collections', path: '/collections' },
  { module: 'reports', path: '/reports' },
  { module: 'requests', path: '/requests' },
];

export function getFirstPermittedPage(
  matrix: PermissionMatrixState,
  roleIds: RoleId[],
): string | null {
  if (roleIds.includes(0)) return '/dashboard';
  return APPLICATION_PAGE_ROUTES.find(({ module }) =>
    roleIds.some((roleId) => matrix[module]?.view?.[roleId] === true),
  )?.path || null;
}

/**
 * Resolves the permission required by a page or API endpoint.
 * Keep this registry in one place so the sidebar, proxy, and route handlers
 * cannot drift apart as new pages are added.
 */
export function resolveRoutePermission(
  pathname: string,
  method: string,
  searchParams: URLSearchParams,
): RoutePermission | null {
  const path = pathname.toLowerCase();

  if (
    path.startsWith('/api/auth/') ||
    path === '/api/access-requests' ||
    path === '/access-denied'
  ) {
    return null;
  }

  const resolvedModule =
    path === '/dashboard' || path.startsWith('/dashboard/') || path.startsWith('/api/dashboard')
      ? 'dashboard'
      : path === '/loans' || path.startsWith('/loans/') || path.startsWith('/api/loans')
        ? 'loans'
        : path === '/customers' || path.startsWith('/customers/') || path.startsWith('/api/customers')
          ? 'customers'
          : path === '/companies' || path.startsWith('/companies/') || path.startsWith('/api/companies')
            ? 'companies'
            : path === '/cheques' || path.startsWith('/cheques/') || path.startsWith('/api/cheques')
              ? 'cheques'
              : path === '/collections' || path.startsWith('/collections/')
                ? 'collections'
                : path === '/schedule' || path.startsWith('/schedule/')
                  ? 'schedule'
                    : path === '/reports' || path.startsWith('/reports/') || path.startsWith('/api/manual-receipts')
                    ? 'reports'
                    : path === '/historical-sheet' || path.startsWith('/historical-sheet/') || path.startsWith('/api/receipts')
                      ? 'historical-sheet'
                      : path === '/requests' || path.startsWith('/requests/') || path.startsWith('/api/requests')
                        ? 'requests'
                        : path === '/administration' || path.startsWith('/administration/') || path.startsWith('/api/admin/')
                          ? 'admin'
                          : path.startsWith('/api/installments/')
                            ? 'loans'
                                : path.startsWith('/api/exports/loans')
                                  ? 'loans'
                            : path.startsWith('/api/import/')
                              ? 'loans'
                              : null;

  if (!resolvedModule) return null;

  if (path.endsWith('/approve') || path.endsWith('/reject')) {
    return { module: 'requests', action: 'approve' };
  }

  if (
    searchParams.has('export') ||
    searchParams.get('format') === 'csv' ||
    searchParams.get('download') === '1'
  ) {
    return { module: resolvedModule, action: 'export' };
  }

  if (method === 'POST') {
    if (
      path.startsWith('/api/loans/merge') ||
      path.startsWith('/api/loans/split') ||
      path.startsWith('/api/loans/') && path.endsWith('/installment') ||
      path.startsWith('/api/installments/') ||
      path.startsWith('/api/cheques/') && path.endsWith('/deposit')
    ) {
      return { module: resolvedModule, action: 'edit' };
    }
    if (path.startsWith('/api/import/commit')) return { module: resolvedModule, action: 'create' };
    if (path.startsWith('/api/import/match')) return { module: resolvedModule, action: 'view' };
    return { module: resolvedModule, action: 'create' };
  }

  if (method === 'PUT' || method === 'PATCH') {
    return { module: resolvedModule, action: 'edit' };
  }

  if (method === 'DELETE') {
    return { module: resolvedModule, action: 'delete' };
  }

  return { module: resolvedModule, action: 'view' };
}
