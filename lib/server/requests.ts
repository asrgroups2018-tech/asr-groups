import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { ApprovalRequest, ApprovalRequestStatus, ChangeType, EntityType, RoleId } from '@/lib/types';
import { logAudit, updateUser } from './administration';
import { splitLoan, mergeLoans, updateFullLoan, updateLoanInstallment } from './loans';
import { updateCustomer } from './customers';

let schemaInitialized = false;

async function ensureDbInitialized() {
  if (schemaInitialized) return;
  const client = getTursoClient();
  try {
    await initializeSchema(client);
    schemaInitialized = true;
  } catch (err) {
    console.error('Turso Schema initialization warning:', err);
  }
}

export function mapApprovalRequestRow(row: any): ApprovalRequest {
  return {
    id: String(row.id),
    ruleId: row.rule_id ? String(row.rule_id) : undefined,
    changeType: row.change_type as ChangeType,
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    entityType: row.entity_type as EntityType,
    entityId: String(row.entity_id),
    requesterId: String(row.requester_id),
    requesterName: String(row.requester_name),
    requesterRoleId: Number(row.requester_role_id || 2) as RoleId,
    approverRoleId: Number(row.approver_role_id || 1) as RoleId,
    amount: Number(row.amount || 0),
    status: row.status as ApprovalRequestStatus,
    beforePayload: row.before_payload ? String(row.before_payload) : undefined,
    proposedPayload: String(row.proposed_payload || '{}'),
    reviewerId: row.reviewer_id ? String(row.reviewer_id) : undefined,
    reviewerName: row.reviewer_name ? String(row.reviewer_name) : undefined,
    reviewerNotes: row.reviewer_notes ? String(row.reviewer_notes) : undefined,
    createdAt: String(row.created_at),
    resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
  };
}

export async function getApprovalRequests(filters?: {
  status?: string;
  changeType?: string;
  query?: string;
}): Promise<ApprovalRequest[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = 'SELECT * FROM approval_requests WHERE 1=1';
  const args: any[] = [];

  if (filters?.status && filters.status !== 'ALL') {
    sql += ' AND status = ?';
    args.push(filters.status);
  }

  if (filters?.changeType && filters.changeType !== 'ALL') {
    sql += ' AND change_type = ?';
    args.push(filters.changeType);
  }

  if (filters?.query) {
    sql += ' AND (LOWER(title) LIKE ? OR LOWER(entity_id) LIKE ? OR LOWER(requester_name) LIKE ? OR LOWER(id) LIKE ?)';
    const q = `%${filters.query.toLowerCase()}%`;
    args.push(q, q, q, q);
  }

  sql += ' ORDER BY created_at DESC, id DESC';

  const res = await client.execute({ sql, args });
  return res.rows.map(mapApprovalRequestRow);
}

export async function getApprovalRequestById(id: string): Promise<ApprovalRequest | null> {
  await ensureDbInitialized();
  const client = getTursoClient();
  const res = await client.execute({
    sql: 'SELECT * FROM approval_requests WHERE id = ?',
    args: [id],
  });
  if (res.rows.length === 0) return null;
  return mapApprovalRequestRow(res.rows[0]);
}

export async function createApprovalRequest(data: {
  ruleId?: string;
  changeType: ChangeType;
  title: string;
  description?: string;
  entityType: EntityType;
  entityId: string;
  requesterId: string;
  requesterName: string;
  requesterRoleId: RoleId;
  approverRoleId: RoleId;
  amount?: number;
  status?: ApprovalRequestStatus;
  beforePayload?: any;
  proposedPayload: any;
}): Promise<ApprovalRequest> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const countRes = await client.execute('SELECT COUNT(*) as count FROM approval_requests');
  const count = Number(countRes.rows[0].count);
  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const reqId = `REQ-2026-${String(1000 + count + 1).padStart(4, '0')}`;

  const status = data.status || 'Pending';
  const beforeStr = data.beforePayload ? (typeof data.beforePayload === 'string' ? data.beforePayload : JSON.stringify(data.beforePayload)) : null;
  const proposedStr = typeof data.proposedPayload === 'string' ? data.proposedPayload : JSON.stringify(data.proposedPayload);

  await client.execute({
    sql: `INSERT INTO approval_requests (
      id, rule_id, change_type, title, description, entity_type, entity_id,
      requester_id, requester_name, requester_role_id, approver_role_id, amount,
      status, before_payload, proposed_payload, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      reqId,
      data.ruleId || null,
      data.changeType,
      data.title,
      data.description || null,
      data.entityType,
      data.entityId,
      data.requesterId,
      data.requesterName,
      data.requesterRoleId,
      data.approverRoleId,
      data.amount || 0,
      status,
      beforeStr,
      proposedStr,
      now,
    ],
  });

  // Log to audit trail
  await logAudit({
    actorId: data.requesterId,
    actorName: data.requesterName,
    actorRoleId: data.requesterRoleId,
    action: status === 'Auto-Approved' ? 'Approved Request' : 'Created Loan', // generic action mapped
    target: `Approval Request ${reqId}: ${data.title}`,
    beforeVal: '-',
    afterVal: `Status: ${status}, Amount: ₹${(data.amount || 0).toLocaleString('en-IN')}`,
    isSensitive: data.changeType === 'Role Change' || (data.amount || 0) > 500000,
  });

  return (await getApprovalRequestById(reqId))!;
}

export async function approveApprovalRequest(
  id: string,
  reviewer: {
    id: string;
    name: string;
    roleId: RoleId;
    notes?: string;
  }
): Promise<{ success: boolean; request: ApprovalRequest; error?: string }> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const req = await getApprovalRequestById(id);
  if (!req) return { success: false, request: null as any, error: 'Request not found' };
  if (req.status !== 'Pending') {
    return { success: false, request: req, error: `Request is already ${req.status}` };
  }

  // Permission check: reviewer must have equal or higher role hierarchy
  if (reviewer.roleId > req.approverRoleId) {
    return { success: false, request: req, error: `Unauthorized. Requires Role ${req.approverRoleId} or higher.` };
  }

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');
  let payload: any = {};
  try {
    payload = JSON.parse(req.proposedPayload);
  } catch {
    payload = {};
  }

  try {
    // Execute business change based on changeType
    switch (req.changeType) {
      case 'Loan Split': {
        if (payload.parentLoanId && payload.installmentIdsToExtract) {
          await splitLoan(payload.parentLoanId, payload.installmentIdsToExtract);
        }
        break;
      }
      case 'Loan Merge': {
        if (payload.targetLoanId && payload.sourceLoanId) {
          await mergeLoans(payload.targetLoanId, payload.sourceLoanId);
        }
        break;
      }
      case 'Loan Update': {
        if (payload.loanId && payload.updateData) {
          await updateFullLoan(payload.loanId, payload.updateData);
        }
        break;
      }
      case 'Role Change': {
        if (payload.userId && payload.assignedRoleIds) {
          await updateUser(payload.userId, {
            assignedRoleIds: payload.assignedRoleIds,
            primaryRoleId: payload.primaryRoleId || payload.assignedRoleIds[0],
          });
        }
        break;
      }
      case 'Customer Update': {
        if (payload.customerId && payload.updates) {
          await updateCustomer(payload.customerId, payload.updates);
        }
        break;
      }
      case 'Collection Correction':
      case 'Historical Correction': {
        if (payload.installmentId && payload.updates) {
          await updateLoanInstallment(payload.installmentId, payload.updates);
        }
        break;
      }
      default:
        console.log(`Generic approval processed for ${req.changeType}`);
    }

    // Update Request status
    await client.execute({
      sql: `UPDATE approval_requests SET
        status = 'Approved',
        reviewer_id = ?,
        reviewer_name = ?,
        reviewer_notes = ?,
        resolved_at = ?
      WHERE id = ?`,
      args: [reviewer.id, reviewer.name, reviewer.notes || 'Approved', now, id],
    });

    await logAudit({
      actorId: reviewer.id,
      actorName: reviewer.name,
      actorRoleId: reviewer.roleId,
      action: 'Approved Request',
      target: `Request ${req.id} (${req.title})`,
      beforeVal: 'Status: Pending Review',
      afterVal: `Status: Approved by ${reviewer.name}. Notes: ${reviewer.notes || 'None'}`,
      isSensitive: req.changeType === 'Role Change' || req.amount > 500000,
    });

    const updated = await getApprovalRequestById(id);
    return { success: true, request: updated! };
  } catch (err: any) {
    console.error(`Error executing approved action for ${id}:`, err);
    return { success: false, request: req, error: err.message || 'Execution error during approval' };
  }
}

export async function rejectApprovalRequest(
  id: string,
  reviewer: {
    id: string;
    name: string;
    roleId: RoleId;
    notes: string;
  }
): Promise<{ success: boolean; request: ApprovalRequest; error?: string }> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const req = await getApprovalRequestById(id);
  if (!req) return { success: false, request: null as any, error: 'Request not found' };
  if (req.status !== 'Pending') {
    return { success: false, request: req, error: `Request is already ${req.status}` };
  }

  const now = new Date().toISOString().slice(0, 16).replace('T', ' ');

  await client.execute({
    sql: `UPDATE approval_requests SET
      status = 'Rejected',
      reviewer_id = ?,
      reviewer_name = ?,
      reviewer_notes = ?,
      resolved_at = ?
    WHERE id = ?`,
    args: [reviewer.id, reviewer.name, reviewer.notes || 'Rejected by approver', now, id],
  });

  await logAudit({
    actorId: reviewer.id,
    actorName: reviewer.name,
    actorRoleId: reviewer.roleId,
    action: 'Approved Request', // audit type
    target: `Request ${req.id} (${req.title})`,
    beforeVal: 'Status: Pending Review',
    afterVal: `Status: Rejected by ${reviewer.name}. Reason: ${reviewer.notes}`,
    isSensitive: false,
  });

  const updated = await getApprovalRequestById(id);
  return { success: true, request: updated! };
}
