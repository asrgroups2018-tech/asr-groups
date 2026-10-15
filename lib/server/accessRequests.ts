import { randomUUID } from 'node:crypto';
import { AccessRequest, AccessRequestStatus, ModuleAction, RoleId } from '@/lib/types';
import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { getPermissionMatrix, logAudit, updatePermissionMatrix } from './administration';
import { MODULES_DATA } from '@/lib/seedData';
import { formatPermissionRequestReason } from '@/lib/permissions';

let initialized = false;

async function ensureInitialized() {
  if (initialized) return;
  await initializeSchema(getTursoClient());
  initialized = true;
}

function mapRow(row: any): AccessRequest {
  return {
    id: String(row.id), userId: String(row.user_id), userName: String(row.user_name),
    roleId: Number(row.role_id) as RoleId, moduleId: String(row.module_id), action: row.action as ModuleAction,
    reason: String(row.reason || ''), status: row.status as AccessRequestStatus,
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : undefined,
    reviewerName: row.reviewer_name ? String(row.reviewer_name) : undefined,
    reviewerNotes: row.reviewer_notes ? String(row.reviewer_notes) : undefined,
    createdAt: String(row.created_at), resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  };
}

export async function getAccessRequests(userId?: string): Promise<AccessRequest[]> {
  await ensureInitialized();
  const client = getTursoClient();
  const result = userId
    ? await client.execute({ sql: 'SELECT * FROM access_requests WHERE user_id = ? ORDER BY created_at DESC', args: [userId] })
    : await client.execute('SELECT * FROM access_requests ORDER BY created_at DESC');
  const requests = result.rows.map(mapRow);
  const pendingTargets = new Set<string>();
  return requests.filter((request) => {
    if (request.status !== 'Pending') return true;
    const targetKey = [request.userId, request.moduleId, request.action].join(':');
    if (pendingTargets.has(targetKey)) return false;
    pendingTargets.add(targetKey);
    return true;
  });
}

export async function createAccessRequest(data: { userId: string; userName: string; roleId: RoleId; moduleId: string; action: ModuleAction; reason: string }): Promise<AccessRequest> {
  await ensureInitialized();
  const client = getTursoClient();
  const latest = await client.execute({
    sql: 'SELECT * FROM access_requests WHERE user_id = ? AND module_id = ? AND action = ? ORDER BY created_at DESC LIMIT 1',
    args: [data.userId, data.moduleId, data.action],
  });
  if (latest.rows.length > 0) {
    const existing = mapRow(latest.rows[0]);
    if (existing.status === 'Pending' || existing.status === 'Approved') return existing;
  }

  const request: AccessRequest = {
    ...data,
    id: `AR-${randomUUID()}`,
    reason: formatPermissionRequestReason(data.moduleId, data.action, data.reason),
    status: 'Pending',
    createdAt: new Date().toISOString(),
  };
  await client.execute({ sql: `INSERT INTO access_requests (id, user_id, user_name, role_id, module_id, action, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [request.id, request.userId, request.userName, request.roleId, request.moduleId, request.action, request.reason, request.status, request.createdAt] });
  await logAudit({
    actorId: request.userId,
    actorName: request.userName,
    actorRoleId: request.roleId,
    action: 'Created Request',
    target: `Access Request ${request.id}: ${request.moduleId} ${request.action}`,
    beforeVal: '-',
    afterVal: `Status: Pending. Reason: ${request.reason}`,
    isSensitive: false,
  });
  return request;
}

export async function reviewAccessRequest(id: string, status: Exclude<AccessRequestStatus, 'Pending'>, reviewerId: string, reviewerName: string, reviewerRoleId: RoleId, reviewerNotes?: string): Promise<AccessRequest | null> {
  await ensureInitialized();
  const client = getTursoClient();
  const result = await client.execute({ sql: 'SELECT * FROM access_requests WHERE id = ? AND status = \'Pending\' LIMIT 1', args: [id] });
  if (result.rows.length === 0) return null;

  const request = mapRow(result.rows[0]);
  if (status === 'Approved') {
    const moduleConfig = MODULES_DATA.find((module) => module.id === request.moduleId);
    if (!moduleConfig || !moduleConfig.actions.includes(request.action)) {
      throw new Error('The requested page permission is no longer available.');
    }
    if (request.moduleId === 'admin' || request.roleId === 0) {
      throw new Error('Administration access is reserved for Super Admin.');
    }

    const matrix = await getPermissionMatrix();
    const modulePermissions = matrix[request.moduleId] || {};
    const actionPermissions = modulePermissions[request.action] || {};
    await updatePermissionMatrix({
      ...matrix,
      [request.moduleId]: {
        ...modulePermissions,
        [request.action]: {
          ...actionPermissions,
          [request.roleId]: true,
        },
      },
    });
  }

  const resolvedAt = new Date().toISOString();
  await client.execute({
    sql: 'UPDATE access_requests SET status = ?, reviewer_id = ?, reviewer_name = ?, reviewer_notes = ?, resolved_at = ? WHERE id = ? AND status = \'Pending\'',
    args: [status, reviewerId, reviewerName, reviewerNotes?.trim() || null, resolvedAt, id],
  });

  await logAudit({
    actorId: reviewerId,
    actorName: reviewerName,
    actorRoleId: reviewerRoleId,
    action: status === 'Approved' ? 'Approved Request' : 'Rejected Request',
    target: `Access Request ${request.id}: ${request.moduleId} ${request.action} for ${request.userName} (${request.userId})`,
    beforeVal: 'Status: Pending',
    afterVal: `Status: ${status}`,
    isSensitive: request.moduleId === 'admin',
  });

  const updated = await client.execute({ sql: 'SELECT * FROM access_requests WHERE id = ? LIMIT 1', args: [id] });
  return updated.rows.length > 0 ? mapRow(updated.rows[0]) : null;
}
