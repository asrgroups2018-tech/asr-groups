import { randomUUID } from 'node:crypto';
import { AccessRequest, AccessRequestStatus, ModuleAction, RoleId } from '@/lib/types';
import { getTursoClient } from './turso';
import { initializeSchema } from './schema';

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
  return result.rows.map(mapRow);
}

export async function createAccessRequest(data: { userId: string; userName: string; roleId: RoleId; moduleId: string; action: ModuleAction; reason: string }): Promise<AccessRequest> {
  await ensureInitialized();
  const client = getTursoClient();
  const pending = await client.execute({ sql: 'SELECT * FROM access_requests WHERE user_id = ? AND module_id = ? AND action = ? AND status = \'Pending\' LIMIT 1', args: [data.userId, data.moduleId, data.action] });
  if (pending.rows.length > 0) return mapRow(pending.rows[0]);
  const request: AccessRequest = { ...data, id: `AR-${randomUUID()}`, reason: data.reason.trim(), status: 'Pending', createdAt: new Date().toISOString() };
  await client.execute({ sql: `INSERT INTO access_requests (id, user_id, user_name, role_id, module_id, action, reason, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, args: [request.id, request.userId, request.userName, request.roleId, request.moduleId, request.action, request.reason, request.status, request.createdAt] });
  return request;
}

export async function reviewAccessRequest(id: string, status: Exclude<AccessRequestStatus, 'Pending'>, reviewerId: string, reviewerName: string, reviewerNotes?: string): Promise<AccessRequest | null> {
  await ensureInitialized();
  const client = getTursoClient();
  const resolvedAt = new Date().toISOString();
  await client.execute({ sql: 'UPDATE access_requests SET status = ?, reviewer_id = ?, reviewer_name = ?, reviewer_notes = ?, resolved_at = ? WHERE id = ? AND status = \'Pending\'', args: [status, reviewerId, reviewerName, reviewerNotes?.trim() || null, resolvedAt, id] });
  const result = await client.execute({ sql: 'SELECT * FROM access_requests WHERE id = ? LIMIT 1', args: [id] });
  return result.rows.length > 0 ? mapRow(result.rows[0]) : null;
}
