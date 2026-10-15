import { getTursoClient } from './turso';
import { initializeSchema } from './schema';
import { ApprovalRequest, ApprovalRequestStatus, ChangeType, EntityType, RoleId } from '@/lib/types';
import { logAudit, updateUser } from './administration';
import { splitLoan, mergeLoans, updateFullLoan, updateLoanInstallment, createLoan, deleteLoan, commitReviewedImport } from './loans';
import { createCustomer, updateCustomer, deleteCustomer } from './customers';
import { createCompany, deleteCompany } from './companies';
import { createCheque, markChequeDeposited, deleteCheque } from './cheques';

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
    requesterEmail: row.requester_email ? String(row.requester_email) : undefined,
    requesterRoleId: Number(row.requester_role_id ?? 2) as RoleId,
    approverRoleId: Number(row.approver_role_id ?? 1) as RoleId,
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
  requesterId?: string;
  approverRoleIds?: RoleId[];
}): Promise<ApprovalRequest[]> {
  await ensureDbInitialized();
  const client = getTursoClient();

  let sql = 'SELECT * FROM approval_requests WHERE 1=1';
  const args: any[] = [];

  if (filters?.requesterId && filters.approverRoleIds?.length) {
    sql += ` AND (requester_id = ? OR approver_role_id IN (${filters.approverRoleIds.map(() => '?').join(', ')}))`;
    args.push(filters.requesterId, ...filters.approverRoleIds);
  } else if (filters?.requesterId) {
    sql += ' AND requester_id = ?';
    args.push(filters.requesterId);
  }

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
  const requests = res.rows.map(mapApprovalRequestRow);
  const pendingTargets = new Set<string>();

  // Older deployments may already contain duplicate pending submissions. Keep
  // the newest one visible while preserving resolved request history.
  return requests.filter((request) => {
    if (request.status !== 'Pending') return true;
    const targetKey = [request.requesterId, request.changeType, request.entityType, request.entityId].join(':');
    if (pendingTargets.has(targetKey)) return false;
    pendingTargets.add(targetKey);
    return true;
  });
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
  requesterEmail?: string;
  requesterRoleId: RoleId;
  approverRoleId: RoleId;
  amount?: number;
  status?: ApprovalRequestStatus;
  beforePayload?: any;
  proposedPayload: any;
}): Promise<ApprovalRequest> {
  await ensureDbInitialized();
  const client = getTursoClient();

  const existingPending = await client.execute({
    sql: `SELECT * FROM approval_requests
      WHERE requester_id = ? AND change_type = ? AND entity_type = ? AND entity_id = ? AND status = 'Pending'
      ORDER BY created_at DESC, id DESC LIMIT 1`,
    args: [data.requesterId, data.changeType, data.entityType, data.entityId],
  });
  if (existingPending.rows.length > 0) return mapApprovalRequestRow(existingPending.rows[0]);

  const countRes = await client.execute('SELECT COUNT(*) as count FROM approval_requests');
  const count = Number(countRes.rows[0].count);
  const nowDate = new Date();
  const now = nowDate.toISOString();
  const reqId = `REQ-${nowDate.getUTCFullYear()}-${String(1000 + count + 1).padStart(4, '0')}`;

  const status = data.status || 'Pending';
  const beforeStr = data.beforePayload ? (typeof data.beforePayload === 'string' ? data.beforePayload : JSON.stringify(data.beforePayload)) : null;
  const proposedStr = typeof data.proposedPayload === 'string' ? data.proposedPayload : JSON.stringify(data.proposedPayload);

  await client.execute({
    sql: `INSERT INTO approval_requests (
      id, rule_id, change_type, title, description, entity_type, entity_id,
      requester_id, requester_name, requester_email, requester_role_id, approver_role_id, amount,
      status, before_payload, proposed_payload, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      data.requesterEmail || null,
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
    action: status === 'Auto-Approved' ? 'Approved Request' : 'Created Request',
    target: `Approval Request ${reqId}: ${data.title} for ${data.requesterName} (${data.requesterId})`,
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
  const requesterActor = {
    id: req.requesterId,
    name: req.requesterName,
    email: req.requesterEmail,
    primaryRoleId: req.requesterRoleId,
  };
  let payload: any = {};
  try {
    payload = JSON.parse(req.proposedPayload);
  } catch {
    payload = {};
  }

  try {
    // Execute business change based on changeType
    switch (req.changeType) {
      case 'Spreadsheet Import': {
        if (!Array.isArray(payload.planRows) || payload.planRows.length === 0) throw new Error('Spreadsheet import payload is incomplete.');
        await commitReviewedImport(payload.planRows, requesterActor);
        break;
      }
      case 'Loan Creation': {
        if (!payload.loanData) throw new Error('Loan creation payload is incomplete.');
        await createLoan(payload.loanData, requesterActor);
        break;
      }
      case 'Loan Deletion': {
        if (!payload.loanId) throw new Error('Loan deletion payload is incomplete.');
        if (!(await deleteLoan(payload.loanId, requesterActor))) throw new Error('Loan could not be deleted.');
        break;
      }
      case 'Loan Split': {
        if (!payload.parentLoanId || !payload.installmentIdsToExtract) throw new Error('Loan split payload is incomplete.');
        await splitLoan(payload.parentLoanId, payload.installmentIdsToExtract, requesterActor);
        break;
      }
      case 'Loan Merge': {
        if (!payload.targetLoanId || !payload.sourceLoanId) throw new Error('Loan merge payload is incomplete.');
        await mergeLoans(payload.targetLoanId, payload.sourceLoanId, requesterActor);
        break;
      }
      case 'Loan Update': {
        if (!payload.loanId || !payload.updateData) throw new Error('Loan update payload is incomplete.');
        if (!(await updateFullLoan(payload.loanId, payload.updateData, requesterActor))) throw new Error('Loan could not be updated.');
        break;
      }
      case 'Role Change': {
        if (!payload.userId || !payload.assignedRoleIds) throw new Error('Role change payload is incomplete.');
        await updateUser(payload.userId, {
          assignedRoleIds: payload.assignedRoleIds,
          primaryRoleId: payload.primaryRoleId ?? payload.assignedRoleIds[0],
        });
        break;
      }
      case 'Customer Update': {
        if (!payload.customerId || !payload.updates) throw new Error('Customer update payload is incomplete.');
        if (!(await updateCustomer(payload.customerId, payload.updates, requesterActor))) throw new Error('Customer could not be updated.');
        break;
      }
      case 'Customer Creation': {
        if (!payload.name) throw new Error('Customer creation payload is incomplete.');
        await createCustomer(payload, requesterActor);
        break;
      }
      case 'Customer Deletion': {
        if (!payload.customerId || !(await deleteCustomer(payload.customerId, requesterActor))) throw new Error('Customer could not be deleted.');
        break;
      }
      case 'Company Creation': {
        if (!payload.name || !payload.shortCode) throw new Error('Company creation payload is incomplete.');
        await createCompany(payload, requesterActor);
        break;
      }
      case 'Company Deletion': {
        if (!payload.companyId || !(await deleteCompany(payload.companyId, requesterActor))) throw new Error('Company could not be deleted.');
        break;
      }
      case 'Cheque Creation': {
        if (!payload.chequeNumber || !payload.customerName) throw new Error('Cheque creation payload is incomplete.');
        await createCheque(payload, requesterActor);
        break;
      }
      case 'Cheque Deposit': {
        if (!payload.chequeId || !(await markChequeDeposited(payload.chequeId, payload.depositedAt, requesterActor))) throw new Error('Cheque could not be deposited.');
        break;
      }
      case 'Cheque Deletion': {
        if (!payload.chequeId || !(await deleteCheque(payload.chequeId, requesterActor))) throw new Error('Cheque could not be deleted.');
        break;
      }
      case 'Collection Correction':
      case 'Historical Correction': {
        if (!payload.installmentId || !payload.updates) throw new Error('Installment correction payload is incomplete.');
        if (!(await updateLoanInstallment(payload.installmentId, payload.updates, requesterActor))) throw new Error('Installment could not be updated.');
        break;
      }
      default:
        throw new Error(`No execution handler is registered for ${req.changeType}.`);
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
      target: `Request ${req.id} (${req.title}) for ${req.requesterName} (${req.requesterId})`,
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
    action: 'Rejected Request',
    target: `Request ${req.id} (${req.title}) for ${req.requesterName} (${req.requesterId})`,
    beforeVal: 'Status: Pending Review',
    afterVal: `Status: Rejected by ${reviewer.name}. Reason: ${reviewer.notes}`,
    isSensitive: false,
  });

  const updated = await getApprovalRequestById(id);
  return { success: true, request: updated! };
}
