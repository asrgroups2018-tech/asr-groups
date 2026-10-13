import { NextRequest, NextResponse } from 'next/server';
import { markChequeDeposited } from '@/lib/server/cheques';
import { authorizeRouteRequest } from '@/lib/server/authorization';
import { getChequeById } from '@/lib/server/cheques';
import { queueMutationForApproval } from '@/lib/server/approvalWorkflow';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeRouteRequest(request);
  if (!auth.ok) return auth.response;
  try {
    const { id } = await context.params;
    let depositedAt: string | undefined;

    try {
      const body = await request.json();
      depositedAt = body?.depositedAt;
    } catch {
      // Body is optional
    }

    const existing = await getChequeById(id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Cheque not found.' }, { status: 404 });
    }
    const queued = await queueMutationForApproval({
      actor: auth.user,
      changeType: 'Cheque Deposit',
      title: `Deposit cheque: ${existing.chequeNumber}`,
      entityType: 'cheque',
      entityId: id,
      amount: existing.amount,
      beforePayload: existing,
      proposedPayload: { chequeId: id, depositedAt },
    });
    if (queued) return queued;

    const updated = await markChequeDeposited(id, depositedAt, auth.user);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Cheque not found or update failed' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('Error marking cheque deposited:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return POST(request, context);
}
