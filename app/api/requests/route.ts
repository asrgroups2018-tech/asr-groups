import { NextRequest, NextResponse } from 'next/server';
import { getApprovalRequests, createApprovalRequest } from '@/lib/server/requests';
import { authorizeRequest, isSuperAdmin } from '@/lib/server/authorization';
import { evaluateApprovalAction } from '@/lib/utils/approvalRouting';
import { db } from '@/lib/server/db';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'requests', 'view');
  if (!auth.ok) return auth.response;
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const changeType = searchParams.get('changeType') || undefined;
    const query = searchParams.get('q') || undefined;

    const data = await getApprovalRequests({
      status,
      changeType,
      query,
      requesterId: isSuperAdmin(auth.user) ? undefined : auth.user.id,
      approverRoleIds: isSuperAdmin(auth.user) ? undefined : auth.user.assignedRoleIds,
    });
    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error fetching approval requests:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'requests', 'create');
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    if (!body.changeType || !body.title || !body.entityType || !body.entityId || !body.proposedPayload) {
      return NextResponse.json({ success: false, error: 'A complete approval change payload is required.' }, { status: 400 });
    }

    const rules = await db.getApprovalRules();
    const evaluation = evaluateApprovalAction(
      body.changeType,
      Number(body.amount) || 0,
      auth.user.primaryRoleId,
      rules,
    );
    const newRequest = await createApprovalRequest({
      ...body,
      requesterId: auth.user.id,
      requesterName: auth.user.name,
      requesterEmail: auth.user.email,
      requesterRoleId: auth.user.primaryRoleId,
      ruleId: evaluation.rule?.id,
      approverRoleId: body.changeType === 'Role Change' ? 0 : evaluation.approverRoleId,
      status: isSuperAdmin(auth.user) && evaluation.action === 'AUTO_APPROVE_QUEUE' ? 'Auto-Approved' : 'Pending',
    });
    return NextResponse.json({ success: true, data: newRequest });
  } catch (err: any) {
    console.error('Error creating approval request:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
